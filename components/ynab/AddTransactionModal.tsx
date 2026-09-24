"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { db } from "@/lib/ynab/db";
import { useYNABData, useSyncStatus } from "@/lib/ynab/hooks";
import { numberToMilliunits } from "@/lib/ynab/utils";
import { DollarSign, Calendar, Tag, CreditCard, PlusCircle, Check } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategoryId?: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  defaultCategoryId,
}: AddTransactionModalProps) {
  const { accounts, categories, categoryGroups } = useYNABData();
  const { sync } = useSyncStatus();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [payee, setPayee] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [isCleared, setIsCleared] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (defaultCategoryId) {
      setCategoryId(defaultCategoryId);
    }
  }, [defaultCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than $0.00");
      return;
    }

    if (!accountId) {
      setError("Please select an account.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Outflows are negative milliunits; Inflows are positive milliunits
      const signMultiplier = type === "expense" ? -1 : 1;
      const milliunits = numberToMilliunits(parsedAmount) * signMultiplier;

      await db.addLocalTransaction({
        account_id: accountId,
        date,
        amount: milliunits,
        payee_name: payee.trim() || (type === "expense" ? "General Spending" : "Income Inflow"),
        category_id: type === "income" ? null : categoryId || null,
        memo: memo.trim() || null,
        cleared: isCleared ? "cleared" : "uncleared",
        approved: true,
      });

      // Trigger background sync in background
      sync();

      // Reset form
      setAmountStr("");
      setPayee("");
      setMemo("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Transaction"
      description="Quickly record spending or income with instant offline updates"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Expense vs Income Toggle */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              type === "expense"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Expense / Outflow
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              type === "income"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Income / Inflow
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">Amount</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-semibold text-lg">
              $
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              required
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xl font-bold tracking-tight focus:border-teal-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Payee */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">Payee / Merchant</label>
          <input
            type="text"
            placeholder={type === "expense" ? "e.g. Trader Joe's, Starbucks" : "e.g. Employer Direct Deposit"}
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Account */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Category (if expense) */}
        {type === "expense" && (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
            >
              <option value="">Uncategorized</option>
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
        )}

        {/* Memo & Cleared status */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Memo / Note (optional)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:border-teal-500 focus:outline-hidden"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCleared}
              onChange={(e) => setIsCleared(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-800 text-teal-500 focus:ring-0"
            />
            Cleared
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Save Transaction
          </button>
        </div>
      </form>
    </Modal>
  );
}
