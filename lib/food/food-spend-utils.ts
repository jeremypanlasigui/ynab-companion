import {
  TransactionDetail,
  ReceiptIngestion,
  Category,
  SubTransaction,
  FoodSubCategory,
  PurchasedGood,
} from "@/lib/ynab/types";

export interface ContributingSubtransaction {
  subtransaction: SubTransaction;
  isFood: boolean;
  type: "groceries" | "dining" | "memo_subcat" | "home_goods" | "other";
}

export interface ContributingTransaction {
  id: string; // transaction id or receipt id
  date: string;
  payeeName: string;
  accountName?: string;
  totalAmount: number; // negative milliunits
  foodSpendMilliunits: number; // positive milliunits for spend amount
  homeGoodsMilliunits: number; // positive milliunits for excluded home goods
  isPendingReceipt: boolean;
  transaction?: TransactionDetail;
  receipt?: ReceiptIngestion;
  subtransactionsBreakdown?: ContributingSubtransaction[];
  itemsBreakdown?: PurchasedGood[];
  linkedReceipt?: ReceiptIngestion;
}

export interface FoodSpendSummary {
  totalFoodSpend: number; // positive milliunits
  grocerySpend: number;
  diningSpend: number;
  homeGoodsFiltered: number;
  budgetedFood: number;
  percentUsed: number;
  contributingTransactions: ContributingTransaction[];
  groceryCategories: Category[];
  diningCategories: Category[];
}

/**
 * Calculates food spend metrics and identifies all contributing transactions and pending receipts
 * for a given month.
 */
