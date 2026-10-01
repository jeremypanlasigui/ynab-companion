"use client";

import { useState } from "react";
import {
  TrendingUp,
  SlidersHorizontal,
  Coins,
  Tag,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/ynab/utils";
import { IncomeCategoryBreakdown, IncomePayeeBreakdown } from "./types";

interface IncomeBreakdownSectionProps {
  totalMonthIncome: number;
  netCashflow: number;
  savingsRate: number | null;
  incomeCategoryBreakdown: IncomeCategoryBreakdown[];
  incomePayeeBreakdown: IncomePayeeBreakdown[];
  selectedIncomeCategoryIds: Set<string>;
  formattedMonthLabel: string;
  onOpenIncomeConfig: () => void;
}

export function IncomeBreakdownSection({
  totalMonthIncome,
  netCashflow,
  savingsRate,
  incomeCategoryBreakdown,
  incomePayeeBreakdown,
  selectedIncomeCategoryIds,
  formattedMonthLabel,
  onOpenIncomeConfig,
}: IncomeBreakdownSectionProps) {
  const [expandedIncomeCatId, setExpandedIncomeCatId] = useState<string | null>(null);
  const [expandedIncomePayee, setExpandedIncomePayee] = useState<string | null>(null);
  const [incomeBreakdownView, setIncomeBreakdownView] = useState<"both" | "category" | "payee">("both");

  const totalInflowCount = incomeCategoryBreakdown.reduce(
    (acc, c) => acc + c.transactionCount,
    0
  );

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">Income</h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                {selectedIncomeCategoryIds.size}{" "}
                {selectedIncomeCategoryIds.size === 1
                  ? "category configured"
                  : "categories configured"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sum of all inflows across your configured income categories •{" "}
              <span className="text-zinc-500">Separated from expense spending</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Configure Categories Button */}
          <button
            type="button"
            onClick={onOpenIncomeConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-colors shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Select Categories</span>
          </button>

          {/* Total Income Display */}
          <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Total Income:</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {formatCurrency(totalMonthIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Income Breakdown & Stats */}
      {selectedIncomeCategoryIds.size === 0 ? (
        <div className="text-center py-10 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
          <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-300">
            No income categories configured
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
            Select which categories should be summed up to equal your income (such as Salary, Inflow: Ready to Assign, Side Hustle, etc.).
          </p>
          <button
            type="button"
            onClick={onOpenIncomeConfig}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configure Income Categories</span>
          </button>
        </div>
      ) : incomeCategoryBreakdown.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
          <Coins className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-300">
            No income recorded for {formattedMonthLabel}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            No deposits or inflows found across your {selectedIncomeCategoryIds.size} configured income categories.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cashflow Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 font-medium block">
                Total Income Earned
              </span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5 block">
                {formatCurrency(totalMonthIncome)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 font-medium block">
                Net Cashflow (Income − Spending)
              </span>
              <span
                className={`text-lg font-extrabold font-mono mt-0.5 block ${
                  netCashflow >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(netCashflow, { showSign: true })}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 font-medium block">
                Savings Rate
              </span>
              <span className="text-lg font-extrabold text-teal-300 font-mono mt-0.5 block">
                {savingsRate !== null ? `${savingsRate}%` : "N/A"}
              </span>
            </div>
          </div>

          {/* Breakdown Controls / View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
              <button
                type="button"
                onClick={() => setIncomeBreakdownView("both")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  incomeBreakdownView === "both"
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Side-by-Side View
              </button>
              <button
                type="button"
                onClick={() => setIncomeBreakdownView("category")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  incomeBreakdownView === "category"
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>By Category</span>
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-700/60 text-[10px] text-zinc-300">
                  {incomeCategoryBreakdown.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIncomeBreakdownView("payee")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  incomeBreakdownView === "payee"
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>By Payee</span>
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-700/60 text-[10px] text-zinc-300">
                  {incomePayeeBreakdown.length}
                </span>
              </button>
            </div>

            <span className="text-xs text-zinc-400">
              {incomePayeeBreakdown.length}{" "}
              {incomePayeeBreakdown.length === 1 ? "income source" : "income sources"} •{" "}
              {totalInflowCount} total deposits
            </span>
          </div>

          {/* Income Breakdowns Grid */}
          <div
            className={`grid gap-5 ${
              incomeBreakdownView === "both"
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {/* Category Breakdown Column */}
            {(incomeBreakdownView === "both" || incomeBreakdownView === "category") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Category Breakdown
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {incomeCategoryBreakdown.length}{" "}
                    {incomeCategoryBreakdown.length === 1 ? "category" : "categories"}
                  </span>
                </div>

                <div className="space-y-3">
                  {incomeCategoryBreakdown.map((item) => {
                    const isExpanded = expandedIncomeCatId === item.categoryId;

                    return (
                      <div
                        key={item.categoryId}
                        className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Category Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">
                                {item.categoryName}
                              </span>
                              {item.categoryGroupName && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                  {item.categoryGroupName}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                                {item.percentageOfTotal}% of income
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {item.transactionCount}{" "}
                              {item.transactionCount === 1 ? "deposit" : "deposits"} recorded
                            </p>
                          </div>

                          {/* Amount & Expand Toggle */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                            <div className="text-right">
                              <div className="text-lg font-extrabold text-emerald-400 font-mono">
                                +{formatCurrency(item.totalIncome)}
                              </div>
                              <span className="text-[10px] text-zinc-500 block">
                                Net Income
                              </span>
                            </div>

                            {item.transactions.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIncomeCatId(isExpanded ? null : item.categoryId)
                                }
                                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                title={isExpanded ? "Collapse transactions" : "View transactions"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar for Share of Income */}
                        <div className="w-full">
                          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                              style={{ width: `${Math.min(100, item.percentageOfTotal)}%` }}
                            />
                          </div>
                        </div>

                        {/* Expanded Transactions List */}
                        {isExpanded && item.transactions.length > 0 && (
                          <div className="pt-3 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
                            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                              Deposits &amp; Inflow Transactions
                            </span>
                            <div className="space-y-1.5">
                              {item.transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
                                >
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-white truncate">
                                        {tx.payeeName}
                                      </span>
                                      <span className="text-zinc-500">•</span>
                                      <span className="text-zinc-400">{tx.accountName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                      <span>{formatDate(tx.date)}</span>
                                      {tx.memo && (
                                        <>
                                          <span>•</span>
                                          <span className="italic text-zinc-400 truncate">
                                            &quot;{tx.memo}&quot;
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold font-mono text-emerald-400">
                                      +{formatCurrency(tx.amount)}
                                    </span>
                                    {tx.cleared && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          tx.cleared === "cleared"
                                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                                            : "bg-zinc-800 text-zinc-400"
                                        }`}
                                      >
                                        {tx.cleared}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payee Breakdown Column */}
            {(incomeBreakdownView === "both" || incomeBreakdownView === "payee") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Payee Breakdown
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {incomePayeeBreakdown.length}{" "}
                    {incomePayeeBreakdown.length === 1 ? "payee" : "payees"}
                  </span>
                </div>

                {incomePayeeBreakdown.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-zinc-800/60 bg-zinc-950/20 text-xs text-zinc-500">
                    No payees recorded for this month
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomePayeeBreakdown.map((item) => {
                      const isExpanded = expandedIncomePayee === item.payeeName;

                      return (
                        <div
                          key={item.payeeName}
                          className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Payee Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                  {item.payeeName}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950/40 text-teal-300 border border-teal-800/40">
                                  {item.percentageOfTotal}% of income
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                                <span>
                                  {item.transactionCount}{" "}
                                  {item.transactionCount === 1 ? "deposit" : "deposits"}
                                </span>
                                {item.categories.length > 0 && (
                                  <>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-500">Categories:</span>
                                    {item.categories.map((cat) => (
                                      <span
                                        key={cat.categoryId}
                                        className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                                      >
                                        {cat.categoryName}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Amount & Expand Toggle */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                              <div className="text-right">
                                <div className="text-lg font-extrabold text-teal-400 font-mono">
                                  +{formatCurrency(item.totalIncome)}
                                </div>
                                <span className="text-[10px] text-zinc-500 block">
                                  Total from Payee
                                </span>
                              </div>

                              {item.transactions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIncomePayee(
                                      isExpanded ? null : item.payeeName
                                    )
                                  }
                                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                  title={
                                    isExpanded
                                      ? "Collapse transactions"
                                      : "View transactions"
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar for Share of Income */}
                          <div className="w-full">
                            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, item.percentageOfTotal)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Expanded Transactions List for this Payee */}
                          {isExpanded && item.transactions.length > 0 && (
                            <div className="pt-3 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
                              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                Deposits from {item.payeeName}
                              </span>
                              <div className="space-y-1.5">
                                {item.transactions.map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-white truncate">
                                          {tx.categoryName || "Inflow"}
                                        </span>
                                        <span className="text-zinc-500">•</span>
                                        <span className="text-zinc-400">{tx.accountName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                        <span>{formatDate(tx.date)}</span>
                                        {tx.memo && (
                                          <>
                                            <span>•</span>
                                            <span className="italic text-zinc-400 truncate">
                                              &quot;{tx.memo}&quot;
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-bold font-mono text-teal-400">
                                        +{formatCurrency(tx.amount)}
                                      </span>
                                      {tx.cleared && (
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            tx.cleared === "cleared"
                                              ? "bg-teal-950/40 text-teal-400 border border-teal-800/40"
                                              : "bg-zinc-800 text-zinc-400"
                                          }`}
                                        >
                                          {tx.cleared}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
