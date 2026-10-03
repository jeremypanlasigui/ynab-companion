import { Category, PurchasedGood, SubTransaction, FoodSubCategory } from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";

export interface SplitBuilderOptions {
  transactionId: string;
  foodCategoryId?: string | null;
  foodCategoryName?: string | null;
  homeGoodsCategoryId?: string | null;
  homeGoodsCategoryName?: string | null;
  strategy?: "granular" | "two_way"; // default: granular
}

/**
 * Automatically discovers the user's most relevant Food and Home Goods categories
 */
export function detectDefaultCategories(categories: Category[]): {
  foodCategory?: Category;
  homeGoodsCategory?: Category;
} {
  const activeCategories = categories.filter((c) => !c.deleted && !c.hidden);

  const foodKeywords = ["grocer", "supermarket", "food", "dining", "eating"];
  const homeKeywords = ["household", "home supplies", "home goods", "cleaning", "supplies"];

  const foodCategory = activeCategories.find((c) => {
    const name = c.name.toLowerCase();
    return foodKeywords.some((kw) => name.includes(kw));
  });

  const homeGoodsCategory = activeCategories.find((c) => {
    const name = c.name.toLowerCase();
    return homeKeywords.some((kw) => name.includes(kw));
  });

  return { foodCategory, homeGoodsCategory };
}

/**
 * Builds YNAB split subtransactions from a list of PurchasedGood items
 */
export function buildSplitSubtransactions(
  goods: PurchasedGood[],
  options: SplitBuilderOptions
): SubTransaction[] {
  const {
    transactionId,
    foodCategoryId = null,
    foodCategoryName = "Groceries",
    homeGoodsCategoryId = null,
    homeGoodsCategoryName = "Home Goods",
    strategy = "granular",
  } = options;

  if (goods.length === 0) return [];

  if (strategy === "two_way") {
    const foodGoods = goods.filter((g) => g.is_food);
    const nonFoodGoods = goods.filter((g) => !g.is_food);

    const subtransactions: SubTransaction[] = [];

    if (foodGoods.length > 0) {
      const foodTotal = foodGoods.reduce((sum, g) => sum + g.amount, 0);
      // Group food by subcategory for the memo summary
      const subCatBreakdown: Record<string, number> = {};
      foodGoods.forEach((g) => {
        subCatBreakdown[g.category] = (subCatBreakdown[g.category] || 0) + g.amount;
      });

      const memoBreakdown = Object.entries(subCatBreakdown)
        .map(([cat, amt]) => `[${cat}: ${formatCurrency(Math.abs(amt))}]`)
        .join(" ");

      subtransactions.push({
        id: `subtx-${transactionId}-food`,
        transaction_id: transactionId,
        amount: foodTotal,
        category_id: foodCategoryId,
        category_name: foodCategoryName,
        memo: `Food breakdown: ${memoBreakdown}`,
        deleted: false,
      });
    }

    if (nonFoodGoods.length > 0) {
      const nonFoodTotal = nonFoodGoods.reduce((sum, g) => sum + g.amount, 0);
      const itemsList = nonFoodGoods.map((g) => g.name).slice(0, 5).join(", ");
      const memo = `home goods: ${itemsList}${nonFoodGoods.length > 5 ? "..." : ""}`;

      subtransactions.push({
        id: `subtx-${transactionId}-homegoods`,
        transaction_id: transactionId,
        amount: nonFoodTotal,
        category_id: homeGoodsCategoryId,
        category_name: homeGoodsCategoryName,
        memo,
        deleted: false,
      });
    }

    return subtransactions;
  }

  // Strategy: Granular Sub-Category Split (Recommended)
  // Groups goods by their subcategory (fruits, veggies, meat, dairy, snacks, pantry, beverages, home goods, etc.)
  const grouped: Partial<Record<FoodSubCategory, PurchasedGood[]>> = {};

  goods.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category]!.push(item);
  });

  const subtransactions: SubTransaction[] = [];

  for (const [catKey, items] of Object.entries(grouped) as [FoodSubCategory, PurchasedGood[]][]) {
    if (!items || items.length === 0) continue;

    const groupTotal = items.reduce((sum, g) => sum + g.amount, 0);
    const itemNames = items.map((i) => i.name).slice(0, 4).join(", ");
    const suffix = items.length > 4 ? ` (+${items.length - 4} more)` : "";
    const memo = `${catKey}: ${itemNames}${suffix}`;

    const isNonFood = catKey === "home goods" || items.some((i) => !i.is_food);
    const targetCatId = isNonFood ? homeGoodsCategoryId : foodCategoryId;
    const targetCatName = isNonFood ? homeGoodsCategoryName : foodCategoryName;

    subtransactions.push({
      id: `subtx-${transactionId}-${catKey}`,
      transaction_id: transactionId,
      amount: groupTotal,
      category_id: targetCatId,
      category_name: targetCatName,
      memo,
      deleted: false,
    });
  }

  return subtransactions;
}
