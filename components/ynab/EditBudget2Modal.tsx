"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { db } from "@/lib/ynab/db";
import { Budget, Category } from "@/lib/ynab/types";
import { formatCurrency, milliunitsToNumber, numberToMilliunits } from "@/lib/ynab/utils";
import { SlidersHorizontal, DollarSign, Check, RotateCcw, Sparkles } from "lucide-react";

interface EditBudget2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  month: string; // e.g. "2026-09"
  monthLabel: string;
  categories: Category[];
  currentBudget?: Budget;
  onSaved?: () => void;
}

export function EditBudget2Modal({
  isOpen,
  onClose,
  planId,
  month,
  monthLabel,
  categories,
  currentBudget,
  onSaved,
}: EditBudget2ModalProps) {
  // Store form state as mapping from category_id -> string dollar amount
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or re-populate when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const budgetMap = new Map<string, number>();
    if (currentBudget?.categories) {
      for (const item of currentBudget.categories) {
        budgetMap.set(item.category_id, item.amount);
      }
    }

    const initial: Record<string, string> = {};
    for (const cat of categories) {
      if (budgetMap.has(cat.id)) {
        const val = milliunitsToNumber(budgetMap.get(cat.id)!);
        initial[cat.id] = val > 0 ? String(val) : "";
      } else if (cat.budgeted) {
        const val = milliunitsToNumber(cat.budgeted);
        initial[cat.id] = val > 0 ? String(val) : "";
      } else {
        initial[cat.id] = "";
      }
    }
    setAmounts(initial);
  }, [isOpen, currentBudget, categories]);

  const handleAmountChange = (catId: string, val: string) => {
    // Only allow valid numeric / decimal input
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setAmounts((prev) => ({ ...prev, [catId]: val }));
    }
  };

  // Compute live total budgeted
  const totalBudgetedMilliunits = useMemo(() => {
    let sum = 0;
    for (const val of Object.values(amounts)) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        sum += numberToMilliunits(parsed);
      }
    }
    return sum;
  }, [amounts]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const categoryAmounts = categories.map((cat) => {
        const rawStr = amounts[cat.id] || "0";
        const parsed = parseFloat(rawStr);
        const amount = !isNaN(parsed) && parsed > 0 ? numberToMilliunits(parsed) : 0;
        return {
          category_id: cat.id,
          amount,
        };
      });

      const updatedBudget: Budget = {
        id: `${planId}:${month.slice(0, 7)}`,
        plan_id: planId,
        month: month.slice(0, 7),
        categories: categoryAmounts,
        updated_at: new Date().toISOString(),
      };

      await db.saveBudget(updatedBudget);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save budget:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    const empty: Record<string, string> = {};
    for (const cat of categories) {
      empty[cat.id] = "";
    }
    setAmounts(empty);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Budget for ${monthLabel}`}
      description="Define planned category amounts for this specific month & year"
      maxWidth="xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Month & Total Ribbon */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Planned Total
            </span>
            <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
              {formatCurrency(totalBudgetedMilliunits)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>

        {/* Categories Inputs List */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
          {categories.map((cat) => {
            const currentVal = amounts[cat.id] || "";
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-zinc-200 block truncate">
                    {cat.name}
                  </span>
                  {cat.category_group_name && (
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {cat.category_group_name}
                    </span>
                  )}
                </div>

                <div className="relative w-36 shrink-0">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-zinc-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={currentVal}
                    onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs font-mono font-medium text-white placeholder-zinc-600 focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
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
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all disabled:opacity-50 shadow-md shadow-teal-500/10"
          >
            <Check className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
