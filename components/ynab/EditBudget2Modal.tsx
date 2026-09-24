"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { db } from "@/lib/ynab/db";
import { Budget, Category } from "@/lib/ynab/types";
import { formatCurrency, milliunitsToNumber, numberToMilliunits } from "@/lib/ynab/utils";
import {
  SlidersHorizontal,
  DollarSign,
  Check,
  RotateCcw,
  Sparkles,
  Copy,
  Calendar,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Tag,
} from "lucide-react";

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

function formatMonthLabel(monthKey: string): string {
  try {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return monthKey;
  }
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
  // Ordered list of category IDs currently in this budget
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  // Store form state as mapping from category_id -> string dollar amount
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // "Add Category" input states
  const [selectedAddCatId, setSelectedAddCatId] = useState<string>("");
  const [addAmountStr, setAddAmountStr] = useState<string>("");

  // "Copy from month" states
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedCopyMonth, setSelectedCopyMonth] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);
  const [copyStatusMsg, setCopyStatusMsg] = useState<string | null>(null);
  const [savedMonths, setSavedMonths] = useState<string[]>([]);

  // Fetch all saved budget months for this plan to provide in dropdown
  useEffect(() => {
    if (!isOpen || !planId) return;
    db.budgets
      .where("plan_id")
      .equals(planId)
      .toArray()
      .then((records) => {
        const months = records.map((r) => r.month).filter(Boolean);
        setSavedMonths(months);
      })
      .catch((err) => console.error("Error reading saved budget months:", err));
  }, [isOpen, planId]);

  // Compute month options for copying (defaulting to previous month)
  const monthOptions = useMemo(() => {
    const [currY, currM] = month.slice(0, 7).split("-").map(Number);
    if (isNaN(currY) || isNaN(currM)) return [];

    const optionsMap = new Map<string, string>();
    const prevDate = new Date(currY, currM - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevLabel = prevDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Option 1: Previous month (explicit default)
    optionsMap.set(prevKey, `${prevLabel} (Previous Month)`);

    // Next, the past 12 months
    for (let i = 2; i <= 12; i++) {
      const d = new Date(currY, currM - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!optionsMap.has(key)) {
        const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        optionsMap.set(key, label);
      }
    }

    // Also include any saved months in db.budgets
    for (const sm of savedMonths) {
      if (sm !== month.slice(0, 7) && !optionsMap.has(sm)) {
        optionsMap.set(sm, `${formatMonthLabel(sm)} (Saved)`);
      }
    }

    return Array.from(optionsMap.entries()).map(([key, label]) => ({ key, label }));
  }, [month, savedMonths]);

  // List of categories that are NOT yet in this budget
  const availableToAdd = useMemo(() => {
    const existingSet = new Set(categoryIds);
    return categories
      .filter((c) => !c.deleted && !c.hidden && !existingSet.has(c.id))
      .sort((a, b) => {
        const groupA = a.category_group_name || "";
        const groupB = b.category_group_name || "";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.name.localeCompare(b.name);
      });
  }, [categories, categoryIds]);

  // Initialize or re-populate when modal opens: ONLY show existing category-amount pairs
  useEffect(() => {
    if (!isOpen) return;

    // Reset copy widget state & add inputs
    setIsCopyOpen(false);
    setCopyStatusMsg(null);
    setSelectedAddCatId("");
    setAddAmountStr("");

    // Default selected copy month to previous month
    const [currY, currM] = month.slice(0, 7).split("-").map(Number);
    if (!isNaN(currY) && !isNaN(currM)) {
      const prevDate = new Date(currY, currM - 2, 1);
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      setSelectedCopyMonth(prevKey);
    }

    // Only populate existing category-amount pairs from the current budget
    if (currentBudget?.categories && currentBudget.categories.length > 0) {
      const initialIds: string[] = [];
      const initialAmounts: Record<string, string> = {};
      for (const item of currentBudget.categories) {
        initialIds.push(item.category_id);
        const val = milliunitsToNumber(item.amount);
        initialAmounts[item.category_id] = val > 0 ? String(val) : "";
      }
      setCategoryIds(initialIds);
      setAmounts(initialAmounts);
    } else {
      // Default for new or empty monthly budget: 0 pairs
      setCategoryIds([]);
      setAmounts({});
    }
  }, [isOpen, currentBudget, month]);

  const handleAmountChange = (catId: string, val: string) => {
    // Only allow valid numeric / decimal input
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setAmounts((prev) => ({ ...prev, [catId]: val }));
    }
  };

  const handleAddCategory = () => {
    if (!selectedAddCatId) return;
    setCategoryIds((prev) => [...prev, selectedAddCatId]);
    setAmounts((prev) => ({
      ...prev,
      [selectedAddCatId]: addAmountStr,
    }));
    setSelectedAddCatId("");
    setAddAmountStr("");
  };

  const handleRemoveCategory = (catId: string) => {
    setCategoryIds((prev) => prev.filter((id) => id !== catId));
    setAmounts((prev) => {
      const copy = { ...prev };
      delete copy[catId];
      return copy;
    });
  };

  // Compute live total budgeted
  const totalBudgetedMilliunits = useMemo(() => {
    let sum = 0;
    for (const catId of categoryIds) {
      const val = amounts[catId];
      if (!val) continue;
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        sum += numberToMilliunits(parsed);
      }
    }
    return sum;
  }, [categoryIds, amounts]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Only save existing category-amount pairs
      const categoryAmounts = categoryIds.map((catId) => {
        const rawStr = amounts[catId] || "0";
        const parsed = parseFloat(rawStr);
        const amount = !isNaN(parsed) && parsed > 0 ? numberToMilliunits(parsed) : 0;
        return {
          category_id: catId,
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
    setCategoryIds([]);
    setAmounts({});
  };

  const handleAutofillFromYNAB = () => {
    // Only add categories that have standard budgeted amounts in YNAB
    const catsWithBudget = categories.filter((c) => (c.budgeted || 0) > 0);
    const newCatIds: string[] = [];
    const filled: Record<string, string> = {};

    for (const cat of catsWithBudget) {
      newCatIds.push(cat.id);
      const val = milliunitsToNumber(cat.budgeted);
      filled[cat.id] = val > 0 ? String(val) : "";
    }

    setCategoryIds(newCatIds);
    setAmounts(filled);
  };

  const handleExecuteCopy = async () => {
    if (!planId || !selectedCopyMonth) return;
    setIsCopying(true);
    setCopyStatusMsg(null);

    try {
      const targetId = `${planId}:${selectedCopyMonth}`;
      const targetBudget = await db.budgets.get(targetId);
      const targetLabel = formatMonthLabel(selectedCopyMonth);

      if (targetBudget?.categories && targetBudget.categories.length > 0) {
        const newCatIds: string[] = [];
        const newAmounts: Record<string, string> = {};
        let totalCopiedMilliunits = 0;

        for (const item of targetBudget.categories) {
          const catExists = categories.some((c) => c.id === item.category_id);
          if (catExists) {
            newCatIds.push(item.category_id);
            const val = milliunitsToNumber(item.amount);
            newAmounts[item.category_id] = val > 0 ? String(val) : "";
            totalCopiedMilliunits += item.amount;
          }
        }

        setCategoryIds(newCatIds);
        setAmounts(newAmounts);
        setCopyStatusMsg(
          `Copied ${newCatIds.length} categories from ${targetLabel} (${formatCurrency(totalCopiedMilliunits)})`
        );
      } else {
        setCategoryIds([]);
        setAmounts({});
        setCopyStatusMsg(
          `No saved budget found for ${targetLabel} — budget is empty`
        );
      }
    } catch (err) {
      console.error("Failed to copy budget from month:", err);
      setCopyStatusMsg("Failed to read budget for selected month");
    } finally {
      setIsCopying(false);
    }
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
        <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Planned Total
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-teal-300 border border-zinc-700/60">
                  {categoryIds.length} {categoryIds.length === 1 ? "category" : "categories"}
                </span>
              </div>
              <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
                {formatCurrency(totalBudgetedMilliunits)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Copy from month */}
              <button
                type="button"
                onClick={() => setIsCopyOpen(!isCopyOpen)}
                title="Copy budget allocations from another month (default: previous month)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isCopyOpen
                    ? "text-sky-300 bg-sky-950/80 border border-sky-600/70"
                    : "text-sky-400 hover:text-sky-300 bg-sky-950/40 border border-sky-800/40 hover:border-sky-700"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy from month</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isCopyOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Autofill from YNAB */}
              <button
                type="button"
                onClick={handleAutofillFromYNAB}
                title="Populate input fields with default category budgets from YNAB"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-teal-400 hover:text-teal-300 bg-teal-950/40 border border-teal-800/40 hover:border-teal-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Autofill from YNAB
              </button>

              {/* Clear All */}
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

          {/* Expandable Copy from Month Selector */}
          {isCopyOpen && (
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-300 shrink-0">
                    Source month:
                  </span>
                  <select
                    value={selectedCopyMonth}
                    onChange={(e) => {
                      setSelectedCopyMonth(e.target.value);
                      setCopyStatusMsg(null);
                    }}
                    className="flex-1 max-w-xs px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-sky-800/60 text-xs font-medium text-white focus:outline-hidden focus:border-sky-400"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleExecuteCopy}
                    disabled={isCopying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{isCopying ? "Copying..." : "Apply Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCopyOpen(false)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {copyStatusMsg && (
                <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-medium">
                  <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{copyStatusMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing Category-Amount Pairs List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-300">
              Budget Categories ({categoryIds.length})
            </span>
            <span className="text-[11px] text-zinc-500">
              Only category-amount pairs listed here will be saved
            </span>
          </div>

          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
            {categoryIds.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
                <Tag className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-300">
                  No category budget pairs
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xs mx-auto">
                  This budget has no categories yet. Use the dropdown below to add categories, or copy from another month.
                </p>
              </div>
            ) : (
              categoryIds.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                const currentVal = amounts[catId] || "";

                return (
                  <div
                    key={catId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-zinc-200 block truncate">
                        {cat?.name || "Unknown Category"}
                      </span>
                      {cat?.category_group_name && (
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {cat.category_group_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-32">
                        <span className="absolute left-3 top-2 text-xs font-semibold text-zinc-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={currentVal}
                          onChange={(e) => handleAmountChange(catId, e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs font-mono font-medium text-white placeholder-zinc-600 focus:border-teal-500 focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(catId)}
                        title="Remove category from budget"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add Category Section */}
        {availableToAdd.length > 0 ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-zinc-950/50 border border-dashed border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-400 shrink-0" />
              <select
                value={selectedAddCatId}
                onChange={(e) => setSelectedAddCatId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs text-white focus:outline-hidden focus:border-teal-500"
              >
                <option value="">Select a category to add...</option>
                {availableToAdd.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_group_name
                      ? `${cat.category_group_name}: ${cat.name}`
                      : cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-28 shrink-0">
                <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500 font-semibold">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={addAmountStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) setAddAmountStr(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!selectedAddCatId}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pair</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-zinc-500 italic">
            All categories from your plan are included in this budget.
          </div>
        )}

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
