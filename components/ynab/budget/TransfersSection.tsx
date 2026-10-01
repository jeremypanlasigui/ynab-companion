"use client";

import { ArrowRightLeft, ArrowRight, Landmark } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/ynab/utils";
import { AccountTransferItem } from "./types";

interface TransfersSectionProps {
  transfersList: AccountTransferItem[];
  totalTransferred: number;
  formattedMonthLabel: string;
}

export function TransfersSection({
  transfersList,
  totalTransferred,
  formattedMonthLabel,
}: TransfersSectionProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Account Transfers
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-teal-300 border border-zinc-700/60">
                {transfersList.length} {transfersList.length === 1 ? "transfer" : "transfers"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Internal funds moved between accounts •{" "}
              <span className="text-zinc-500">
                Excluded from category spending &amp; totals
              </span>
            </p>
          </div>
        </div>

        {transfersList.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500">Total Transferred:</span>
            <span className="font-extrabold text-white font-mono">
              {formatCurrency(totalTransferred)}
            </span>
          </div>
        )}
      </div>

      {/* Transfers List */}
      {transfersList.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
          <ArrowRightLeft className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-300">
            No account transfers this month
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            No internal transfer activity detected in the transactions returned for{" "}
            {formattedMonthLabel}.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transfersList.map((transfer) => (
            <div
              key={transfer.id}
              className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Accounts Involved & Date */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-white flex-wrap">
                  {/* From Account */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                    <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-semibold">{transfer.fromAccountName}</span>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />

                  {/* To Account */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/30 border border-teal-800/40 text-teal-200">
                    <Landmark className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-semibold">{transfer.toAccountName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>{formatDate(transfer.date)}</span>
                  {transfer.memo && (
                    <>
                      <span>•</span>
                      <span className="italic text-zinc-400">
                        &quot;{transfer.memo}&quot;
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                <div className="text-right">
                  <div className="text-base font-extrabold text-white font-mono">
                    {formatCurrency(transfer.amount)}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Transfer
                  </span>
                </div>
                {transfer.cleared && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      transfer.cleared === "cleared"
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {transfer.cleared}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
