"use client";

import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/ynab/utils";
import { ReceiptIngestion } from "@/lib/ynab/types";

interface UnresolvedReceiptAlertProps {
  unresolvedReceipts: ReceiptIngestion[];
  onResolve: (receipt: ReceiptIngestion) => void;
}

export function UnresolvedReceiptAlert({
  unresolvedReceipts,
  onResolve,
}: UnresolvedReceiptAlertProps) {
  if (unresolvedReceipts.length === 0) return null;

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6 backdrop-blur-md relative overflow-hidden shadow-lg shadow-amber-500/5">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                {unresolvedReceipts.length === 1
                  ? "1 Receipt Needs Attention"
                  : `${unresolvedReceipts.length} Receipts Need Attention`}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/20 border border-amber-400/30 text-amber-200">
                Unresolved Match
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              These receipts were not matched automatically to a YNAB bank transaction by vendor and date. Link them to apply your split subcategories!
            </p>
          </div>
        </div>
      </div>

      {/* List of unresolved receipts */}
      <div className="space-y-2.5">
        {unresolvedReceipts.map((receipt) => (
          <div
            key={receipt.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/70 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {receipt.vendor}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {receipt.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>{receipt.goods?.length || 0} items</span>
                  <span>•</span>
                  <span className="text-emerald-400">
                    Food: {formatCurrency(receipt.food_amount)}
                  </span>
                  <span>•</span>
                  <span className="text-zinc-400">
                    Home Goods: {formatCurrency(receipt.non_food_amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
              <span className="font-mono text-sm font-extrabold text-white">
                {formatCurrency(receipt.total_amount)}
              </span>
              <button
                onClick={() => onResolve(receipt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all shadow-sm shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <span>Resolve & Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
