"use client";

import { useState, useId, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  FoodSubCategory,
  PurchasedGood,
  ReceiptIngestion,
  TransactionDetail,
  Category,
} from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import { parseReceiptText, PRESET_RECEIPTS } from "@/lib/food/receipt-parser";
import { parseReceiptImage, fileToDataUrl } from "@/lib/food/receipt-image-parser";
import {
  detectDefaultCategories,
  buildSplitSubtransactions,
} from "@/lib/food/split-builder";
import { db } from "@/lib/ynab/db";
import { ReceiptViewerOverlay } from "./ReceiptViewerOverlay";
import { ItemPriceInput } from "./ItemPriceInput";
import {
  Receipt,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ImageIcon,
} from "lucide-react";

interface ReceiptIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: TransactionDetail[];
  planId: string;
  onReceiptIngested?: (receipt: ReceiptIngestion) => void;
}

const CATEGORY_OPTIONS: Array<{ key: FoodSubCategory; label: string; emoji: string; is_food: boolean }> = [
  { key: "fruits", label: "Fruits", emoji: "🍎", is_food: true },
  { key: "veggies", label: "Veggies", emoji: "🥦", is_food: true },
  { key: "meat", label: "Meat & Seafood", emoji: "🥩", is_food: true },
  { key: "dairy", label: "Dairy & Eggs", emoji: "🧀", is_food: true },
  { key: "snacks", label: "Snacks", emoji: "🍿", is_food: true },
  { key: "pantry", label: "Pantry & Staples", emoji: "🥫", is_food: true },
  { key: "beverages", label: "Beverages", emoji: "🥤", is_food: true },
  { key: "prepared", label: "Prepared & Deli", emoji: "🍱", is_food: true },
  { key: "tax", label: "Sales Tax", emoji: "🧾", is_food: true },
  { key: "ca crv", label: "CA CRV (Bottle Deposit)", emoji: "♻️", is_food: true },
  { key: "home goods", label: "Home Goods (Non-Food)", emoji: "🧻", is_food: false },
  { key: "other", label: "Other Food", emoji: "🏷️", is_food: true },
];

