"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  ReceiptIngestion,
  TransactionDetail,
  Account,
  Category,
} from "@/lib/ynab/types";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  detectDefaultCategories,
  buildSplitSubtransactions,
} from "@/lib/food/split-builder";
import { db } from "@/lib/ynab/db";
import {
  AlertTriangle,
  Link as LinkIcon,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Search,
} from "lucide-react";

interface ResolveReceiptModalProps {
  receipt: ReceiptIngestion | null;
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionDetail[];
  accounts: Account[];
  categories: Category[];
  planId: string;
}

export function ResolveReceiptModal({
  receipt,
  isOpen,
  onClose,
  transactions,
  accounts,
  categories,
  planId,
}: ResolveReceiptModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ""
  );
  const [mode, setMode] = useState<"match" | "create">("match");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detected default categories
  const { foodCategory, homeGoodsCategory } = useMemo(
    () => detectDefaultCategories(categories),
    [categories]
  );

  // Filter transactions for candidates
  const candidateTransactions = useMemo(() => {
    if (!receipt) return [];
    const term = searchTerm.toLowerCase();

    return transactions
      .filter((t) => !t.deleted)
      .filter((t) => {
        if (!term) return true;
        const payee = (t.payee_name || "").toLowerCase();
        const account = (t.account_name || "").toLowerCase();
        const amountStr = (Math.abs(t.amount) / 1000).toFixed(2);
        return (
          payee.includes(term) ||
          account.includes(term) ||
          amountStr.includes(term) ||
          t.date.includes(term)
        );
      })
      .slice(0, 15);
  }, [transactions, receipt, searchTerm]);

  if (!receipt) return null;

  // Link to selected transaction and apply split
  const handleLinkTransaction = async () => {
    if (!selectedTxId) return;
    setIsSubmitting(true);

    try {
      const foodCatName = foodCategory?.name || "Groceries";
      const homeCatName = homeGoodsCategory?.name || "Home Goods";

      const subtransactions = buildSplitSubtransactions(receipt.goods, {
        transactionId: selectedTxId,
        foodCategoryId: foodCategory?.id || null,
        foodCategoryName: foodCatName,
        homeGoodsCategoryId: homeGoodsCategory?.id || null,
        homeGoodsCategoryName: homeCatName,
        strategy: "granular",
      });

      await db.linkReceiptToTransaction(receipt.id, selectedTxId, subtransactions);
      onClose();
    } catch (err) {
      console.error("Failed to link receipt to transaction:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new transaction in YNAB directly from receipt
  const handleCreateNewTransaction = async () => {
    if (!selectedAccountId) return;
    setIsSubmitting(true);

    try {
      // 1. Create local transaction
      const newTx = await db.addLocalTransaction(
        {
          account_id: selectedAccountId,
          date: receipt.date,
          amount: receipt.total_amount,
          payee_name: receipt.vendor,
          memo: `${receipt.vendor} grocery run (Split)`,
          cleared: "cleared",
          approved: true,
        },
        planId
      );

      // 2. Split it
      const foodCatName = foodCategory?.name || "Groceries";
      const homeCatName = homeGoodsCategory?.name || "Home Goods";

      const subtransactions = buildSplitSubtransactions(receipt.goods, {
        transactionId: newTx.id,
        foodCategoryId: foodCategory?.id || null,
        foodCategoryName: foodCatName,
        homeGoodsCategoryId: homeGoodsCategory?.id || null,
        homeGoodsCategoryName: homeCatName,
        strategy: "granular",
      });

      await db.linkReceiptToTransaction(receipt.id, newTx.id, subtransactions);
      onClose();
    } catch (err) {
      console.error("Failed to create and split transaction:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete receipt
  const handleDeleteReceipt = async () => {
    if (!confirm("Are you sure you want to delete this receipt?")) return;
    await db.deleteReceipt(receipt.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Unmatched Receipt"
      description={`Link receipt from ${receipt.vendor} to a YNAB transaction or create one now`}
      maxWidth="2xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Receipt Overview Card */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                {receipt.vendor}
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-300 mt-0.5">
                <span>Date: {receipt.date}</span>
                <span>•</span>
                <span>{receipt.goods?.length || 0} items</span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1.5 font-medium">
                <span className="text-emerald-300">
                  Food: {formatCurrency(receipt.food_amount)}
                </span>
                <span className="text-zinc-400">
                  Home Goods: {formatCurrency(receipt.non_food_amount)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block">Total Outflow</span>
            <span className="font-mono text-base font-black text-white">
              {formatCurrency(receipt.total_amount)}
            </span>
          </div>
        </div>

        {/* Resolution Options Switcher */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          <button
            onClick={() => setMode("match")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "match"
                ? "bg-zinc-800 text-teal-300 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Match Existing Transaction</span>
          </button>
          <button
            onClick={() => setMode("create")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === "create"
                ? "bg-zinc-800 text-teal-300 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Transaction</span>
          </button>
        </div>

        {/* Mode 1: Match Existing */}
        {mode === "match" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions by payee, amount, or date..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
              <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/60">
                {candidateTransactions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    No matching transactions found. Try searching or create a new transaction below.
                  </div>
                ) : (
                  candidateTransactions.map((tx) => {
                    const isSelected = selectedTxId === tx.id;
                    const isExactAmount =
                      Math.abs(tx.amount) === Math.abs(receipt.total_amount);

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTxId(tx.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-teal-500/10 border-l-2 border-teal-400"
                            : "hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-teal-400 bg-teal-400 text-zinc-950"
                                : "border-zinc-700"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {tx.payee_name || "Uncategorized"}
                              </span>
                              {isExactAmount && (
                                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">
                                  Exact Amount
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 block">
                              {tx.account_name} • {tx.date}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-white block">
                            {formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {tx.category_name || "No Category"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Create New */}
        {mode === "create" && (
          <div className="space-y-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/50">
            <span className="text-xs font-bold text-white block">
              Directly Post Split Transaction to YNAB
            </span>
            <p className="text-xs text-zinc-400">
              Select which bank or credit card account was used for this purchase. A split transaction with all itemized subcategories will be created immediately.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
          <button
            onClick={handleDeleteReceipt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Receipt</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all cursor-pointer"
            >
              Cancel
            </button>

            {mode === "match" ? (
              <button
                onClick={handleLinkTransaction}
                disabled={!selectedTxId || isSubmitting}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-zinc-950 transition-all shadow-md shadow-teal-500/20 cursor-pointer"
              >
                {isSubmitting ? "Linking..." : "Link & Apply Split"}
              </button>
            ) : (
              <button
                onClick={handleCreateNewTransaction}
                disabled={!selectedAccountId || isSubmitting}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-zinc-950 transition-all shadow-md shadow-teal-500/20 cursor-pointer"
              >
                {isSubmitting ? "Creating..." : "Create Split Transaction"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
