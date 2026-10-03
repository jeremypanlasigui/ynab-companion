import { FoodSubCategory, PurchasedGood } from "@/lib/ynab/types";

export interface ParsedReceiptResult {
  vendor: string;
  date: string; // 'YYYY-MM-DD'
  totalAmount: number; // in milliunits (negative)
  foodAmount: number; // in milliunits (negative)
  nonFoodAmount: number; // in milliunits (negative)
  goods: PurchasedGood[];
  rawText: string;
}

const KNOWN_STORES = [
  "Trader Joe's",
  "Costco",
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
    category: "fruits",
    is_food: true,
    keywords: [
      "apple",
      "apples",
      "banana",
      "bananas",
      "berry",
      "berries",
      "strawberry",
      "strawberries",
      "blueberry",
      "blueberries",
      "blackberry",
      "raspberry",
      "orange",
      "oranges",
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
    category: "veggies",
    is_food: true,
    keywords: [
      "spinach",
      "broccoli",
      "lettuce",
      "salad",
      "greens",
      "arugula",
      "kale",
      "onion",
      "onions",
      "potato",
      "potatoes",
      "sweet potato",
      "tomato",
      "tomatoes",
      "pepper",
      "peppers",
      "bell pepper",
      "carrot",
      "carrots",
      "garlic",
      "ginger",
      "mushroom",
      "mushrooms",
      "zucchini",
      "cucumber",
      "cucumbers",
      "celery",
      "asparagus",
      "cauliflower",
      "cabbage",
      "brussels",
      "squash",
      "corn",
      "peas",
      "green bean",
    ],
  },
  {
    category: "meat",
    is_food: true,
    keywords: [
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
      "pork",
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
    category: "snacks",
    is_food: true,
    keywords: [
      "chip",
      "chips",
      "potato chip",
      "tortilla chip",
      "pretzel",
      "pretzels",
      "cracker",
      "crackers",
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
    ],
  },
  {
    category: "beverages",
    is_food: true,
    keywords: [
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
      "lemonade",
      "energy drink",
      "cold brew",
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
  {
    category: "pantry",
    is_food: true,
    keywords: [
      "pasta",
      "spaghetti",
      "penne",
      "noodle",
      "noodles",
      "rice",
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
      "bread",
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
      "coffee",
      "tea",
      "vinegar",
      "mayo",
      "mustard",
      "ketchup",
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

  return new Date().toISOString().slice(0, 10);
}

/**
 * Extracts store / vendor name from text
 */
function extractVendor(text: string, defaultVendor = "Grocery Store"): string {
  for (const store of KNOWN_STORES) {
    if (new RegExp(`\\b${store}\\b`, "i").test(text)) {
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

  // Regex to match a price at the end of a line (e.g. 14.99, $3.49, 4.50 F, 2.99T)
  const priceRegex = /[\$]?([0-9]+\.[0-9]{2})(?:\s*[FTX\*\-])?\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Check for explicit total / subtotal lines
    if (upper.includes("TOTAL") && !upper.includes("SUBTOTAL")) {
      const match = line.match(/[\$]?([0-9]+\.[0-9]{2})/);
      if (match) {
        explicitTotal = Math.round(parseFloat(match[1]) * 1000);
      }
      continue;
    }

    if (
      upper.startsWith("SUBTOTAL") ||
      upper.startsWith("TAX") ||
      upper.startsWith("CASH") ||
      upper.startsWith("CHANGE") ||
      upper.startsWith("BALANCE") ||
      upper.startsWith("VISA") ||
      upper.startsWith("MASTERCARD") ||
      upper.startsWith("AMEX") ||
      upper.startsWith("APPROVED")
    ) {
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
      const priceVal = parseFloat(priceMatch[1]);
      if (isNaN(priceVal) || priceVal <= 0) continue;

      // Extract item description before the price
      const rawName = line.slice(0, priceMatch.index).trim();
      const cleanName = rawName
        .replace(/^[\d\s*#-]+/, "") // remove leading barcode/sku numbers
        .replace(/[\$@]\s*[\d.]+/g, "") // remove embedded unit prices
        .trim();

      if (!cleanName || cleanName.length < 2) continue;

      const classification = classifyItem(cleanName);
      const milliunits = -Math.round(priceVal * 1000); // negative for expense

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
