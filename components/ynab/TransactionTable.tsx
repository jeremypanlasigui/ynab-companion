"use client";

import { useState, useMemo } from "react";
import { useYNABData, useSyncStatus } from "@/lib/ynab/hooks";
import { formatCurrency, formatDate } from "@/lib/ynab/utils";
import { db } from "@/lib/ynab/db";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface TransactionTableProps {
  limit?: number;
  showFilters?: boolean;
}

export function TransactionTable({ limit, showFilters = true }: TransactionTableProps) {
  const { transactions, accounts, categories } = useYNABData();
  const { sync } = useSyncStatus();

  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedAccount !== "all" && tx.account_id !== selectedAccount) {
        return false;
      }
      if (selectedCategory !== "all") {
        if (selectedCategory === "uncategorized") {
          if (tx.category_id) return false;
        } else if (tx.category_id !== selectedCategory) {
          return false;
        }
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const payeeMatch = (tx.payee_name || "").toLowerCase().includes(query);
        const memoMatch = (tx.memo || "").toLowerCase().includes(query);
        const categoryMatch = (tx.category_name || "").toLowerCase().includes(query);
        if (!payeeMatch && !memoMatch && !categoryMatch) return false;
      }
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory, search]);

  const displayedTransactions = limit
    ? filteredTransactions.slice(0, limit)
    : filteredTransactions;

  const handleDelete = async (id: string, payeeName?: string | null) => {
    if (confirm(`Delete transaction "${payeeName || "Transaction"}"?`)) {
      await db.deleteLocalTransaction(id);
      sync();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search payees, categories, memos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="uncategorized">Uncategorized / Income</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transaction List / Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden backdrop-blur-xs">
        {displayedTransactions.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No transactions found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {displayedTransactions.map((tx) => {
              const isIncome = tx.amount > 0;
              const isCleared = tx.cleared === "cleared";

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors group"
                >
                  {/* Left: Direction Icon, Payee, Category & Date */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate">
                          {tx.payee_name || "Uncategorized Payee"}
                        </span>
                        {tx.is_local && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Local
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">
                          {tx.category_name || "Uncategorized"}
                        </span>
                        <span>•</span>
                        <span className="text-zinc-500">{tx.account_name}</span>
                        <span>•</span>
                        <span className="text-zinc-500">{formatDate(tx.date)}</span>
                        {tx.memo && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline italic text-zinc-500 truncate max-w-xs">
                              {tx.memo}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount and Actions */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm sm:text-base ${
                          isIncome ? "text-emerald-400" : "text-white"
                        }`}
                      >
                        {formatCurrency(tx.amount, { showSign: true })}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[11px] text-zinc-500 mt-0.5">
                        {isCleared ? (
                          <span className="flex items-center gap-1 text-emerald-500/80">
                            <CheckCircle className="w-3 h-3" /> Cleared
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-500/80">
                            <Clock className="w-3 h-3" /> Uncleared
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(tx.id, tx.payee_name)}
                      title="Delete Transaction"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