export function calculateFoodSpend(
  transactions: TransactionDetail[],
  receipts: ReceiptIngestion[],
  categories: Category[],
  currentMonth: string // "YYYY-MM"
): FoodSpendSummary {
  // 1. Identify grocery categories (excluding pet foods)
  const groceryCategories = categories.filter((c) => {
    if (c.deleted || c.hidden) return false;
    const name = c.name.toLowerCase();
    const isPet =
      name.includes("pet") ||
      name.includes("cat") ||
      name.includes("dog") ||
      name.includes("bird");
    if (isPet) return false;
    return (
      name.includes("grocer") ||
      name.includes("supermarket") ||
      name.includes("market") ||
      name.includes("food")
    );
  });
  const groceryCatIds = new Set(groceryCategories.map((c) => c.id));

  // 2. Identify dining categories
  const diningCategories = categories.filter((c) => {
    if (c.deleted || c.hidden) return false;
    const name = c.name.toLowerCase();
    return (
      name.includes("dining") ||
      name.includes("restaurant") ||
      name.includes("takeout") ||
      name.includes("boba") ||
      name.includes("coffee") ||
      name.includes("cafeteria")
    );
  });
  const diningCatIds = new Set(diningCategories.map((c) => c.id));

  // 3. Filter transactions for the current month
  const monthTxs = transactions.filter((t) => {
    if (t.deleted) return false;
    return t.date.startsWith(currentMonth);
  });

  let grocerySpend = 0;
  let diningSpend = 0;
  let homeGoodsFiltered = 0;
  const contributingTransactions: ContributingTransaction[] = [];
  const matchedReceiptIds = new Set<string>();

  // A. Process Bank Transactions
  monthTxs.forEach((t) => {
    let txFoodSpend = 0;
    let txHomeGoods = 0;

    // A1. Split Transactions
    if (t.subtransactions && t.subtransactions.length > 0) {
      const breakdown: ContributingSubtransaction[] = [];

      t.subtransactions.forEach((st) => {
        if (st.deleted) return;
        const memoLower = (st.memo || "").toLowerCase();
        const catNameLower = (st.category_name || "").toLowerCase();

        const isHomeGoods =
          memoLower.includes("home goods") ||
          memoLower.includes("household") ||
          catNameLower.includes("home");

        if (isHomeGoods) {
          const amt = Math.abs(st.amount);
          txHomeGoods += amt;
          homeGoodsFiltered += amt;
          breakdown.push({
            subtransaction: st,
            isFood: false,
            type: "home_goods",
          });
        } else if (st.category_id && groceryCatIds.has(st.category_id)) {
          const amt = Math.abs(st.amount);
          txFoodSpend += amt;
          grocerySpend += amt;
          breakdown.push({
            subtransaction: st,
            isFood: true,
            type: "groceries",
          });
        } else if (st.category_id && diningCatIds.has(st.category_id)) {
          const amt = Math.abs(st.amount);
          txFoodSpend += amt;
          diningSpend += amt;
          breakdown.push({
            subtransaction: st,
            isFood: true,
            type: "dining",
          });
        } else if (
          memoLower.includes("fruit") ||
          memoLower.includes("meat") ||
          memoLower.includes("veggie") ||
          memoLower.includes("snack") ||
          memoLower.includes("dairy") ||
          memoLower.includes("pantry") ||
          memoLower.includes("beverage") ||
          memoLower.includes("prepared") ||
          memoLower.includes("other") ||
          memoLower.includes("tax") ||
          memoLower.includes("crv")
        ) {
          const amt = Math.abs(st.amount);
          txFoodSpend += amt;
          grocerySpend += amt;
          breakdown.push({
            subtransaction: st,
            isFood: true,
            type: "memo_subcat",
          });
        } else {
          breakdown.push({
            subtransaction: st,
            isFood: false,
            type: "other",
          });
        }
      });

      if (txFoodSpend > 0 || txHomeGoods > 0) {
        contributingTransactions.push({
          id: t.id,
          date: t.date,
          payeeName: t.payee_name || "Uncategorized Payee",
          accountName: t.account_name,
          totalAmount: t.amount,
          foodSpendMilliunits: txFoodSpend,
          homeGoodsMilliunits: txHomeGoods,
          isPendingReceipt: false,
          transaction: t,
          subtransactionsBreakdown: breakdown,
        });
      }
    } else {
      // A2. Normal non-split transactions
      const linkedReceipt = receipts.find((r) => r.matched_transaction_id === t.id);
      if (linkedReceipt) {
        matchedReceiptIds.add(linkedReceipt.id);
      }

      if (t.category_id && groceryCatIds.has(t.category_id)) {
        if (linkedReceipt && linkedReceipt.non_food_amount < 0) {
          const homeAmt = Math.abs(linkedReceipt.non_food_amount);
          const foodAmt = Math.abs(linkedReceipt.food_amount);
          homeGoodsFiltered += homeAmt;
          grocerySpend += foodAmt;
          contributingTransactions.push({
            id: t.id,
            date: t.date,
            payeeName: t.payee_name || "Uncategorized Payee",
            accountName: t.account_name,
            totalAmount: t.amount,
            foodSpendMilliunits: foodAmt,
            homeGoodsMilliunits: homeAmt,
            isPendingReceipt: false,
            transaction: t,
            linkedReceipt,
          });
        } else {
          const amt = Math.abs(t.amount);
          grocerySpend += amt;
          contributingTransactions.push({
            id: t.id,
            date: t.date,
            payeeName: t.payee_name || "Uncategorized Payee",
            accountName: t.account_name,
            totalAmount: t.amount,
            foodSpendMilliunits: amt,
            homeGoodsMilliunits: 0,
            isPendingReceipt: false,
            transaction: t,
            linkedReceipt,
          });
        }
      } else if (t.category_id && diningCatIds.has(t.category_id)) {
        const amt = Math.abs(t.amount);
        diningSpend += amt;
        contributingTransactions.push({
          id: t.id,
          date: t.date,
          payeeName: t.payee_name || "Uncategorized Payee",
          accountName: t.account_name,
          totalAmount: t.amount,
          foodSpendMilliunits: amt,
          homeGoodsMilliunits: 0,
          isPendingReceipt: false,
          transaction: t,
          linkedReceipt,
        });
      }
    }
  });

  // B. Include Pending / Unresolved Receipts in Total Food Spend & Contributing List
  const monthReceipts = receipts.filter((r) => r.date.startsWith(currentMonth));
  monthReceipts.forEach((r) => {
    // Only include if unresolved OR not already matched to an existing transaction processed above
    const isUnresolved = r.status === "unresolved" || !r.matched_transaction_id;
    if (isUnresolved && !matchedReceiptIds.has(r.id)) {
      const foodAmt = Math.abs(r.food_amount);
      const homeAmt = Math.abs(r.non_food_amount || 0);

      grocerySpend += foodAmt;
      if (homeAmt > 0) {
        homeGoodsFiltered += homeAmt;
      }

      contributingTransactions.push({
        id: r.id,
        date: r.date,
        payeeName: r.vendor,
        accountName: "Pending Import",
        totalAmount: r.total_amount,
        foodSpendMilliunits: foodAmt,
        homeGoodsMilliunits: homeAmt,
        isPendingReceipt: true,
        receipt: r,
        itemsBreakdown: r.goods || [],
      });
    }
  });

  const totalFoodSpend = grocerySpend + diningSpend;

  // Budget target
  let budgetedFood = 0;
  groceryCategories.forEach((c) => (budgetedFood += c.budgeted || 0));
  diningCategories.forEach((c) => (budgetedFood += c.budgeted || 0));

  const percentUsed =
    budgetedFood > 0 ? Math.round((totalFoodSpend / budgetedFood) * 100) : 0;

  // Sort contributing transactions by date descending
  contributingTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    totalFoodSpend,
    grocerySpend,
    diningSpend,
    homeGoodsFiltered,
    budgetedFood,
    percentUsed,
    contributingTransactions,
    groceryCategories,
    diningCategories,
  };
}

