import { FoodSubCategory, PurchasedGood } from "@/lib/ynab/types";

export interface ParsedReceiptResult {
  vendor: string;
  date: string; // 'YYYY-MM-DD'
  totalAmount: number; // in milliunits (negative)
  foodAmount: number; // in milliunits (negative)
  nonFoodAmount: number; // in milliunits (negative)
  goods: PurchasedGood[];
  rawText: string;
  imageUrl?: string;
}


const KNOWN_STORES = [
  "Tokyo Central",
  "Marukai",
  "Marukai Market",
  "Mitsuwa",
  "H Mart",
  "99 Ranch",
  "Nijiya",
  "Trader Joe's",
  "Costco",
  "Costco Wholesale",
  "Target",
  "Whole Foods",
  "Kroger",
  "Safeway",
  "ALDI",
  "Walmart",
  "Sprouts",
  "H-E-B",
  "Wegmans",
  "Publix",
  "WinCo",
];

const KEYWORD_RULES: Array<{
  category: FoodSubCategory;
  is_food: boolean;
  keywords: string[];
}> = [
  {
    category: "home goods",
    is_food: false,
    keywords: [
      "paper towel",
      "paper towels",
      "toilet paper",
      "bath tissue",
      "detergent",
      "laundry",
      "dish soap",
      "hand soap",
      "body wash",
      "shampoo",
      "conditioner",
      "deodorant",
      "toothpaste",
      "toothbrush",
      "trash bag",
      "trash bags",
      "garbage bag",
      "aluminum foil",
      "foil",
      "parchment",
      "plastic wrap",
      "cling wrap",
      "ziploc",
      "storage bag",
      "sandwich bag",
      "sponge",
      "sponges",
      "cleaner",
      "bleach",
      "wipes",
      "disinfect",
      "clorox",
      "lysol",
      "napkin",
      "napkins",
      "facial tissue",
      "kleenex",
      "battery",
      "batteries",
      "candle",
      "pet food",
      "dog food",
      "cat food",
      "litter",
      "tylenol",
      "advil",
      "aspirin",
      "cotton swab",
      "q-tip",
      "mop",
      "broom",
      "scrubber",
    ],
  },
  {
    // Snacks listed ahead of fruits so items like "Chili Lime Chips" are classified as snacks
    category: "snacks",
    is_food: true,
    keywords: [
      "shrimp chip",
      "shrimp chips",
      "chip",
      "chips",
      "potato chip",
      "tortilla chip",
      "pretzel",
      "pretzels",
      "cracker",
      "crackers",
      "rice cracker",
      "rice crackers",
      "senbei",
      "pocky",
      "cookie",
      "cookies",
      "popcorn",
      "almond",
      "almonds",
      "cashew",
      "cashews",
      "walnut",
      "peanut",
      "peanuts",
      "chocolate",
      "candy",
      "gummy",
      "gummies",
      "granola bar",
      "protein bar",
      "bar",
      "trail mix",
      "wafer",
      "snack",
      "snacks",
    ],
  },
  {
    category: "meat",
    is_food: true,
    keywords: [
      "gyoza",
      "dumpling",
      "dumplings",
      "pork",
      "nira pork",
      "nira",
      "chicken",
      "beef",
      "ground beef",
      "steak",
      "salmon",
      "fish",
      "tuna",
      "shrimp",
      "turkey",
      "ground turkey",
      "pork chop",
      "bacon",
      "sausage",
      "ham",
      "lamb",
      "cod",
      "tilapia",
      "meatball",
      "meatballs",
      "ribs",
      "halibut",
      "crab",
      "scallop",
    ],
  },
  {
    category: "veggies",
    is_food: true,
    keywords: [
      "shimeji",
      "bunashimeji",
      "mushroom",
      "mushrooms",
      "seaweed",
      "seaweed salad",
      "salad",
      "greens",
      "cabbage",
      "green cabbage",
      "cucumber",
      "cucumbers",
      "persian cucumber",
      "carrot",
      "carrots",
      "spinach",
      "broccoli",
      "lettuce",
      "arugula",
      "kale",
      "onion",
      "onions",
      "scallion",
      "green onion",
      "daikon",
      "radish",
      "bok choy",
      "potato",
      "potatoes",
      "sweet potato",
      "tomato",
      "tomatoes",
      "pepper",
      "peppers",
      "bell pepper",
      "garlic",
      "ginger",
      "zucchini",
      "celery",
      "asparagus",
      "cauliflower",
      "brussels",
      "squash",
      "corn",
      "peas",
      "green bean",
      "bean sprout",
    ],
  },
  {
    category: "fruits",
    is_food: true,
    keywords: [
      "papaya",
      "papayas",
      "banana",
      "bananas",
      "orange",
      "oranges",
      "cara cara",
      "apple",
      "apples",
      "berry",
      "berries",
      "strawberry",
      "strawberries",
      "blueberry",
      "blueberries",
      "blackberry",
      "raspberry",
      "citrus",
      "lemon",
      "lemons",
      "lime",
      "limes",
      "grape",
      "grapes",
      "peach",
      "peaches",
      "pear",
      "pears",
      "plum",
      "plums",
      "watermelon",
      "melon",
      "cantaloupe",
      "avocado",
      "avocados",
      "mango",
      "mangoes",
      "pineapple",
      "kiwi",
      "grapefruit",
      "cherry",
      "cherries",
    ],
  },
  {
    category: "beverages",
    is_food: true,
    keywords: [
      "skal",
      "calpico",
      "pocari",
      "ramune",
      "water",
      "sparkling water",
      "mineral water",
      "seltzer",
      "soda",
      "coke",
      "pepsi",
      "sprite",
      "juice",
      "orange juice",
      "apple juice",
      "kombucha",
      "iced tea",
      "tea",
      "green tea",
      "milk tea",
      "boba",
      "lemonade",
      "energy drink",
      "cold brew",
      "coffee",
    ],
  },
  {
    category: "pantry",
    is_food: true,
    keywords: [
      "ramen",
      "tonkotsu",
      "noodle",
      "noodles",
      "soba",
      "udon",
      "tofu",
      "bread",
      "slices",
      "white bread",
      "rice",
      "garlic pepper rice",
      "curry",
      "miso",
      "soy sauce",
      "sesame oil",
      "pasta",
      "spaghetti",
      "penne",
      "flour",
      "sugar",
      "oil",
      "olive oil",
      "vegetable oil",
      "sauce",
      "marinara",
      "spice",
      "spices",
      "seasoning",
      "cereal",
      "oatmeal",
      "oats",
      "bagel",
      "bagels",
      "tortilla",
      "tortillas",
      "peanut butter",
      "jam",
      "jelly",
      "honey",
      "bean",
      "beans",
      "canned",
      "broth",
      "dashi",
      "vinegar",
      "mayo",
      "mustard",
      "ketchup",
    ],
  },
  {
    category: "dairy",
    is_food: true,
    keywords: [
      "milk",
      "whole milk",
      "skim milk",
      "cheese",
      "cheddar",
      "mozzarella",
      "parmesan",
      "gouda",
      "brie",
      "feta",
      "yogurt",
      "greek yogurt",
      "butter",
      "egg",
      "eggs",
      "cream",
      "heavy cream",
      "sour cream",
      "cottage cheese",
      "creamer",
      "half & half",
      "half and half",
    ],
  },
  {
    category: "tax",
    is_food: true,
    keywords: [
      "sales tax",
      "tax 1",
      "tax 2",
      "state tax",
      "local tax",
      "estimated tax",
      "tax",
    ],
  },
  {
    category: "ca crv",
    is_food: true,
    keywords: [
      "ca crv",
      "crv",
      "bottle deposit",
      "can deposit",
      "recycling fee",
      "deposit fee",
    ],
  },
  {
    category: "prepared",
    is_food: true,
    keywords: [
      "rotisserie",
      "sandwich",
      "wrap",
      "sushi",
      "bento",
      "hot bar",
      "salad bar",
      "deli",
      "pizza",
      "burrito",
      "soup",
      "ready to eat",
      "prepared",
    ],
  },
];

