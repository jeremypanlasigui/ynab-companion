"use client";

import { useState } from "react";
import { TransactionTable } from "@/components/ynab/TransactionTable";
import { AddTransactionModal } from "@/components/ynab/AddTransactionModal";
import { PlusCircle, Receipt } from "lucide-react";

export default function TransactionsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-teal-400" />
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Browse, filter, and record all expenses and inflows with instant offline persistence
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Transaction Table with Search & Filters */}
      <TransactionTable showFilters={true} />

      {/* Add Modal */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
