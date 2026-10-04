"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TransactionDetail, Category, Account, SubTransaction } from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import { ContributingTransaction } from "@/lib/food/food-spend-utils";
import { ItemPriceInput } from "./ItemPriceInput";
import { db } from "@/lib/ynab/db";
import {
  Utensils,
  Calendar,
  Trash2,
  Edit3,
  Save,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FoodSpendBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string; // 'YYYY-MM'
  totalFoodSpend: number; // milliunits
  homeGoodsFiltered: number; // milliunits
  contributingTransactions: ContributingTransaction[];
  categories: Category[];
  accounts: Account[];
}

export function FoodSpendBreakdownModal({
  isOpen,
  onClose,
  currentMonth,
  totalFoodSpend,
  homeGoodsFiltered,
  contributingTransactions,
  categories,
  accounts,
}: FoodSpendBreakdownModalProps) {
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TransactionDetail | null>(null);
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(
    () => new Set(contributingTransactions.map((c) => c.transaction.id))
  );
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Month formatted for display, e.g. "October 2026"
  const formattedMonthName = new Date(currentMonth + "-02").toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartEdit = (tx: TransactionDetail) => {
    setEditingTxId(tx.id);
    // Clone transaction for isolated editing
    setEditForm(JSON.parse(JSON.stringify(tx)));
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;

    try {
      // If split, ensure total transaction amount equals sum of subtransactions
      if (editForm.subtransactions && editForm.subtransactions.length > 0) {
        const sumSubtx = editForm.subtransactions
          .filter((st) => !st.deleted)
          .reduce((sum, st) => sum + st.amount, 0);
        editForm.amount = sumSubtx;
      }

      await db.updateTransaction(editForm);
      setFeedbackMessage("Transaction successfully updated.");
      setTimeout(() => setFeedbackMessage(null), 3500);
      setEditingTxId(null);
      setEditForm(null);
    } catch (err) {
      console.error("Failed to update transaction:", err);
      alert("Failed to save transaction changes.");
    }
  };

  const handleDelete = async (txId: string, payeeName?: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete the transaction "${payeeName || "Unnamed"}"? This will remove its contribution from your food budget and update YNAB balances.`
    );
    if (!confirmed) return;

    try {
      setIsDeletingId(txId);
      await db.deleteLocalTransaction(txId);
      setFeedbackMessage("Transaction successfully deleted.");
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      alert("Failed to delete transaction.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Subtransaction edit helper
  const handleUpdateSubtransaction = (
    index: number,
    field: keyof SubTransaction,
    value: any
  ) => {
    if (!editForm || !editForm.subtransactions) return;
    const copy = [...editForm.subtransactions];
    const sub = { ...copy[index] };

    if (field === "amount") {
      sub.amount = typeof value === "number" ? value : 0;
    } else if (field === "memo") {
      sub.memo = String(value);
    } else if (field === "category_id") {
      sub.category_id = value || null;
      const matchedCat = categories.find((c) => c.id === value);
      sub.category_name = matchedCat ? matchedCat.name : null;
    }

    copy[index] = sub;
    setEditForm({ ...editForm, subtransactions: copy });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Total Food Spend Breakdown"
      description={`Inspect, adjust, or delete every transaction contributing to ${formattedMonthName}'s food spend.`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Quick Metrics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {formattedMonthName}
            </span>
            <span className="text-zinc-400">
              {contributingTransactions.length} contributing {contributingTransactions.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mr-1.5">
                Food Spend:
              </span>
              <span className="font-mono text-sm font-black text-teal-300">
                {formatCurrency(-totalFoodSpend)}
              </span>
            </div>
            {homeGoodsFiltered > 0 && (
              <div className="pl-3 border-l border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider mr-1.5">
                  Home Goods Filtered:
                </span>
                <span className="font-mono text-sm font-black text-emerald-400">
                  {formatCurrency(homeGoodsFiltered)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Transactions List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {contributingTransactions.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
              <Utensils className="w-8 h-8 text-zinc-600 mx-auto" />
              <span className="text-xs font-bold text-zinc-300 block">
                No food transactions found for {formattedMonthName}
              </span>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Transactions categorized under Groceries, Supermarket, Dining, or split with food sub-memos will appear here.
              </p>
            </div>
          ) : (
            contributingTransactions.map((item) => {
              const tx = item.transaction;
              const isEditing = editingTxId === tx.id;
              const isExpanded = expandedTxIds.has(tx.id);
              const isSplit = Boolean(tx.subtransactions && tx.subtransactions.length > 0);

              return (
                <div
                  key={tx.id}
                  className={`rounded-2xl border transition-all ${
                    isEditing
                      ? "border-teal-500/60 bg-zinc-900/90 shadow-lg shadow-teal-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700/80"
                  }`}
                >
                  {/* Transaction Row Header */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {isSplit && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(tx.id)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer mt-0.5 sm:mt-0"
                          title={isExpanded ? "Collapse subtransactions" : "Expand subtransactions"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-teal-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">
                            {tx.payee_name || "Uncategorized Payee"}
                          </span>
                          {isSplit && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                              <Layers className="w-3 h-3" />
                              <span>Split ({tx.subtransactions?.length} parts)</span>
                            </span>
                          )}
                          {item.linkedReceipt && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                              Receipt Linked
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {tx.date}
                          </span>
                          <span>•</span>
                          <span className="truncate">{tx.account_name}</span>
                          {!isSplit && tx.category_name && (
                            <>
                              <span>•</span>
                              <span className="text-teal-400/90 truncate">{tx.category_name}</span>
                            </>
                          )}
                          {tx.memo && (
                            <>
                              <span>•</span>
                              <span className="text-zinc-500 italic truncate max-w-[200px]">
                                {tx.memo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amounts & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                      <div className="text-right">
                        <div className="flex items-baseline gap-1.5 justify-end">
                          <span className="text-[10px] text-zinc-400">Total:</span>
                          <span className="font-mono text-sm font-bold text-white">
                            {formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] justify-end">
                          <span className="text-teal-400 font-mono font-semibold">
                            +{formatCurrency(item.foodSpendMilliunits)} to food
                          </span>
                          {item.homeGoodsMilliunits > 0 && (
                            <span className="text-emerald-400/80 font-mono text-[10px]">
                              ({formatCurrency(item.homeGoodsMilliunits)} home)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tx)}
                              title="Edit transaction details and subtransactions"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id, tx.payee_name ?? undefined)}
                              disabled={isDeletingId === tx.id}
                              title="Delete transaction"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              title="Save changes"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all cursor-pointer shadow-xs"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              title="Cancel editing"
                              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EDIT MODE: Transaction Top Fields */}
                  {isEditing && editForm && (
                    <div className="p-3.5 bg-zinc-900/90 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                          Payee Name
                        </label>
                        <input
                          type="text"
                          value={editForm.payee_name || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, payee_name: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, date: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      {!isSplit && (
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                            Category
                          </label>
                          <select
                            value={editForm.category_id || ""}
                            onChange={(e) => {
                              const catId = e.target.value || null;
                              const matched = categories.find((c) => c.id === catId);
                              setEditForm({
                                ...editForm,
                                category_id: catId,
                                category_name: matched ? matched.name : null,
                              });
                            }}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                          >
                            <option value="">Uncategorized</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtransactions Breakdown Section */}
                  {isSplit && isExpanded && (
                    <div className="border-t border-zinc-800/80 bg-zinc-950/40 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 pb-1">
                        <span>Subtransactions ({tx.subtransactions?.length})</span>
                        <span className="text-[10px] text-zinc-500">
                          🟢 Included in Food Spend &bull; 🟣 Home Goods Filtered Out
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {(isEditing && editForm?.subtransactions
                          ? editForm.subtransactions
                          : tx.subtransactions || []
                        ).map((sub, idx) => {
                          const memoLower = (sub.memo || "").toLowerCase();
                          const catNameLower = (sub.category_name || "").toLowerCase();
                          const isHomeGoods =
                            memoLower.includes("home goods") ||
                            memoLower.includes("household") ||
                            catNameLower.includes("home");

                          return (
                            <div
                              key={sub.id || idx}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl border text-xs ${
                                isHomeGoods
                                  ? "border-purple-500/20 bg-purple-500/5 text-purple-200"
                                  : "border-teal-500/20 bg-teal-500/5 text-teal-200"
                              }`}
                            >
                              {/* Left: Category & Memo */}
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <select
                                      value={sub.category_id || ""}
                                      onChange={(e) =>
                                        handleUpdateSubtransaction(
                                          idx,
                                          "category_id",
                                          e.target.value
                                        )
                                      }
                                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                                    >
                                      {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={sub.memo || ""}
                                      onChange={(e) =>
                                        handleUpdateSubtransaction(
                                          idx,
                                          "memo",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Memo e.g. fruits: Apples"
                                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-white focus:outline-none focus:border-teal-500"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`font-semibold ${
                                          isHomeGoods ? "text-purple-300" : "text-teal-300"
                                        }`}
                                      >
                                        {sub.category_name || "Uncategorized"}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                                          isHomeGoods
                                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        }`}
                                      >
                                        {isHomeGoods ? "Home Goods (Excluded)" : "Food Spend"}
                                      </span>
                                    </div>
                                    {sub.memo && (
                                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                                        {sub.memo}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Right: Amount */}
                              <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2 font-mono">
                                {isEditing ? (
                                  <ItemPriceInput
                                    amountMilliunits={sub.amount}
                                    onCommitAmount={(amt) =>
                                      handleUpdateSubtransaction(idx, "amount", amt)
                                    }
                                  />
                                ) : (
                                  <span className="font-bold text-white text-xs">
                                    {formatCurrency(sub.amount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & close button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Adjusting or deleting transactions updates your local budget and live YNAB state.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
