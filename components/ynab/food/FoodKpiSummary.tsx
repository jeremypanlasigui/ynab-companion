"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/ynab/utils";
import { TransactionDetail, ReceiptIngestion, Category } from "@/lib/ynab/types";
import { calculateFoodSpend } from "@/lib/food/food-spend-utils";
import { Utensils, ShieldCheck, ShoppingBag, Coffee, ArrowUpRight } from "lucide-react";

interface FoodKpiSummaryProps {
  transactions: TransactionDetail[];
  receipts: ReceiptIngestion[];
  categories: Category[];
  currentMonth: string; // 'YYYY-MM'
  onOpenBreakdown?: () => void;
}

export function FoodKpiSummary({
  transactions,
  receipts,
  categories,
  currentMonth,
  onOpenBreakdown,
}: FoodKpiSummaryProps) {
  const calculations = useMemo(() => {
    return calculateFoodSpend(transactions, receipts, categories, currentMonth);
  }, [transactions, receipts, categories, currentMonth]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Food Spend (Clickable for drill-down breakdown) */}
      <div
        onClick={onOpenBreakdown}
        role={onOpenBreakdown ? "button" : undefined}
        tabIndex={onOpenBreakdown ? 0 : undefined}
        onKeyDown={(e) => {
          if (onOpenBreakdown && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpenBreakdown();
          }
        }}
        className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs transition-all ${
          onOpenBreakdown
            ? "cursor-pointer hover:border-teal-500/60 hover:bg-zinc-900/90 hover:shadow-lg hover:shadow-teal-500/10 group focus:outline-none focus:ring-1 focus:ring-teal-500"
            : "hover:border-zinc-700/80"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
              Total Food Spend
            </span>
            {onOpenBreakdown && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-teal-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
            <Utensils className="w-4 h-4" />
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-white tracking-tight group-hover:text-teal-300 transition-colors">
          {formatCurrency(-calculations.totalFoodSpend)}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
          <span>Groceries + Dining out</span>
          {onOpenBreakdown && (
            <span className="text-[10px] font-semibold text-teal-400/80 group-hover:text-teal-300 transition-colors">
              Inspect & adjust &rarr;
            </span>
          )}
        </div>
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
