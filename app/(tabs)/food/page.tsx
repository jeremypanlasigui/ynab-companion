"use client";

import { useState, useMemo } from "react";
import { useYNABData } from "@/lib/ynab/hooks";
import { db } from "@/lib/ynab/db";
import {
  FoodKpiSummary,
  SubCategoryDistribution,
  UnresolvedReceiptAlert,
  ReceiptIngestionModal,
  ResolveReceiptModal,
  ReceiptHistoryTable,
} from "@/components/ynab/food";
import { ReceiptIngestion } from "@/lib/ynab/types";
import { PlusCircle, Calendar, UtensilsCrossed } from "lucide-react";

export default function FoodBudgetPage() {
  const {
    settings,
    categories,
    transactions,
    accounts,
    receipts,
    isInitialized,
  } = useYNABData();

  const [currentMonth, setCurrentMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [receiptToResolve, setReceiptToResolve] = useState<ReceiptIngestion | null>(null);

  const activePlanId = settings?.selected_plan_id || "default";

  // Unresolved receipts that need attention
  const unresolvedReceipts = useMemo(
    () => receipts.filter((r) => r.status === "unresolved"),
    [receipts]
  );

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm("Are you sure you want to delete this receipt?")) return;
    await db.deleteReceipt(receiptId);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-xs text-zinc-400 font-medium">
            Loading food budget & receipt data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Food Budget
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Isolate non-food items from grocery runs and memo-ize split categories in YNAB
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Ingest Receipt Action */}
          <button
            onClick={() => setIsIngestionOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ingest Receipt</span>
          </button>
        </div>
      </div>

      {/* 1. Persistent Unresolved Receipt Alert */}
      <UnresolvedReceiptAlert
        unresolvedReceipts={unresolvedReceipts}
        onResolve={(r) => setReceiptToResolve(r)}
      />

      {/* 2. Top Food KPI Summary Cards */}
      <FoodKpiSummary
        transactions={transactions}
        receipts={receipts}
        categories={categories}
        currentMonth={currentMonth}
      />

      {/* 3. Sub-Category Distribution */}
      <SubCategoryDistribution
        receipts={receipts}
        currentMonth={currentMonth}
      />

      {/* 4. Receipt History & Itemized Goods */}
      <ReceiptHistoryTable
        receipts={receipts}
        onResolve={(r) => setReceiptToResolve(r)}
        onDelete={handleDeleteReceipt}
      />

      {/* Modals */}
      <ReceiptIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        categories={categories}
        transactions={transactions}
        planId={activePlanId}
      />

      <ResolveReceiptModal
        receipt={receiptToResolve}
        isOpen={Boolean(receiptToResolve)}
        onClose={() => setReceiptToResolve(null)}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        planId={activePlanId}
      />
    </div>
  );
}
