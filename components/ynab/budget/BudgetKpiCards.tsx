"use client";

import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { formatCurrency } from "@/lib/ynab/utils";
import { IncomeCategoryBreakdown, IncomePayeeBreakdown } from "./types";

interface BudgetKpiCardsProps {
  totalMonthIncome: number;
  totalSpending: number;
  totalBudgeted: number;
  netCashflow: number;
  savingsRate: number | null;
  incomeCategoryBreakdown: IncomeCategoryBreakdown[];
  incomePayeeBreakdown: IncomePayeeBreakdown[];
}

export function BudgetKpiCards({
  totalMonthIncome,
  totalSpending,
  totalBudgeted,
  netCashflow,
  savingsRate,
  incomeCategoryBreakdown,
  incomePayeeBreakdown,
}: BudgetKpiCardsProps) {
  const totalInflowCount = incomeCategoryBreakdown.reduce(
    (acc, c) => acc + c.transactionCount,
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Month Income */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>Total Month Income</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
          {formatCurrency(totalMonthIncome)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          {totalInflowCount} inflow {totalInflowCount === 1 ? "deposit" : "deposits"} •{" "}
          {incomePayeeBreakdown.length}{" "}
          {incomePayeeBreakdown.length === 1 ? "payee" : "payees"}
        </p>
      </div>

      {/* Total Spending */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>Total Month Spending</span>
          <TrendingDown className="w-4 h-4 text-rose-400" />
        </div>
        <div className="text-2xl font-extrabold text-white mt-2 font-mono">
          {formatCurrency(totalSpending)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Actual outflows from API
        </p>
      </div>

      {/* Net Cash Flow */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>Net Cash Flow</span>
          <Wallet
            className={`w-4 h-4 ${
              netCashflow >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          />
        </div>
        <div
          className={`text-2xl font-extrabold mt-2 font-mono ${
            netCashflow >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatCurrency(netCashflow, { showSign: true })}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          {savingsRate !== null
            ? `${savingsRate}% savings rate`
            : "Income minus spending"}
        </p>
      </div>

      {/* Total Budgeted */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>Total Budgeted</span>
          <Target className="w-4 h-4 text-teal-400" />
        </div>
        <div className="text-2xl font-extrabold text-white mt-2 font-mono">
          {formatCurrency(totalBudgeted)}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Planned funds in local Budget
        </p>
      </div>
    </div>
  );
}
