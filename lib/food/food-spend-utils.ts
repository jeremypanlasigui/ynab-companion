import { TransactionDetail, ReceiptIngestion, Category, SubTransaction } from "@/lib/ynab/types";

export interface ContributingSubtransaction {
  subtransaction: SubTransaction;
  isFood: boolean;
  type: "groceries" | "dining" | "memo_subcat" | "home_goods" | "other";
}

export interface ContributingTransaction {
  transaction: TransactionDetail;
  foodSpendMilliunits: number; // positive milliunits for spend amount
  homeGoodsMilliunits: number; // positive milliunits for excluded home goods
  subtransactionsBreakdown?: ContributingSubtransaction[];
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
 * Calculates food spend metrics and identifies all contributing transactions for a given month.
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

  monthTxs.forEach((t) => {
    let txFoodSpend = 0;
    let txHomeGoods = 0;

    // A. Split Transactions
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
          transaction: t,
          foodSpendMilliunits: txFoodSpend,
          homeGoodsMilliunits: txHomeGoods,
          subtransactionsBreakdown: breakdown,
        });
      }
    } else {
      // B. Normal non-split transactions
      const linkedReceipt = receipts.find((r) => r.matched_transaction_id === t.id);

      if (t.category_id && groceryCatIds.has(t.category_id)) {
        if (linkedReceipt && linkedReceipt.non_food_amount < 0) {
          const homeAmt = Math.abs(linkedReceipt.non_food_amount);
          const foodAmt = Math.abs(linkedReceipt.food_amount);
          homeGoodsFiltered += homeAmt;
          grocerySpend += foodAmt;
          contributingTransactions.push({
            transaction: t,
            foodSpendMilliunits: foodAmt,
            homeGoodsMilliunits: homeAmt,
            linkedReceipt,
          });
        } else {
          const amt = Math.abs(t.amount);
          grocerySpend += amt;
          contributingTransactions.push({
            transaction: t,
            foodSpendMilliunits: amt,
            homeGoodsMilliunits: 0,
            linkedReceipt,
          });
        }
      } else if (t.category_id && diningCatIds.has(t.category_id)) {
        const amt = Math.abs(t.amount);
        diningSpend += amt;
        contributingTransactions.push({
          transaction: t,
          foodSpendMilliunits: amt,
          homeGoodsMilliunits: 0,
          linkedReceipt,
        });
      }
    }
  });

  // Also include home goods filtered from unlinked receipts this month
  const monthReceipts = receipts.filter((r) => r.date.startsWith(currentMonth));
  monthReceipts.forEach((r) => {
    if (r.status === "unresolved" && r.non_food_amount < 0) {
      homeGoodsFiltered += Math.abs(r.non_food_amount);
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
    (a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime()
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
