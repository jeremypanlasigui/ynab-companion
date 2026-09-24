"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { db } from "@/lib/ynab/db";
import { useYNABData, useSyncStatus } from "@/lib/ynab/hooks";
import {
  formatCurrency,
  milliunitsToNumber,
  numberToMilliunits,
} from "@/lib/ynab/utils";
import { Target, Check } from "lucide-react";

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string | null;
}

export function SetBudgetModal({
  isOpen,
  onClose,
  categoryId: initialCategoryId,
}: SetBudgetModalProps) {
  const { categories, categoryGroups } = useYNABData();
  const { sync } = useSyncStatus();

  const [selectedId, setSelectedId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedId(initialCategoryId);
    } else if (categories.length > 0 && !selectedId) {
      setSelectedId(categories[0].id);
    }
  }, [initialCategoryId, categories, selectedId]);

  const activeCategory = categories.find((c) => c.id === selectedId);

  useEffect(() => {
    if (activeCategory) {
      setAmountStr(String(milliunitsToNumber(activeCategory.budgeted || 0)));
    }
  }, [activeCategory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;

    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed < 0) return;

    setIsSubmitting(true);
    try {
      const milliunits = numberToMilliunits(parsed);
      await db.updateCategoryBudget(activeCategory.id, milliunits);
      sync();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSpent = activeCategory ? Math.abs(Math.min(0, activeCategory.activity)) : 0;
  const newBudgetMilli = numberToMilliunits(parseFloat(amountStr) || 0);
  const projectedRemaining = newBudgetMilli - currentSpent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Category Budget"
      description="Adjust your monthly target and see instant budget vs actual comparison"
      maxWidth="sm"
    >
      <form onSubmit={handleSave} className="space-y-4 text-sm">
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Category
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
          >
            {categoryGroups.map((group) => {
              const groupCats = categories.filter((c) => c.category_group_id === group.id);
              if (groupCats.length === 0) return null;
              return (
                <optgroup key={group.id} label={group.name}>
                  {groupCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Current Stats */}
        {activeCategory && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-500 block">Spent This Month</span>
              <span className="font-semibold text-rose-400 text-sm">
                {formatCurrency(currentSpent)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Projected Remaining</span>
              <span
                className={`font-semibold text-sm ${
                  projectedRemaining >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(projectedRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Target Budget Amount */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Budget for This Month
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 font-semibold">
              $
            </div>
            <input
              type="number"
              step="1"
              min="0"
              autoFocus
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-lg font-bold tracking-tight focus:border-teal-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors"
          >
            <Check className="w-4 h-4" />
            Update Budget
          </button>
        </div>
      </form>
    </Modal>
  );
}
