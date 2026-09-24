"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Category } from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  Search,
  Check,
  Sparkles,
  RotateCcw,
  TrendingUp,
  Tag,
  DollarSign,
} from "lucide-react";

interface ConfigureIncomeCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryIds: Set<string>;
  categoryInflowsThisMonth: Map<string, number>;
  onSave: (newSelectedIds: Set<string>) => void;
}

export function ConfigureIncomeCategoriesModal({
  isOpen,
  onClose,
  categories,
  selectedCategoryIds,
  categoryInflowsThisMonth,
  onSave,
}: ConfigureIncomeCategoriesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(selectedCategoryIds));
      setSearchQuery("");
    }
  }, [isOpen, selectedCategoryIds]);

  // Ensure "Inflow: Ready to Assign" is represented as an option even if not in standard category groups
  const allAvailableCategories = useMemo(() => {
    const list = [...categories.filter((c) => !c.deleted && !c.hidden)];
    const hasInflowCategory = list.some(
      (c) =>
        c.id === "inflow:ready-to-assign" ||
        c.name.toLowerCase().includes("ready to assign")
    );

    if (!hasInflowCategory) {
      list.unshift({
        id: "inflow:ready-to-assign",
        name: "Inflow: Ready to Assign",
        category_group_name: "Internal Master Category",
        hidden: false,
        deleted: false,
        budgeted: 0,
        activity: 0,
        balance: 0,
      } as Category);
    }

    return list;
  }, [categories]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return allAvailableCategories;
    const q = searchQuery.toLowerCase();
    return allAvailableCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.category_group_name && c.category_group_name.toLowerCase().includes(q))
    );
  }, [allAvailableCategories, searchQuery]);

  // Group filtered categories by category group
  const groupedCategories = useMemo(() => {
    const groupsMap = new Map<string, Category[]>();
    for (const cat of filteredCategories) {
      const group = cat.category_group_name || "General Categories";
      if (!groupsMap.has(group)) {
        groupsMap.set(group, []);
      }
      groupsMap.get(group)!.push(cat);
    }
    return Array.from(groupsMap.entries());
  }, [filteredCategories]);

  // Toggle single category selection
  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Preset: automatically select typical income/inflow categories
  const handleAutoSelectInflows = () => {
    const autoSelected = new Set<string>();
    for (const cat of allAvailableCategories) {
      const name = cat.name.toLowerCase();
      const group = (cat.category_group_name || "").toLowerCase();
      const inflowThisMonth = categoryInflowsThisMonth.get(cat.id) || 0;

      if (
        name.includes("inflow") ||
        name.includes("ready to assign") ||
        name.includes("income") ||
        name.includes("salary") ||
        name.includes("payroll") ||
        name.includes("consulting") ||
        name.includes("freelance") ||
        group.includes("income") ||
        group.includes("inflow") ||
        inflowThisMonth > 0
      ) {
        autoSelected.add(cat.id);
      }
    }
    setSelected(autoSelected);
  };

  const handleClearAll = () => {
    setSelected(new Set());
  };

  // Calculate live preview of total income based on current selections
  const previewTotalIncome = useMemo(() => {
    let sum = 0;
    for (const id of selected) {
      const inflow = categoryInflowsThisMonth.get(id) || 0;
      if (inflow > 0) {
        sum += inflow;
      }
    }
    return sum;
  }, [selected, categoryInflowsThisMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selected);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Income Categories"
      description="Select the categories that define your Income. Positive inflows to these categories will be summed into your total income and separated from spending."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoSelectInflows}
              title="Automatically select categories with inflows, salary, or income keywords"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:border-emerald-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Select Inflows</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Live Selection Summary Ribbon */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-300 font-medium">
              Selected: <strong className="text-white">{selected.size}</strong>{" "}
              {selected.size === 1 ? "category" : "categories"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-zinc-400 text-[11px] mr-1.5">This Month&apos;s Income:</span>
            <span className="font-extrabold font-mono text-emerald-400 text-sm">
              {formatCurrency(previewTotalIncome)}
            </span>
          </div>
        </div>

        {/* Categories Grouped Checkbox List */}
        <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
          {groupedCategories.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No categories match your search.
            </div>
          ) : (
            groupedCategories.map(([groupName, groupCats]) => (
              <div key={groupName} className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                  {groupName}
                </span>

                <div className="space-y-1">
                  {groupCats.map((cat) => {
                    const isChecked = selected.has(cat.id);
                    const monthInflow = categoryInflowsThisMonth.get(cat.id) || 0;

                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-emerald-950/20 border-emerald-800/50 text-white"
                            : "bg-zinc-900/60 border-zinc-800/70 hover:border-zinc-700 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(cat.id)}
                            className="w-4 h-4 rounded-md border-zinc-700 text-emerald-500 focus:ring-emerald-500/20 bg-zinc-950 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate">
                              {cat.name}
                            </span>
                            {cat.category_group_name && (
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {cat.category_group_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {monthInflow > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono text-xs font-semibold">
                            <span>+{formatCurrency(monthInflow)}</span>
                            <span className="text-[10px] text-emerald-400/80 font-sans font-normal">
                              inflow
                            </span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-md shadow-emerald-500/10"
          >
            <Check className="w-4 h-4" />
            <span>Save Income Categories</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
