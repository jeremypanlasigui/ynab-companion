import { createWorker, PSM } from "tesseract.js";
import { parseReceiptText, ParsedReceiptResult, classifyItem } from "./receipt-parser";
import { BoundingBox, PurchasedGood } from "@/lib/ynab/types";

export interface ImageParseOptions {
  onProgress?: (progress: number, status: string) => void;
  receiptId?: string;
}

interface PreprocessedResult {
  processedUrl: string;
  width: number;
  height: number;
}

/**
 * Pre-processes an image on an in-memory canvas with dynamic contrast stretching
 * and gentle unsharp enhancement to maximize OCR text recognition on thermal receipts.
 */
async function preprocessImage(imageSrc: string): Promise<PreprocessedResult> {
  if (typeof window === "undefined") {
    return { processedUrl: imageSrc, width: 1000, height: 1500 };
  }

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image for preprocessing"));
      img.src = imageSrc;
    });

    // Preserve full resolution for receipt strips (up to 4500px height or 2400px width)
    const maxWidth = 2400;
    const maxHeight = 4500;
    let width = img.naturalWidth || img.width || 1000;
    let height = img.naturalHeight || img.height || 1500;
    if (width > maxWidth || height > maxHeight) {
      if (width / maxWidth > height / maxHeight) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { processedUrl: imageSrc, width, height };

    ctx.drawImage(img, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    // 1. Calculate luminance from central 80% to avoid dark borders / desk background
    const startX = Math.round(width * 0.1);
    const endX = Math.round(width * 0.9);
    let minLum = 255;
    let maxLum = 0;

    for (let y = 0; y < height; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * width + x) * 4;
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (l < minLum) minLum = l;
        if (l > maxLum) maxLum = l;
      }
    }

    // 2. Dynamic contrast stretching: expand ink vs paper range
    const range = Math.max(maxLum - minLum, 1);
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const stretched = Math.max(0, Math.min(255, ((l - minLum) / range) * 255));
      const enhanced = stretched < 128 ? stretched * 0.9 : Math.min(255, stretched * 1.05);
      d[i] = enhanced;
      d[i + 1] = enhanced;
      d[i + 2] = enhanced;
    }

    ctx.putImageData(imgData, 0, 0);
    return {
      processedUrl: canvas.toDataURL("image/png"),
      width,
      height,
    };
  } catch (err) {
    console.warn("Canvas preprocessing failed, using raw image:", err);
    return { processedUrl: imageSrc, width: 1000, height: 1500 };
  }
}

/**
 * Converts a File or Blob into a base64 Data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes common receipt OCR artifacts (e.g., European comma decimals, noisy dots, spacing)
 */
