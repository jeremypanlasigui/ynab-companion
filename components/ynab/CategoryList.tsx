"use client";

import { useState } from "react";
import { useYNABData } from "@/lib/ynab/hooks";
import { formatCurrency, calculateBudgetStatus } from "@/lib/ynab/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SetBudgetModal } from "./SetBudgetModal";
import { AddTransactionModal } from "./AddTransactionModal";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CategoryListProps {
  searchQuery?: string;
}

export function CategoryList({ searchQuery = "" }: CategoryListProps) {
  const { categories, categoryGroups } = useYNABData();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [addingForCategoryId, setAddingForCategoryId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {categoryGroups.map((group) => {
        const groupCategories = filteredCategories.filter(
          (c) => c.category_group_id === group.id
        );

        if (groupCategories.length === 0) return null;

        const isCollapsed = !!collapsedGroups[group.id];

        // Group-level totals
        const groupBudgeted = groupCategories.reduce((acc, c) => acc + (c.budgeted || 0), 0);
        const groupSpent = groupCategories.reduce(
          (acc, c) => acc + Math.abs(Math.min(0, c.activity || 0)),
          0
        );
        const groupRemaining = groupBudgeted - groupSpent;

        return (
          <div
            key={group.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden backdrop-blur-xs transition-all duration-200"
          >
            {/* Group Header Accordion */}
            <div
              onClick={() => toggleGroup(group.id)}
              className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/90 hover:bg-zinc-800/60 cursor-pointer select-none border-b border-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
                <span className="font-semibold text-white text-sm tracking-tight">
                  {group.name}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  ({groupCategories.length})
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-zinc-400 hidden sm:inline">
                  Spent: <span className="text-zinc-200 font-semibold">{formatCurrency(groupSpent)}</span>
                </span>
                <span className="text-zinc-400">
                  Remaining:{" "}
                  <span
                    className={`font-semibold ${
                      groupRemaining >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(groupRemaining)}
                  </span>
                </span>
              </div>
            </div>

            {/* Categories List */}
            {!isCollapsed && (
              <div className="divide-y divide-zinc-800/50">
                {groupCategories.map((category) => {
                  const { spent, remaining, percentage, status } = calculateBudgetStatus(
                    category.budgeted,
                    category.activity
                  );

                  return (
                    <div
                      key={category.id}
                      className="p-4 hover:bg-zinc-800/30 transition-colors group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Left: Category name and status icon */}
                        <div className="flex items-center gap-2">
                          {status === "danger" ? (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-teal-500/70 shrink-0" />
                          )}
                          <div>
                            <span className="font-medium text-white text-sm group-hover:text-teal-300 transition-colors">
                              {category.name}
                            </span>
                            <div className="text-xs text-zinc-400 sm:hidden mt-0.5">
                              {formatCurrency(spent)} of {formatCurrency(category.budgeted)}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amounts and quick edit buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                          <div className="text-right hidden sm:block">
                            <div className="text-zinc-300 font-mono font-medium">
                              {formatCurrency(spent)}{" "}
                              <span className="text-zinc-500">of {formatCurrency(category.budgeted)}</span>
                            </div>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <div
                              className={`font-mono font-bold text-sm ${
                                remaining >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(remaining)}
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                              {remaining >= 0 ? "left" : "over"}
                            </span>
                          </div>

                          {/* Quick action buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingCategoryId(category.id)}
                              title="Edit monthly budget"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAddingForCategoryId(category.id)}
                              title="Add transaction in this category"
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-teal-400 hover:text-teal-300 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5">
                        <ProgressBar
                          value={percentage}
                          max={100}
                          height="sm"
                          variant="dynamic"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {editingCategoryId && (
        <SetBudgetModal
          isOpen={true}
          categoryId={editingCategoryId}
          onClose={() => setEditingCategoryId(null)}
        />
      )}

      {addingForCategoryId && (
        <AddTransactionModal
          isOpen={true}
          defaultCategoryId={addingForCategoryId}
          onClose={() => setAddingForCategoryId(null)}
        />
      )}
    </div>
  );
}
