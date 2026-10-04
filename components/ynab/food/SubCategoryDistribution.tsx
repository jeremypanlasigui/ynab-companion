"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/ynab/utils";
import { ReceiptIngestion, TransactionDetail, FoodSubCategory } from "@/lib/ynab/types";
import { getSubCategoryBreakdown } from "@/lib/food/food-spend-utils";
import { ChevronRight } from "lucide-react";

interface SubCategoryDistributionProps {
  receipts: ReceiptIngestion[];
  transactions?: TransactionDetail[];
  currentMonth: string; // 'YYYY-MM'
  onSelectCategory?: (category: FoodSubCategory) => void;
}

interface CategoryStat {
  key: FoodSubCategory;
  label: string;
  emoji: string;
  color: string;
  barColor: string;
  totalAmount: number; // milliunits
  itemCount: number;
  percentage: number;
}

const META: Record<
  FoodSubCategory,
  { label: string; emoji: string; color: string; barColor: string }
> = {
  meat: { label: "Meat & Seafood", emoji: "🥩", color: "text-rose-400", barColor: "bg-rose-500" },
  veggies: { label: "Veggies", emoji: "🥦", color: "text-emerald-400", barColor: "bg-emerald-500" },
  fruits: { label: "Fruits", emoji: "🍎", color: "text-amber-400", barColor: "bg-amber-400" },
  dairy: { label: "Dairy & Eggs", emoji: "🧀", color: "text-yellow-300", barColor: "bg-yellow-400" },
  snacks: { label: "Snacks", emoji: "🍿", color: "text-orange-400", barColor: "bg-orange-500" },
  pantry: { label: "Pantry & Staples", emoji: "🥫", color: "text-teal-400", barColor: "bg-teal-500" },
  beverages: { label: "Beverages", emoji: "🥤", color: "text-blue-400", barColor: "bg-blue-500" },
  prepared: { label: "Prepared & Deli", emoji: "🍱", color: "text-indigo-400", barColor: "bg-indigo-500" },
  tax: { label: "Sales Tax", emoji: "🧾", color: "text-slate-300", barColor: "bg-slate-400" },
  "ca crv": { label: "CA CRV (Bottle Deposit)", emoji: "♻️", color: "text-cyan-400", barColor: "bg-cyan-500" },
  "home goods": { label: "Home Goods (Non-Food)", emoji: "🧻", color: "text-zinc-400", barColor: "bg-zinc-600" },
  other: { label: "Other", emoji: "🏷️", color: "text-zinc-300", barColor: "bg-zinc-500" },
};

export function SubCategoryDistribution({
  receipts,
  transactions = [],
  currentMonth,
  onSelectCategory,
}: SubCategoryDistributionProps) {
  const stats = useMemo(() => {
    let grandTotalFood = 0;

    const list: CategoryStat[] = (Object.keys(META) as FoodSubCategory[])
      .map((catKey) => {
        const data = getSubCategoryBreakdown(
          catKey,
          receipts,
          transactions,
          currentMonth,
          0
        );
        const info = META[catKey];
        return {
          key: catKey,
          label: info.label,
          emoji: info.emoji,
          color: info.color,
          barColor: info.barColor,
          totalAmount: data.totalAmount,
          itemCount: data.itemCount,
          percentage: 0,
        };
      })
      .filter((s) => s.totalAmount > 0);

    list.forEach((s) => {
      if (s.key !== "home goods") {
        grandTotalFood += s.totalAmount;
      }
    });

    list.forEach((s) => {
      s.percentage =
        grandTotalFood > 0 && s.key !== "home goods"
          ? Math.round((s.totalAmount / grandTotalFood) * 100)
          : 0;
    });

    list.sort((a, b) => b.totalAmount - a.totalAmount);
    return { result: list, grandTotalFood };
  }, [receipts, transactions, currentMonth]);

  if (stats.result.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 text-center backdrop-blur-xs">
        <span className="text-3xl block mb-2">🥗</span>
        <h3 className="text-sm font-bold text-white">No Food Subcategory Data Yet</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Ingest a receipt or load sample data to see how your food spending breaks down into meat, fruits, veggies, snacks, and home goods!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Sub-Category Spending Breakdown</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-300">
              {stats.result.length} categories
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click into any category to view individual items and store runs
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-400 block">Total Itemized Food</span>
          <span className="font-mono text-base font-extrabold text-teal-400">
            {formatCurrency(-stats.grandTotalFood)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.result.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => onSelectCategory?.(stat.key)}
            className="w-full text-left p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 hover:border-teal-500/50 hover:bg-zinc-900/60 transition-all group cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-1 focus:ring-teal-500/50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg group-hover:scale-110 transition-transform">{stat.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-teal-300 transition-colors block">
                      {stat.label}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-teal-400 font-medium transition-opacity flex items-center">
                      Details <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {stat.itemCount} {stat.itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-white block group-hover:text-teal-200 transition-colors">
                  {formatCurrency(-stat.totalAmount)}
                </span>
                {stat.key !== "home goods" ? (
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {stat.percentage}% of food
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400/90">
                    Non-food filtered
                  </span>
                )}
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${stat.barColor} transition-all duration-500`}
                style={{
                  width: `${stat.key === "home goods" ? 100 : Math.min(stat.percentage, 100)}%`,
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