export function ReceiptIngestionModal({
  isOpen,
  onClose,
  categories,
  transactions,
  planId,
  onReceiptIngested,
}: ReceiptIngestionModalProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "paste" | "upload">("presets");
  const [vendor, setVendor] = useState("Trader Joe's");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pastedText, setPastedText] = useState("");
  const [goods, setGoods] = useState<PurchasedGood[]>([]);
  const [splitStrategy, setSplitStrategy] = useState<"granular" | "two_way">("granular");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Interactive overlay synchronization
  const [hoveredGoodId, setHoveredGoodId] = useState<string | null>(null);
  const [selectedGoodId, setSelectedGoodId] = useState<string | null>(null);

  // OCR scanning state
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusMessage, setOcrStatusMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const vendorInputId = useId();
  const dateInputId = useId();
  const foodCatSelectId = useId();
  const homeGoodsCatSelectId = useId();
  const splitStrategySelectId = useId();
  const fileInputId = useId();

  // Detect default YNAB categories
  const { foodCategory: defaultFoodCat, homeGoodsCategory: defaultHomeCat } = useMemo(
    () => detectDefaultCategories(categories),
    [categories]
  );

  const [selectedFoodCatId, setSelectedFoodCatId] = useState<string>(
    defaultFoodCat?.id || ""
  );
  const [selectedHomeCatId, setSelectedHomeCatId] = useState<string>(
    defaultHomeCat?.id || ""
  );

  // Totals calculations
  const totals = useMemo(() => {
    const foodTotal = goods
      .filter((g) => g.is_food)
      .reduce((sum, g) => sum + g.amount, 0);
    const nonFoodTotal = goods
      .filter((g) => !g.is_food)
      .reduce((sum, g) => sum + g.amount, 0);
    const grandTotal = foodTotal + nonFoodTotal;
    return { foodTotal, nonFoodTotal, grandTotal };
  }, [goods]);

  // Find candidate transaction match
  const candidateMatches = useMemo(() => {
    if (totals.grandTotal === 0) return [];
    const cleanVendor = vendor.toLowerCase().replace(/[^a-z0-9]/g, "");

    return transactions
      .filter((t) => !t.deleted)
      .map((t) => {
        let score = 0;
        const txDate = new Date(t.date).getTime();
        const rDate = new Date(date).getTime();
        const dayDiff = Math.abs(txDate - rDate) / (1000 * 60 * 60 * 24);

        // Exact milliunit match
        if (Math.abs(t.amount) === Math.abs(totals.grandTotal)) {
          score += 60;
        } else if (Math.abs(Math.abs(t.amount) - Math.abs(totals.grandTotal)) <= 1000) {
          score += 25;
        }

        // Payee match
        const txPayee = (t.payee_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (txPayee && cleanVendor) {
          if (txPayee === cleanVendor) score += 40;
          else if (txPayee.includes(cleanVendor) || cleanVendor.includes(txPayee)) score += 30;
        }

        // Date match
        if (dayDiff === 0) score += 20;
        else if (dayDiff <= 1) score += 15;
        else if (dayDiff <= 3) score += 10;

        return { tx: t, score, dayDiff };
      })
      .filter((item) => item.score >= 30)
      .sort((a, b) => b.score - a.score);
  }, [transactions, vendor, date, totals.grandTotal]);

  const bestMatch = candidateMatches.length > 0 ? candidateMatches[0].tx : null;

  // Load a preset receipt
  const handleLoadPreset = (presetIndex: number) => {
    const preset = PRESET_RECEIPTS[presetIndex];
    if (!preset) return;
    const parsed = parseReceiptText(preset.text);
    setVendor(preset.vendor);
    setDate(parsed.date);
    setGoods(parsed.goods);
    setPreviewImage(null);
    if (bestMatch) {
      setSelectedTxId(bestMatch.id);
    }
  };

  // Pre-load first preset on modal open if goods are empty
  useEffect(() => {
    if (isOpen && goods.length === 0) {
      handleLoadPreset(0);
    }
  }, [isOpen]);

  // Parse pasted text
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const parsed = parseReceiptText(pastedText);
    setVendor(parsed.vendor);
    setDate(parsed.date);
    setGoods(parsed.goods);
    setPreviewImage(null);
  };

  // Upload photo handler with real OCR text extraction & bounding boxes
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOcrScanning(true);
      setOcrProgress(0.05);
      setOcrStatusMessage("Reading image file...");

      // Generate preview thumbnail
      const dataUrl = await fileToDataUrl(file);
      setPreviewImage(dataUrl);

      // Perform OCR and item parsing with bounding boxes
      const parsed = await parseReceiptImage(file, {
        onProgress: (p, msg) => {
          setOcrProgress(p);
          setOcrStatusMessage(msg);
        },
      });

      setVendor(parsed.vendor);
      setDate(parsed.date);
      setGoods(parsed.goods);
      setPastedText(parsed.rawText);

      if (bestMatch) {
        setSelectedTxId(bestMatch.id);
      }
    } catch (err) {
      console.error("OCR parse failed:", err);
      setOcrStatusMessage("OCR scanning failed. You can still paste receipt text or add items manually.");
    } finally {
      setIsOcrScanning(false);
    }
  };

  // Modify individual item in table
  const handleUpdateItem = (
    index: number,
    field: keyof PurchasedGood,
    value: string | number | boolean
  ) => {
    setGoods((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === "category") {
        const option = CATEGORY_OPTIONS.find((o) => o.key === value);
        item.category = value as FoodSubCategory;
        item.is_food = option ? option.is_food : value !== "home goods";
      } else if (field === "is_food") {
        item.is_food = Boolean(value);
        if (!value && item.category !== "home goods") {
          item.category = "home goods";
        }
      } else if (field === "amount") {
        item.amount = typeof value === "number" ? value : 0;
      } else if (field === "name") {
        item.name = String(value);
      }

      copy[index] = item;
      return copy;
    });
  };

  // Delete item
  const handleDeleteItem = (index: number) => {
    setGoods((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new item
  const handleAddNewItem = () => {
    const newItem: PurchasedGood = {
      id: `good-${Date.now()}-${goods.length + 1}`,
      receipt_id: `rcpt-${Date.now()}`,
      name: "New Item",
      amount: -4990, // $4.99
      category: "fruits",
      is_food: true,
    };
    setGoods((prev) => [...prev, newItem]);
  };

  // Row selection handler from image overlay
  const handleSelectGood = (id: string) => {
    setSelectedGoodId(id);
    const rowEl = document.getElementById(`row-${id}`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Submit and ingest receipt
  const handleSaveReceipt = async () => {
    if (goods.length === 0) return;
    setIsProcessing(true);

    try {
      const receiptId = `rcpt-${Date.now()}`;
      const matchedId = selectedTxId || (bestMatch ? bestMatch.id : null);
      const isMatched = Boolean(matchedId);

      const receiptRecord: ReceiptIngestion = {
        id: receiptId,
        plan_id: planId,
        date,
        vendor,
        total_amount: totals.grandTotal,
        food_amount: totals.foodTotal,
        non_food_amount: totals.nonFoodTotal,
        status: isMatched ? "matched" : "unresolved",
        matched_transaction_id: matchedId,
        raw_text: pastedText || undefined,
        image_url: previewImage || undefined,
        goods: goods.map((g) => ({ ...g, receipt_id: receiptId })),
        created_at: new Date().toISOString(),
      };

      if (isMatched && matchedId) {
        // Build split subtransactions
        const foodCatName =
          categories.find((c) => c.id === selectedFoodCatId)?.name || "Groceries";
        const homeCatName =
          categories.find((c) => c.id === selectedHomeCatId)?.name || "Home Goods";

        const subtransactions = buildSplitSubtransactions(goods, {
          transactionId: matchedId,
          foodCategoryId: selectedFoodCatId || null,
          foodCategoryName: foodCatName,
          homeGoodsCategoryId: selectedHomeCatId || null,
          homeGoodsCategoryName: homeCatName,
          strategy: splitStrategy,
        });

        // Link in Dexie + SQLite + enqueue YNAB update
        await db.linkReceiptToTransaction(receiptId, matchedId, subtransactions);
      } else {
        // Save as unresolved receipt
        await db.saveReceipt(receiptRecord);
      }

      onReceiptIngested?.(receiptRecord);
      onClose();
    } catch (err) {
      console.error("Failed to ingest receipt:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Interactive Receipt Ingestion"
      description="Side-by-side view with parsed items, interactive bounding box overlays, and YNAB split setup"
      maxWidth="6xl"
    >
      {/* Side-by-side Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[82vh]">
        {/* Left Column: Interactive Receipt Viewer & Overlays (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-[380px] lg:min-h-0">
          <ReceiptViewerOverlay
            imageSrc={previewImage}
            vendor={vendor}
            date={date}
            goods={goods}
            hoveredGoodId={hoveredGoodId}
            selectedGoodId={selectedGoodId}
            onHoverGood={setHoveredGoodId}
            onSelectGood={handleSelectGood}
            isScanning={isOcrScanning}
            scanProgress={ocrProgress}
            scanMessage={ocrStatusMessage}
          />
        </div>

        {/* Right Column: Source Controls, Item Table, YNAB Matching (7 cols) */}
        <div className="lg:col-span-7 flex flex-col overflow-y-auto pr-1 space-y-4 max-h-[78vh]">
          {/* Source Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
            <button
              onClick={() => setActiveTab("presets")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "presets"
                  ? "bg-zinc-800 text-teal-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Presets</span>
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "paste"
                  ? "bg-zinc-800 text-teal-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-zinc-800 text-teal-300 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
          </div>

          {/* Tab 1: Presets */}
          {activeTab === "presets" && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Load a sample receipt with mixed food and home goods:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_RECEIPTS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    onClick={() => handleLoadPreset(idx)}
                    className="flex flex-col text-left p-2 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-teal-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-teal-300">
                      {preset.vendor}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {activeTab === "paste" && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Paste digital receipt or line items:
              </span>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="e.g.&#10;Trader Joe's&#10;Organic Apples 4.99&#10;Chicken Breast 9.49&#10;Paper Towels 13.99"
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleParsePastedText}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-all cursor-pointer"
              >
                Parse Items
              </button>
            </div>
          )}

          {/* Tab 3: Upload with Live OCR */}
          {activeTab === "upload" && (
            <div className="border border-dashed border-zinc-700 rounded-2xl p-4 text-center bg-zinc-950/40">
              {isOcrScanning ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {ocrStatusMessage || "Scanning receipt image..."}
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">
                      Extracting text and identifying items with bounding boxes
                    </span>
                  </div>
                  <div className="w-full max-w-xs bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                    />
                  </div>
                </div>
              ) : previewImage ? (
                <div className="flex items-center justify-between gap-3 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2.5 text-left">
                    <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Receipt Photo Scanned
                      </span>
                      <p className="text-[11px] text-emerald-400">
                        {goods.length} items parsed & overlayed on viewer!
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor={fileInputId}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer transition-all shrink-0"
                  >
                    Scan Different Image
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="py-2">
                  <UploadCloud className="w-7 h-7 text-zinc-500 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-zinc-300 block">
                    Upload receipt photo (PNG, JPG, WebP)
                  </span>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    Scans receipt text via OCR to extract items, prices, and bounding box overlays
                  </p>
                  <label
                    htmlFor={fileInputId}
                    className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 cursor-pointer transition-all shadow-md shadow-teal-500/10 active:scale-95"
                  >
                    Choose Receipt Photo
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* Receipt Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/80">
            <div>
              <label
                htmlFor={vendorInputId}
                className="text-[11px] font-semibold text-zinc-400 block mb-1"
              >
                Store / Vendor
              </label>
              <input
                id={vendorInputId}
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor={dateInputId}
                className="text-[11px] font-semibold text-zinc-400 block mb-1"
              >
                Receipt Date
              </label>
              <input
                id={dateInputId}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Goods Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-400" />
                <span>Purchased Goods ({goods.length})</span>
              </span>
              <button
                onClick={handleAddNewItem}
                className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {goods.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4 text-center text-xs text-zinc-500">
                No items parsed yet. Load a sample preset above or paste your receipt text!
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/50">
                <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/60">
                  {goods.map((item, index) => {
                    const isHovered = hoveredGoodId === item.id;
                    const isSelected = selectedGoodId === item.id;

                    return (
                      <div
                        id={`row-${item.id}`}
                        key={item.id}
                        onMouseEnter={() => setHoveredGoodId(item.id)}
                        onMouseLeave={() => setHoveredGoodId(null)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 transition-all ${
                          isHovered || isSelected
                            ? "bg-teal-500/15 ring-1 ring-teal-500/40"
                            : "hover:bg-zinc-900/50"
                        }`}
                      >
                        {/* Item Name */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                            className="w-full bg-transparent text-xs font-medium text-zinc-100 focus:outline-none focus:border-b focus:border-teal-500 truncate"
                          />
                        </div>

                        {/* Category Selector */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(index, "category", e.target.value)}
                            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-teal-500 cursor-pointer"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.emoji} {opt.label}
                              </option>
                            ))}
                          </select>

                          {/* Food vs Non-Food Toggle Pill */}
                          <button
                            onClick={() => handleUpdateItem(index, "is_food", !item.is_food)}
                            title={item.is_food ? "Food Item" : "Non-Food Home Good"}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                              item.is_food
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {item.is_food ? "Food" : "Home Good"}
                          </button>

                          {/* Price Input */}
                          <ItemPriceInput
                            amountMilliunits={item.amount}
                            onCommitAmount={(amt) => handleUpdateItem(index, "amount", amt)}
                          />

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteItem(index)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtotal Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Food Items</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(totals.foodTotal)}
                  </span>
                </div>
                <div className="border-l border-zinc-800 pl-4">
                  <span className="text-[10px] text-zinc-400 block">Home Goods (Non-Food)</span>
                  <span className="font-mono font-bold text-zinc-300">
                    {formatCurrency(totals.nonFoodTotal)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">Total Receipt Amount</span>
                <span className="font-mono text-sm font-extrabold text-white">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* YNAB Transaction Matching Section */}
          <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-3">
            <span className="text-xs font-bold text-white block">
              YNAB Transaction Link & Split Setup
            </span>

            {bestMatch ? (
              <div className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Auto-Match Found: {bestMatch.payee_name || "Store"}
                    </span>
                    <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-semibold">
                      {formatCurrency(bestMatch.amount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Account: {bestMatch.account_name} • Date: {bestMatch.date}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-200">
                    No automatic bank match found yet
                  </span>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    This receipt will be saved to your <strong>Unresolved Queue</strong>. You will be notified until the bank transaction posts!
                  </p>
                </div>
              </div>
            )}

            {/* Category Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor={foodCatSelectId}
                  className="text-[11px] font-semibold text-zinc-400 block mb-1"
                >
                  Food Category (YNAB)
                </label>
                <select
                  id={foodCatSelectId}
                  value={selectedFoodCatId}
                  onChange={(e) => setSelectedFoodCatId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_group_name ? `${c.category_group_name}: ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={homeGoodsCatSelectId}
                  className="text-[11px] font-semibold text-zinc-400 block mb-1"
                >
                  Home Goods Category (YNAB)
                </label>
                <select
                  id={homeGoodsCatSelectId}
                  value={selectedHomeCatId}
                  onChange={(e) => setSelectedHomeCatId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_group_name ? `${c.category_group_name}: ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split Strategy Choice */}
            <div className="pt-1">
              <label
                htmlFor={splitStrategySelectId}
                className="text-[11px] font-semibold text-zinc-400 block mb-1"
              >
                Split Transaction Strategy
              </label>
              <select
                id={splitStrategySelectId}
                value={splitStrategy}
                onChange={(e) => setSplitStrategy(e.target.value as "granular" | "two_way")}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="granular">
                  Sub-Category Memo Split (Recommended: fruits, veggies, meat, snacks, home goods)
                </option>
                <option value="two_way">
                  Two-Way Split (Total Food vs Total Home Goods)
                </option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReceipt}
              disabled={goods.length === 0 || isProcessing}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-zinc-950 transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
            >
              {isProcessing ? (
                <span>Saving...</span>
              ) : bestMatch ? (
                <span>Link & Split Transaction</span>
              ) : (
                <span>Save & Enqueue Receipt</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