/**
 * Classifies an item name into a FoodSubCategory and is_food boolean flag
 */
export function classifyItem(itemName: string): {
  category: FoodSubCategory;
  is_food: boolean;
} {
  const lower = itemName.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`, "i");
      if (regex.test(lower) || lower.includes(kw)) {
        return {
          category: rule.category,
          is_food: rule.is_food,
        };
      }
    }
  }

  // Default fallback
  return {
    category: "other",
    is_food: true,
  };
}

/**
 * Extracts date from text or returns ISO today
 */
function extractDate(text: string): string {
  // MM/DD/YYYY or MM-DD-YYYY
  const m1 = text.match(/\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](20\d{2}|\d{2})\b/);
  if (m1) {
    const month = m1[1].padStart(2, "0");
    const day = m1[2].padStart(2, "0");
    let year = m1[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const m2 = text.match(/\b(20\d{2})[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  }

  // OCT 02 2026 or Oct 2, 2026
  const m3 = text.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*\s+(\d{1,2})[,\s]+(20\d{2})\b/i);
  if (m3) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const month = months[m3[1].toLowerCase().slice(0, 3)] || "01";
    const day = m3[2].padStart(2, "0");
    const year = m3[3];
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extracts store / vendor name from text
 */
function extractVendor(text: string, defaultVendor = "Grocery Store"): string {
  for (const store of KNOWN_STORES) {
    if (new RegExp(`\\b${store.replace(/[']/g, "[']?")}\\b`, "i").test(text)) {
      return store;
    }
  }

  // Check first non-empty lines for vendor name
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0 && lines[0].length < 35 && !/\d{2,}/.test(lines[0])) {
    return lines[0].replace(/[*#]/g, "").trim();
  }

  return defaultVendor;
}

/**
 * Parses freeform receipt text or copy-pasted order into structured PurchasedGood items
 */
export function parseReceiptText(
  rawText: string,
  receiptId = `rcpt-${Date.now()}`
): ParsedReceiptResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const vendor = extractVendor(rawText);
  const date = extractDate(rawText);

  const goods: PurchasedGood[] = [];
  let explicitTotal: number | null = null;

  // Broad regex to match price at end of line, including trailing flags like F, T1F, TF, *
  const priceRegex = /(?:\$|\s)([0-9]+\.[0-9]{2})(?:\s*[A-Z0-9\*\#\-]+)?\s*$/i;

  const ignoreLinePrefixes = [
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Check for explicit total / subtotal lines, carefully excluding savings and markdowns
    const isTotal =
      (upper.startsWith("TOTAL SALES") ||
        upper.startsWith("SUB TOTAL") ||
        upper.startsWith("SUBTOTAL") ||
        upper.startsWith("TOTAL") ||
        upper.startsWith("AMOUNT") ||
        upper.startsWith("GRAND TOTAL")) &&
      !upper.includes("SAVING") &&
      !upper.includes("MARKDOWN") &&
      !upper.includes("TAX") &&
      !upper.includes("ITEM");

    if (isTotal) {
      const match = line.match(/[\$]?([0-9]+\.[0-9]{2})/);
      if (match && !explicitTotal) {
        explicitTotal = Math.round(parseFloat(match[1]) * 1000);
      }
      continue;
    }

    // Ignore secondary weight / quantity lines: e.g. 2.02 lb @ $2.99/lb or 1 @ $5.99 each
    if (/^\d+(\.\d+)?\s*(lb|kg|oz|g)?\s*@/i.test(line)) {
      continue;
    }

    // Ignore discount, fee, tax, metadata lines
    if (ignoreLinePrefixes.some((prefix) => upper.startsWith(prefix))) {
      continue;
    }

    // Normalize potential OCR price artifacts (comma, space decimal, apostrophe)
    let normalizedLine = line
      .replace(/(\d+)[\,`'](\d{2})\b/g, "$1.$2")
      .replace(/(^|[\s\$])(\d{1,4})\s+(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, prefix, dollars, cents, flag) => {
        return `${prefix}${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      })
      .replace(/\$(\d{1,3})(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, dollars, cents, flag) => {
        return `$${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      })
      .replace(/(\s{2,})(\d{1,3})(\d{2})(?:\s+([A-Z0-9\*\#\-]+))?$/i, (match, spaces, dollars, cents, flag) => {
        return `${spaces}${dollars}.${cents}${flag ? ` ${flag}` : ""}`;
      });

    const priceMatch = normalizedLine.match(priceRegex);
    if (priceMatch) {
      const priceVal = parseFloat(priceMatch[1]);
      if (isNaN(priceVal) || priceVal <= 0) continue;

      // Extract item description before the price
      const rawName = normalizedLine.slice(0, priceMatch.index).trim();
      let cleanName = rawName
        .replace(/^[\d\s*#-]+/, "") // remove leading barcode/sku numbers
        .replace(/[\$@]\s*[\d.]+/g, "") // remove embedded unit prices
        .replace(/[\$@#*:\-_.]+$/, "") // remove trailing currency symbols or punctuation before price
        .trim();

      if (!cleanName || cleanName.length < 2) continue;

      // Normalize CRV name if needed
      if (/^\+?\s*CA\s*CRV/i.test(cleanName)) {
        cleanName = "CA CRV";
      }
      cleanName = cleanName.replace(/\[\s*\]/g, "").trim();
      if (/^tax(\s*\d*)?$/i.test(cleanName)) {
        cleanName = cleanName.toUpperCase().startsWith("TAX 1") ? "Tax 1" : "Sales Tax";
      }

      const classification = classifyItem(cleanName);
      const milliunits = -Math.round(priceVal * 1000); // negative for expense

      // Deduplicate identical CRV entries (e.g. inline item deposit vs footer summary)
      if (classification.category === "ca crv") {
        const duplicate = goods.some(
          (g) => g.category === "ca crv" && g.amount === milliunits
        );
        if (duplicate) continue;
      }

      // Deduplicate identical Tax entries
      if (classification.category === "tax") {
        const duplicate = goods.some(
          (g) => g.category === "tax" && g.amount === milliunits
        );
        if (duplicate) continue;
      }

      goods.push({
        id: `good-${receiptId}-${goods.length + 1}`,
        receipt_id: receiptId,
        name: cleanName,
        amount: milliunits,
        category: classification.category,
        is_food: classification.is_food,
      });
    }
  }

  // Reconcile sales tax, CRV, or bottle deposits if explicit total exceeds items sum
  const itemsSum = goods.reduce((sum, g) => sum + g.amount, 0);
  if (explicitTotal && Math.abs(explicitTotal) > Math.abs(itemsSum)) {
    const taxDiff = Math.abs(explicitTotal) - Math.abs(itemsSum);
    if (taxDiff > 0 && taxDiff < 25000) {
      goods.push({
        id: `good-${receiptId}-tax`,
        receipt_id: receiptId,
        name: "Sales Tax",
        amount: -taxDiff,
        category: "tax",
        is_food: true,
      });
    }
  }

  // Assign synthetic bounding boxes for receipt visual overlay if not from OCR
  const totalItems = Math.max(goods.length, 1);
  const startY = 18;
  const availableHeight = 64;
  const step = Math.min(availableHeight / totalItems, 5.5);
  goods.forEach((good, idx) => {
    if (!good.bbox) {
      good.bbox = {
        x0: 5,
        y0: Number((startY + idx * step).toFixed(2)),
        x1: 95,
        y1: Number((startY + idx * step + Math.min(step * 0.85, 4.2)).toFixed(2)),
      };
    }
  });

  // Calculate totals
  const foodAmount = goods
    .filter((g) => g.is_food)
    .reduce((sum, g) => sum + g.amount, 0);

  const nonFoodAmount = goods
    .filter((g) => !g.is_food)
    .reduce((sum, g) => sum + g.amount, 0);

  const calculatedTotal = foodAmount + nonFoodAmount;
  const totalAmount = explicitTotal ? -explicitTotal : calculatedTotal;

  return {
    vendor,
    date,
    totalAmount,
    foodAmount,
    nonFoodAmount,
    goods,
    rawText,
  };
}

// ==========================================
// SAMPLE RECEIPT PRESETS FOR TESTING
// ==========================================
export const PRESET_RECEIPTS = [
  {
    name: "Tokyo Central (Japanese Groceries & Snacks)",
    vendor: "Tokyo Central",
    text: `TOKYO CENTRAL
MARUKAI MARKET
8151 Balboa Ave
San Diego,CA
858-384-0245

#023-005 10/2/2026 16:53:42 Roger R
Inv#:00404858 Trs#:408099

TONKOTSU RAMEN 5PK           $5.39 F
SKAL WHITE 500ml             $1.99 T1F
+CA CRV: $0.05
 Markdown: $0.80
SHRIMP CHIPS CHILI LIME      $3.29 F
SHRIMP CHIPS CHILI LIME      $3.29 F
WHITE BREAD THICK SLICES     $5.49 F
 1 @ $5.99 each (2/$9.98)
GYOZA NIRA PORK              $5.99 F
GARLIC PEPPER RICE           $8.99 F
 1 @ $2.09 each (2/$3.78)
MARUKAI TOFU SOFT            $2.09 F
SEAWEED SALAD                $6.07 F
 Markdown: $1.52
HOKTO ORG BUNASHIMEJI        $1.99 F
 Markdown: $1.00
CELLO PKG CARROTS            $1.19 F
 2.02 lb @ $2.99/lb
PERSIAN CUCUMBER             $6.04 F
 1.27 lb @ $6.99/lb
HAWAIIAN PAPAYAS             $8.88 F
 1.92 lb @ $0.59/lb
BANANA                       $1.13 F
 1.52 lb @ $1.79/lb
GREEN CABBAGE                $2.72 F
CARA CARA ORANGE BAG         $8.99 F

Net Sales                    $73.53
Tax 1 [$2.04]                $0.16
CA CRV                       $0.05
TOTAL SALES                  $73.74

SUB TOTAL                    $73.74
Visa                         $73.74
# ************6238
Balance                      $0.00

Item count                     16
Temporary markdown           $3.32
SAVING GRAND TOTAL           $3.32`,
  },
  {
    name: "Trader Joe's (Groceries + Home Goods)",
    vendor: "Trader Joe's",
    text: `TRADER JOE'S #124
785 CHESTNUT ST, SAN FRANCISCO CA
Date: 10/02/2026

ORGANIC HONEYCRISP APPLES    4.99
ORGANIC BANANAS              1.49
ORGANIC BABY SPINACH         2.99
BROCCOLI FLORETS             2.49
WILD CAUGHT ALASKAN SALMON  14.99
GRASS FED GROUND BEEF 85/15  8.99
ORGANIC WHOLE MILK 1 GAL     4.29
PLAIN GREEK YOGURT 32OZ      3.99
PITA BITE MULTIGRAIN CRACKER 2.99
DARK CHOCOLATE ALMONDS       4.99
ORGANIC TOMATO BASIL SAUCE   3.29
SPARKLING SPRING WATER 1L    3.99
RECYCLED PAPER TOWELS 3PK   13.99
ECO CITRUS DISH SOAP 25OZ    5.03

SUBTOTAL                    78.50
TAX                          0.00
TOTAL                       78.50`,
  },
  {
    name: "Costco Wholesale (Bulk Food & Household Supplies)",
    vendor: "Costco Wholesale",
    text: `COSTCO WHOLESALE #482
1234 COMMERCIAL BLVD, SEATTLE WA
Date: 10/01/2026

KS ORGANIC STRAWBERRIES 2LB   7.99
KS ROTISSERIE CHICKEN         4.99
ORGANIC ATLANTIC SALMON 3LB  28.99
KS CAGE FREE LARGE EGGS 2DZ   6.49
ORGANIC SOURDOUGH BREAD 2PK   8.49
ORGANIC BABY SPINACH 1LB      4.99
MIXED BELL PEPPERS 6PK        7.99
CHOMPS BEEF STICKS 12CT      18.99
KS BATH TISSUE 30 ROLLS      23.99
KS DISHWASHER PODS 115CT     17.99
BOUNTY ADVANCED PAPER TOWELS 24.99

SUBTOTAL                    155.89
TAX                           0.00
TOTAL                       155.89`,
  },
  {
    name: "Target (Groceries + Cleaning Products)",
    vendor: "Target",
    text: `TARGET STORE T-2415
500 METRO CENTER, CHICAGO IL
Date: 10/02/2026

G&G ORGANIC RASPBERRIES 6OZ   3.99
G&G BABY PEELED CARROTS 1LB   1.79
BONELESS CHICKEN BREAST 2LB   9.49
CHOBANI GREEK YOGURT 4PK      4.29
G&G CORN TORTILLA CHIPS       2.99
CLOROX DISINFECTING WIPES    12.49
TIDE PODS SPRING MEADOW 42CT 21.99
DAWN PLATINUM DISH SOAP 3PK   9.99

SUBTOTAL                     67.02
TAX                           0.00
TOTAL                        67.02`,
  },
];
