"use client";

import { useBudgetSummary } from "@/lib/ynab/hooks";
import { formatCurrency, getMonthPacing } from "@/lib/ynab/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DollarSign, TrendingDown, Wallet, Calendar } from "lucide-react";

export function BudgetSummaryCard() {
  const { totalBudgeted, totalSpent, totalRemaining, spendingPercentage } = useBudgetSummary();
  const { currentDay, totalDays, daysRemaining, percentageElapsed } = getMonthPacing();

  const isOverspent = totalRemaining < 0;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-linear-to-b from-zinc-900/90 to-zinc-950 p-6 shadow-xl backdrop-blur-md">
      {/* Month & Pacing Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-teal-400">
            Monthly Budget Overview
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>
            Day {currentDay} of {totalDays} ({daysRemaining} days left)
          </span>
        </div>
      </div>

      {/* 3 Core Stats from README */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {/* Total Budgeted */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Wallet className="w-3.5 h-3.5 text-teal-400" />
            Total Budgeted
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {formatCurrency(totalBudgeted)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Assigned this month</p>
        </div>

        {/* Total Spent */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            Total Spent
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {formatCurrency(totalSpent)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {spendingPercentage}% of budget spent
          </p>
        </div>

        {/* Total Remaining */}
        <div
          className={`p-4 rounded-2xl border ${
            isOverspent
              ? "bg-rose-950/20 border-rose-900/50"
              : "bg-emerald-950/20 border-emerald-900/50"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
            <DollarSign
              className={`w-3.5 h-3.5 ${isOverspent ? "text-rose-400" : "text-emerald-400"}`}
            />
            Total Remaining
          </div>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              isOverspent ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {formatCurrency(totalRemaining)}
          </div>
          <p className="text-[11px] text-zinc-400/80 mt-0.5">
            {isOverspent ? "Over budget" : "Left to spend"}
          </p>
        </div>
      </div>

      {/* Visual Mint-style Progress Bar with month pacing indicator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-medium text-zinc-300">
          <span>Overall Spending Progress</span>
          <span className="font-mono">{spendingPercentage}%</span>
        </div>
        <ProgressBar
          value={spendingPercentage}
          max={100}
          height="md"
          variant="dynamic"
          showIndicatorLine={percentageElapsed}
        />
        <div className="flex justify-between text-[11px] text-zinc-500 pt-0.5">
          <span>$0.00</span>
          <span className="text-teal-400/90 font-medium">
            Month {percentageElapsed}% elapsed (marker)
          </span>
          <span>{formatCurrency(totalBudgeted)}</span>
        </div>
      </div>
    </div>
  );
}
