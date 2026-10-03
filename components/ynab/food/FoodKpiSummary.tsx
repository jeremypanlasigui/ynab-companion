"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/ynab/utils";
import { TransactionDetail, ReceiptIngestion, Category } from "@/lib/ynab/types";
import { Utensils, ShieldCheck, ShoppingBag, Coffee } from "lucide-react";

interface FoodKpiSummaryProps {
  transactions: TransactionDetail[];
  receipts: ReceiptIngestion[];
  categories: Category[];
  currentMonth: string; // 'YYYY-MM'
}

export function FoodKpiSummary({
  transactions,
  receipts,
  categories,
  currentMonth,
}: FoodKpiSummaryProps) {
  const calculations = useMemo(() => {
    // 1. Find grocery and dining categories
    const groceryCategories = categories.filter((c) => {
      const name = c.name.toLowerCase();
      return name.includes("grocer") || name.includes("supermarket") || name.includes("food");
    });
    const groceryCatIds = new Set(groceryCategories.map((c) => c.id));

    const diningCategories = categories.filter((c) => {
      const name = c.name.toLowerCase();
      return name.includes("dining") || name.includes("restaurant") || name.includes("takeout") || name.includes("coffee");
    });
    const diningCatIds = new Set(diningCategories.map((c) => c.id));

    // 2. Filter transactions for the current month
    const monthTxs = transactions.filter((t) => {
      if (t.deleted) return false;
      return t.date.startsWith(currentMonth);
    });

    let grocerySpend = 0;
    let diningSpend = 0;
    let homeGoodsFiltered = 0;

    monthTxs.forEach((t) => {
      // If transaction has subtransactions (split)
      if (t.subtransactions && t.subtransactions.length > 0) {
        t.subtransactions.forEach((st) => {
          if (st.deleted) return;
          const memoLower = (st.memo || "").toLowerCase();
          const isHomeGoods =
            memoLower.includes("home goods") ||
            memoLower.includes("household") ||
            (st.category_name || "").toLowerCase().includes("home");

          if (isHomeGoods) {
            homeGoodsFiltered += Math.abs(st.amount);
          } else if (st.category_id && groceryCatIds.has(st.category_id)) {
            grocerySpend += Math.abs(st.amount);
          } else if (st.category_id && diningCatIds.has(st.category_id)) {
            diningSpend += Math.abs(st.amount);
          } else if (memoLower.includes("fruit") || memoLower.includes("meat") || memoLower.includes("veggie") || memoLower.includes("snack") || memoLower.includes("dairy")) {
            grocerySpend += Math.abs(st.amount);
          }
        });
      } else {
        // Normal non-split transaction
        if (t.category_id && groceryCatIds.has(t.category_id)) {
          // If a matched receipt exists, take only the pure food amount!
          const linkedReceipt = receipts.find((r) => r.matched_transaction_id === t.id);
          if (linkedReceipt && linkedReceipt.non_food_amount < 0) {
            homeGoodsFiltered += Math.abs(linkedReceipt.non_food_amount);
            grocerySpend += Math.abs(linkedReceipt.food_amount);
          } else {
            grocerySpend += Math.abs(t.amount);
          }
        } else if (t.category_id && diningCatIds.has(t.category_id)) {
          diningSpend += Math.abs(t.amount);
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

    // Budgeted food target
    let budgetedFood = 0;
    groceryCategories.forEach((c) => (budgetedFood += c.budgeted || 0));
    diningCategories.forEach((c) => (budgetedFood += c.budgeted || 0));

    const percentUsed = budgetedFood > 0 ? Math.round((totalFoodSpend / budgetedFood) * 100) : 0;

    return {
      totalFoodSpend,
      grocerySpend,
      diningSpend,
      homeGoodsFiltered,
      budgetedFood,
      percentUsed,
    };
  }, [transactions, receipts, categories, currentMonth]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Food Spend */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400">Total Food Spend</span>
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-white tracking-tight">
          {formatCurrency(-calculations.totalFoodSpend)}
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          Groceries + Dining out (excl. home goods)
        </p>
      </div>

      {/* 2. Non-Food Home Goods Filtered Out */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400">Home Goods Filtered</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-emerald-400 tracking-tight">
          {formatCurrency(calculations.homeGoodsFiltered)}
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          Household supplies separated from food budget
        </p>
      </div>

      {/* 3. Grocery vs Dining Split */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400">Grocery vs Dining</span>
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-zinc-100">
            {formatCurrency(-calculations.grocerySpend, { hideDecimals: true })}
          </span>
          <span className="text-xs text-zinc-500">/</span>
          <span className="font-mono text-sm font-semibold text-amber-300">
            {formatCurrency(-calculations.diningSpend, { hideDecimals: true })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span> Groceries
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Dining
          </span>
        </div>
      </div>

      {/* 4. Food Budget Progress */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400">Food Budget Target</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Coffee className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-2xl font-black text-white tracking-tight">
            {calculations.percentUsed}%
          </div>
          <span className="font-mono text-xs text-zinc-400">
            of {formatCurrency(calculations.budgetedFood, { hideDecimals: true })}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              calculations.percentUsed > 100
                ? "bg-rose-500"
                : calculations.percentUsed > 80
                ? "bg-amber-400"
                : "bg-teal-400"
            }`}
            style={{ width: `${Math.min(calculations.percentUsed, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