function cleanOcrText(rawText: string): string {
  return rawText
    .split("\n")
    .map((line) => {
      let l = line.trim();

      // 1. Replace comma, quote, backtick decimal with dot: 12,99 or 12'99 -> 12.99
      l = l.replace(/(\d+)[\,`'](\d{2})\b/g, "$1.$2");

      // 2. Fix space decimals before flags or line end: e.g. "$5 99 F" or "5 99 F" or "$5 99"
      l = l.replace(/(^|[\s\$])(\d{1,4})\s+(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, prefix, dollars, cents, flag) => {
        return `${prefix}${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      });

      // 3. Fix missing decimal if dollar sign precedes digits without dot: e.g. "$599 F" or "$599"
      l = l.replace(/\$(\d{1,3})(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, dollars, cents, flag) => {
        return `$${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      });

      // 4. Fix missing decimal across wide column gap: e.g. "GYOZA NIRA PORK      599 F"
      l = l.replace(/(\s{2,})(\d{1,3})(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, spaces, dollars, cents, flag) => {
        return `${spaces}${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      });

      // Clean excessive dots/dashes used for receipt leaders (e.g. Apples ..... 3.99)
      l = l.replace(/\.{2,}/g, " ");

      return l;
    })
    .join("\n");
}

const IGNORE_LINE_PREFIXES = [
  "NET SALES",
  "SUB TOTAL",
  "SUBTOTAL",
  "TOTAL SALES",
  "TOTAL",
  "GRAND TOTAL",
  "SAVING",
  "MARKDOWN",
  "TEMPORARY MARKDOWN",
  "ITEM COUNT",
  "VISA",
  "MASTERCARD",
  "AMEX",
  "DISCOVER",
  "BALANCE",
  "NETWORK ID",
  "MODE",
  "TYPE",
  "TENDER",
  "CARD",
  "CONTACTLESS",
  "AMOUNT",
  "RESULT",
  "DATE/TIME",
  "SEQUENCE",
  "AUTHOR",
  "LABEL",
  "ARC",
  "AID",
  "TVR",
  "INV#",
  "TRS#",
  "TEL",
  "PHONE",
  "APPROVED",
  "CASH",
  "CHANGE",
];

/**
 * Parses an image file/blob or URL into a list of PurchasedGood items with bounding boxes and prices
 */
export async function parseReceiptImage(
  imageInput: File | Blob | string,
  options: ImageParseOptions = {}
): Promise<ParsedReceiptResult> {
  const { onProgress, receiptId = `rcpt-${Date.now()}` } = options;

  onProgress?.(0.1, "Loading image...");
  let imageSource = "";

  if (typeof imageInput === "string") {
    imageSource = imageInput;
  } else {
    imageSource = await fileToDataUrl(imageInput);
  }

  onProgress?.(0.2, "Pre-processing receipt image...");
  const preprocessed = await preprocessImage(imageSource);

  onProgress?.(0.35, "Initializing OCR engine...");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        const scaledProgress = 0.35 + m.progress * 0.55;
        onProgress?.(scaledProgress, `Scanning text (${Math.round(m.progress * 100)}%)...`);
      }
    },
  });

  // Optimize Tesseract parameters specifically for receipt tables
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN, // Single column mode: prevents columns from scrambling
      preserve_interword_spaces: "1", // Preserves spacing between item description and price
    });
  } catch (paramErr) {
    console.warn("Could not set custom worker parameters:", paramErr);
  }

  const ocrResult = await worker.recognize(
    preprocessed.processedUrl,
    {},
    { text: true, blocks: true }
  );
  await worker.terminate();

  onProgress?.(0.92, "Parsing items and matching bounding boxes...");
  const rawOcrText = ocrResult.data.text || "";
  const cleanedFullText = cleanOcrText(rawOcrText);

  // Fallback parsed result to extract vendor, date, explicit total, etc.
  const baseParsed = parseReceiptText(cleanedFullText, receiptId);

  // Extract line-level bounding boxes from Tesseract blocks
  const goodsWithBoxes: PurchasedGood[] = [];
  const priceRegex = /(?:\$|\s)([0-9]+\.[0-9]{2})(?:\s*[A-Z0-9\*\#\-]+)?\s*$/i;

  const blocks = ocrResult.data.blocks || [];
  for (const block of blocks) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const rawLineText = cleanOcrText(line.text || "").trim();
        if (!rawLineText) continue;

        const upper = rawLineText.toUpperCase();

        // Ignore secondary weight / quantity lines: e.g. 2.02 lb @ $2.99/lb or 1 @ $5.99 each
        if (/^\d+(\.\d+)?\s*(lb|kg|oz|g)?\s*@/i.test(rawLineText)) {
          continue;
        }

        // Ignore discount, fee, tax, metadata lines
        if (IGNORE_LINE_PREFIXES.some((prefix) => upper.startsWith(prefix))) {
          continue;
        }

        const priceMatch = rawLineText.match(priceRegex);
        if (priceMatch) {
          const priceVal = parseFloat(priceMatch[1]);
          if (isNaN(priceVal) || priceVal <= 0) continue;

          const rawName = rawLineText.slice(0, priceMatch.index).trim();
          let cleanName = rawName
            .replace(/^[\d\s*#-]+/, "")
            .replace(/[\$@]\s*[\d.]+/g, "")
            .replace(/[\$@#*:\-_.]+$/, "")
            .trim();

          if (!cleanName || cleanName.length < 2) continue;

          // Normalize CRV and Tax names
          if (/^\+?\s*CA\s*CRV/i.test(cleanName)) {
            cleanName = "CA CRV";
          }
          cleanName = cleanName.replace(/\[\s*\]/g, "").trim();
          if (/^tax(\s*\d*)?$/i.test(cleanName)) {
            cleanName = cleanName.toUpperCase().startsWith("TAX 1") ? "Tax 1" : "Sales Tax";
          }

          const classification = classifyItem(cleanName);
          const milliunits = -Math.round(priceVal * 1000);

          // Deduplicate CRV and Tax if summary duplicates inline item
          if (classification.category === "ca crv") {
            const duplicate = goodsWithBoxes.some(
              (g) => g.category === "ca crv" && g.amount === milliunits
            );
            if (duplicate) continue;
          }
          if (classification.category === "tax") {
            const duplicate = goodsWithBoxes.some(
              (g) => g.category === "tax" && g.amount === milliunits
            );
            if (duplicate) continue;
          }

          let bbox: BoundingBox | undefined = undefined;
          if (line.bbox && preprocessed.width > 0 && preprocessed.height > 0) {
            bbox = {
              x0: Math.max(0, Math.min(100, Number(((line.bbox.x0 / preprocessed.width) * 100).toFixed(2)))),
              y0: Math.max(0, Math.min(100, Number(((line.bbox.y0 / preprocessed.height) * 100).toFixed(2)))),
              x1: Math.max(0, Math.min(100, Number(((line.bbox.x1 / preprocessed.width) * 100).toFixed(2)))),
              y1: Math.max(0, Math.min(100, Number(((line.bbox.y1 / preprocessed.height) * 100).toFixed(2)))),
            };
          }

          goodsWithBoxes.push({
            id: `good-${receiptId}-${goodsWithBoxes.length + 1}`,
            receipt_id: receiptId,
            name: cleanName,
            amount: milliunits,
            category: classification.category,
            is_food: classification.is_food,
            bbox,
          });
        }
      }
    }
  }

  // If line extraction with bboxes found items, use them; otherwise fallback to baseParsed.goods
  const finalGoods = goodsWithBoxes.length > 0 ? goodsWithBoxes : baseParsed.goods;

  // Recalculate food and non-food amounts based on finalGoods
  const foodAmount = finalGoods
    .filter((g) => g.is_food)
    .reduce((sum, g) => sum + g.amount, 0);

  const nonFoodAmount = finalGoods
    .filter((g) => !g.is_food)
    .reduce((sum, g) => sum + g.amount, 0);

  onProgress?.(1.0, "Done!");

  return {
    ...baseParsed,
    goods: finalGoods,
    foodAmount,
    nonFoodAmount,
    totalAmount: baseParsed.totalAmount !== 0 ? baseParsed.totalAmount : foodAmount + nonFoodAmount,
    imageUrl: imageSource,
  };
}