// --------------------------------------------------------------------------
// Sub-Category Detail Breakdown Structures & Helpers
// --------------------------------------------------------------------------

export interface SubCategoryItem {
  id: string;
  name: string;
  amount: number; // negative milliunits
  date: string;
  vendor: string;
  category: FoodSubCategory;
  source: "receipt" | "transaction_split";
  receiptId?: string;
  transactionId?: string;
}

export interface SubCategoryGroupedRun {
  sourceId: string;
  date: string;
  vendor: string;
  totalCategoryAmount: number; // positive milliunits
  items: SubCategoryItem[];
  sourceType: "receipt" | "transaction_split";
}

export interface SubCategoryDetailData {
  categoryKey: FoodSubCategory;
  totalAmount: number; // positive milliunits
  itemCount: number;
  percentageOfFood: number;
  items: SubCategoryItem[];
  groupedByStoreRun: SubCategoryGroupedRun[];
}

/**
 * Extracts and aggregates all individual items and store runs for a specific food sub-category
 * from both itemized receipts and split bank transactions.
 */
export function getSubCategoryBreakdown(
  categoryKey: FoodSubCategory,
  receipts: ReceiptIngestion[],
  transactions: TransactionDetail[],
  currentMonth: string,
  totalFoodSpend: number
): SubCategoryDetailData {
  const items: SubCategoryItem[] = [];
  const matchedReceiptIds = new Set<string>();

  // 1. Process receipts in the current month
  const monthReceipts = receipts.filter((r) => r.date.startsWith(currentMonth));
  monthReceipts.forEach((r) => {
    if (r.matched_transaction_id) {
      matchedReceiptIds.add(r.matched_transaction_id);
    }

    (r.goods || []).forEach((good) => {
      let isMatch = false;
      if (categoryKey === "home goods") {
        isMatch = !good.is_food || good.category === "home goods";
      } else {
        isMatch = good.category === categoryKey;
      }

      if (isMatch) {
        items.push({
          id: good.id,
          name: good.name,
          amount: good.amount,
          date: r.date,
          vendor: r.vendor,
          category: good.category,
          source: "receipt",
          receiptId: r.id,
        });
      }
    });
  });

  // 2. Process split transactions (excluding transactions that already have a matched receipt to avoid duplicate items)
  const monthTxs = transactions.filter((t) => {
    if (t.deleted) return false;
    return t.date.startsWith(currentMonth) && !matchedReceiptIds.has(t.id);
  });

  monthTxs.forEach((t) => {
    if (!t.subtransactions || t.subtransactions.length === 0) return;

    t.subtransactions.forEach((st) => {
      if (st.deleted) return;
      const memoLower = (st.memo || "").toLowerCase();
      const catNameLower = (st.category_name || "").toLowerCase();

      let isMatch = false;
      if (categoryKey === "home goods") {
        isMatch =
          memoLower.includes("home goods") ||
          memoLower.includes("household") ||
          catNameLower.includes("home");
      } else {
        isMatch =
          memoLower.startsWith(categoryKey + ":") ||
          memoLower.includes(categoryKey) ||
          catNameLower.includes(categoryKey);
      }

      if (isMatch) {
        // Clean memo text e.g. "fruits: KS ORGANIC STRAWBERRIES 2LB" -> "KS ORGANIC STRAWBERRIES 2LB"
        const cleanName = st.memo
          ? st.memo.replace(new RegExp(`^${categoryKey}:?\\s*`, "i"), "")
          : st.category_name || "Line Item";

        items.push({
          id: st.id,
          name: cleanName,
          amount: st.amount,
          date: t.date,
          vendor: t.payee_name || "Grocery Store",
          category: categoryKey,
          source: "transaction_split",
          transactionId: t.id,
        });
      }
    });
  });

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const percentageOfFood =
    totalFoodSpend > 0 && categoryKey !== "home goods"
      ? Math.round((totalAmount / totalFoodSpend) * 100)
      : 0;

  // Group by store run
  const groupedMap = new Map<string, SubCategoryGroupedRun>();

  items.forEach((item) => {
    const key = `${item.vendor}_${item.date}_${item.receiptId || item.transactionId || ""}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        sourceId: item.receiptId || item.transactionId || key,
        date: item.date,
        vendor: item.vendor,
        totalCategoryAmount: 0,
        items: [],
        sourceType: item.source,
      });
    }
    const group = groupedMap.get(key)!;
    group.totalCategoryAmount += Math.abs(item.amount);
    group.items.push(item);
  });

  const groupedByStoreRun = Array.from(groupedMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Sort items by date descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    categoryKey,
    totalAmount,
    itemCount: items.length,
    percentageOfFood,
    items,
    groupedByStoreRun,
  };
}
