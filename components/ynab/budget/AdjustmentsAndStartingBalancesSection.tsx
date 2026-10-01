"use client";

import { Scale, PlusCircle, Landmark } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/ynab/utils";
import { BalanceAdjustmentItem, StartingBalanceItem } from "./types";

interface AdjustmentsAndStartingBalancesSectionProps {
  balanceAdjustmentsList: BalanceAdjustmentItem[];
  totalAdjustmentsNet: number;
  accountsAddedList: StartingBalanceItem[];
  totalAccountsAddedNet: number;
  formattedMonthLabel: string;
}

export function AdjustmentsAndStartingBalancesSection({
  balanceAdjustmentsList,
  totalAdjustmentsNet,
  accountsAddedList,
  totalAccountsAddedNet,
  formattedMonthLabel,
}: AdjustmentsAndStartingBalancesSectionProps) {
  return (
    <div className="space-y-6">
      {/* Balance Adjustments Section */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Balance Adjustments
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 border border-zinc-700/60">
                  {balanceAdjustmentsList.length}{" "}
                  {balanceAdjustmentsList.length === 1 ? "adjustment" : "adjustments"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Account reconciliation corrections •{" "}
                <span className="text-zinc-500">
                  Excluded from budget spending &amp; category totals
                </span>
              </p>
            </div>
          </div>

          {balanceAdjustmentsList.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500">Net Adjustment:</span>
              <span
                className={`font-extrabold font-mono ${
                  totalAdjustmentsNet > 0
                    ? "text-emerald-400"
                    : totalAdjustmentsNet < 0
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {formatCurrency(totalAdjustmentsNet, { showSign: true })}
              </span>
            </div>
          )}
        </div>

        {/* Balance Adjustments List */}
        {balanceAdjustmentsList.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
            <Scale className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">
              No balance adjustments this month
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              No reconciliation balance adjustments recorded for {formattedMonthLabel}.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {balanceAdjustmentsList.map((adj) => {
              const isPositive = adj.amount > 0;
              const isNegative = adj.amount < 0;

              return (
                <div
                  key={adj.id}
                  className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-white flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                        <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold">{adj.accountName}</span>
                      </div>
                      <span className="text-zinc-500">•</span>
                      <span className="font-medium text-zinc-300">{adj.payeeName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatDate(adj.date)}</span>
                      {adj.memo && (
                        <>
                          <span>•</span>
                          <span className="italic text-zinc-400">
                            &quot;{adj.memo}&quot;
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold font-mono ${
                          isPositive
                            ? "text-emerald-400"
                            : isNegative
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        {formatCurrency(adj.amount, { showSign: true })}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        Reconciliation
                      </span>
                    </div>
                    {adj.cleared && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          adj.cleared === "reconciled"
                            ? "bg-purple-950/40 text-purple-400 border border-purple-800/40"
                            : adj.cleared === "cleared"
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {adj.cleared}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts Added Section */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Accounts Added
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-sky-300 border border-zinc-700/60">
                  {accountsAddedList.length}{" "}
                  {accountsAddedList.length === 1 ? "account added" : "accounts added"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Starting balances from newly connected or created accounts •{" "}
                <span className="text-zinc-500">
                  Excluded from budget spending &amp; category totals
                </span>
              </p>
            </div>
          </div>

          {accountsAddedList.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500">Total Starting Balance:</span>
              <span
                className={`font-extrabold font-mono ${
                  totalAccountsAddedNet >= 0 ? "text-sky-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(totalAccountsAddedNet, { showSign: true })}
              </span>
            </div>
          )}
        </div>

        {/* Accounts Added List */}
        {accountsAddedList.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
            <PlusCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">
              No accounts added this month
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              No starting balance transactions recorded for {formattedMonthLabel}.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {accountsAddedList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-white flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      <Landmark className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-semibold">{item.accountName}</span>
                    </div>
                    {item.accountType && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 capitalize">
                        {item.accountType}
                      </span>
                    )}
                    <span className="text-zinc-500">•</span>
                    <span className="text-[11px] font-medium text-sky-300 bg-sky-950/30 px-2 py-0.5 rounded-md border border-sky-800/30">
                      {item.payeeName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>Added {formatDate(item.date)}</span>
                    {item.memo && (
                      <>
                        <span>•</span>
                        <span className="italic text-zinc-400">
                          &quot;{item.memo}&quot;
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                  <div className="text-right">
                    <div
                      className={`text-base font-extrabold font-mono ${
                        item.amount >= 0 ? "text-sky-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(item.amount, { showSign: true })}
                    </div>
                    <span className="text-[10px] text-zinc-500 block">
                      Starting Balance
                    </span>
                  </div>
                  {item.cleared && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.cleared === "reconciled"
                          ? "bg-purple-950/40 text-purple-400 border border-purple-800/40"
                          : item.cleared === "cleared"
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.cleared}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
