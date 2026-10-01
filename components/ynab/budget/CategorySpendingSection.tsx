"use client";

import { useState } from "react";
import {
  Search,
  Wand2,
  Edit3,
  Receipt,
  Check,
  X,
  Equal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency, formatDate, milliunitsToNumber, numberToMilliunits } from "@/lib/ynab/utils";
import { CategorySpendingSummary } from "./types";

interface CategorySpendingSectionProps {
  filteredCategories: CategorySpendingSummary[];
  categoryList: CategorySpendingSummary[];
  formattedMonthLabel: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  isMatchingSpent: boolean;
  matchSuccess: boolean;
  onMatchAllToSpent: () => void;
  onMatchCategoryToSpent: (categoryId: string, amount: number) => void;
  onOpenEditModal: () => void;
  onSaveInline: (categoryId: string, amount: number) => Promise<void>;
}

export function CategorySpendingSection({
  filteredCategories,
  categoryList,
  formattedMonthLabel,
  searchQuery,
  onSearchChange,
  isLoading,
  isMatchingSpent,
  matchSuccess,
  onMatchAllToSpent,
  onMatchCategoryToSpent,
  onOpenEditModal,
  onSaveInline,
}: CategorySpendingSectionProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [inlineEditCatId, setInlineEditCatId] = useState<string | null>(null);
  const [inlineAmountStr, setInlineAmountStr] = useState<string>("");

  const handleInlineSave = async (categoryId: string) => {
    const parsed = parseFloat(inlineAmountStr);
    if (!isNaN(parsed) && parsed >= 0) {
      await onSaveInline(categoryId, numberToMilliunits(parsed));
    }
    setInlineEditCatId(null);
    setInlineAmountStr("");
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Category Spending Progress
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Progress: Spent ÷ Budget
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Progress bars track actual expenses against your locally defined Budget for {formattedMonthLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter categories..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          <button
            onClick={onMatchAllToSpent}
            disabled={isMatchingSpent || categoryList.length === 0}
            title="Update all category budgets to match their current actual spending"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all shrink-0 disabled:opacity-50"
          >
            <Wand2
              className={`w-3.5 h-3.5 text-teal-400 ${
                isMatchingSpent ? "animate-spin" : ""
              }`}
            />
            <span>
              {matchSuccess ? "Budgets Matched!" : "Match Budget to Spent"}
            </span>
          </button>

          <button
            onClick={onOpenEditModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5 text-teal-400" />
            <span>Edit All</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && categoryList.length === 0 && (
        <div className="space-y-3 py-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-zinc-800/40 animate-pulse border border-zinc-800/60"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredCategories.length === 0 && (
        <div className="text-center py-12 px-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
          <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300">
            No categories found
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            There are no categories with spending or budget amounts for {formattedMonthLabel}.
          </p>
        </div>
      )}

      {/* Categories List with Category Spending Progress */}
      <div className="space-y-3">
        {filteredCategories.map((cat) => {
          const isExpanded = expandedCategoryId === cat.categoryId;
          const isEditing = inlineEditCatId === cat.categoryId;
          const isUnbudgeted =
            cat.budgetedAmount === 0 && cat.totalSpent > 0;
          const isOverBudget = cat.remainingAmount < 0;
          const isOverspentOrUnbudgeted = isOverBudget || isUnbudgeted;
          const isPerfect100 =
            cat.budgetedAmount > 0 && cat.totalSpent === cat.budgetedAmount;

          return (
            <div
              key={cat.categoryId}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700 transition-all overflow-hidden"
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Category Details & Spending Progress Bar */}
                <div
                  onClick={() =>
                    !isEditing &&
                    setExpandedCategoryId(isExpanded ? null : cat.categoryId)
                  }
                  className="flex-1 min-w-0 space-y-2 cursor-pointer select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm font-bold text-white truncate">
                        {cat.categoryName}
                      </span>
                      {cat.transactionCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                          {cat.transactionCount}{" "}
                          {cat.transactionCount === 1 ? "tx" : "txs"}
                        </span>
                      )}
                      {isUnbudgeted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                          Unbudgeted
                        </span>
                      )}
                      {isPerfect100 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
                          100% Matched
                        </span>
                      )}
                    </div>

                    {/* Progress percentage */}
                    <span
                      className={`text-xs font-mono shrink-0 ${
                        isOverspentOrUnbudgeted
                          ? "text-rose-400 font-bold"
                          : isPerfect100
                          ? "text-green-400 font-black drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]"
                          : cat.progressPercentage >= 85
                          ? "text-amber-400 font-bold"
                          : "text-zinc-300 font-semibold"
                      }`}
                    >
                      {isUnbudgeted ? ">100%" : `${cat.progressPercentage}%`}
                    </span>
                  </div>

                  {/* Category Spending Progress Bar (Spent ÷ Budget) */}
                  <div className="w-full">
                    <ProgressBar
                      value={isUnbudgeted ? 100 : cat.progressPercentage}
                      max={100}
                      height="sm"
                      variant={isOverspentOrUnbudgeted ? "rose" : "dynamic"}
                    />
                  </div>

                  {/* Subtext info */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                    <span className="truncate pr-2">
                      <strong
                        className={
                          isOverspentOrUnbudgeted
                            ? "text-rose-400 font-bold"
                            : isPerfect100
                            ? "text-green-400 font-bold"
                            : "text-zinc-200"
                        }
                      >
                        {formatCurrency(cat.totalSpent)}
                      </strong>{" "}
                      spent of{" "}
                      <span
                        className={
                          isPerfect100
                            ? "text-green-400 font-semibold"
                            : ""
                        }
                      >
                        {formatCurrency(cat.budgetedAmount)}
                      </span>{" "}
                      budgeted
                    </span>
                    <span
                      className={`shrink-0 ${
                        isOverspentOrUnbudgeted
                          ? "text-rose-400 font-semibold"
                          : isPerfect100
                          ? "text-green-400 font-bold"
                          : "text-zinc-400"
                      }`}
                    >
                      {isOverspentOrUnbudgeted
                        ? `${formatCurrency(Math.abs(cat.remainingAmount))} over`
                        : isPerfect100
                        ? "$0.00 left"
                        : `${formatCurrency(cat.remainingAmount)} left`}
                    </span>
                  </div>
                </div>

                {/* Budget & Actions Column */}
                <div className="w-full sm:w-72 md:w-80 shrink-0 flex items-center justify-between sm:justify-end gap-2.5 sm:pl-5 sm:border-l sm:border-zinc-800/80">
                  {/* Inline Budget Editor */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={inlineAmountStr}
                          onChange={(e) => setInlineAmountStr(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleInlineSave(cat.categoryId);
                            if (e.key === "Escape") setInlineEditCatId(null);
                          }}
                          autoFocus
                          className="w-full pl-6 pr-2 py-1 rounded-lg bg-zinc-950 border border-teal-500 text-xs font-mono text-white focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInlineSave(cat.categoryId)}
                        title="Save budget"
                        className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInlineEditCatId(null)}
                        title="Cancel"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Quick match spent shortcut for this specific category */}
                      {cat.budgetedAmount !== cat.totalSpent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMatchCategoryToSpent(cat.categoryId, cat.totalSpent);
                          }}
                          title={`Match budget to spent: ${formatCurrency(cat.totalSpent)}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-teal-500/10 hover:border-teal-500/30 border border-zinc-700/60 text-[11px] font-medium text-zinc-300 hover:text-teal-300 transition-all shrink-0"
                        >
                          <Equal className="w-3 h-3 text-teal-400" />
                          <span className="hidden xl:inline">Match Spent</span>
                        </button>
                      )}

                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400">Budget:</span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              isOverspentOrUnbudgeted
                                ? "text-rose-400"
                                : isPerfect100
                                ? "text-green-400"
                                : "text-white"
                            }`}
                          >
                            {formatCurrency(cat.budgetedAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInlineEditCatId(cat.categoryId);
                              setInlineAmountStr(
                                String(milliunitsToNumber(cat.budgetedAmount))
                              );
                            }}
                            title="Edit budget amount"
                            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand icon */}
                  <div className="w-6 flex items-center justify-center shrink-0">
                    {cat.transactions.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategoryId(isExpanded ? null : cat.categoryId)
                        }
                        className="text-zinc-500 hover:text-zinc-300 p-1"
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
              </div>

              {/* Expanded Transactions for this Category */}
              {isExpanded && cat.transactions.length > 0 && (
                <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-4 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 pb-1">
                    Transactions in this category ({cat.transactions.length})
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {cat.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="py-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-medium text-zinc-200">
                            {tx.payeeName}
                          </span>
                          {tx.memo && (
                            <span className="text-zinc-500 text-[11px] ml-2 italic">
                              &quot;{tx.memo}&quot;
                            </span>
                          )}
                          <div className="text-[10px] text-zinc-500">
                            {formatDate(tx.date)}
                          </div>
                        </div>
                        <div
                          className={`font-semibold font-mono ${
                            tx.amount < 0 ? "text-zinc-200" : "text-emerald-400"
                          }`}
                        >
                          {formatCurrency(tx.amount, { showSign: true })}
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
  );
}
