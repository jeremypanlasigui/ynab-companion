"use client";

import { useYNABData } from "@/lib/ynab/hooks";
import { formatCurrency } from "@/lib/ynab/utils";
import {
  CreditCard,
  Landmark,
  PiggyBank,
  Banknote,
  TrendingUp,
} from "lucide-react";

export function AccountSummary() {
  const { accounts } = useYNABData();

  let totalAssets = 0;
  let totalDebts = 0;

  for (const acc of accounts) {
    if (acc.balance >= 0) {
      totalAssets += acc.balance;
    } else {
      totalDebts += Math.abs(acc.balance);
    }
  }

  const netWorth = totalAssets - totalDebts;

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <Landmark className="w-4 h-4 text-teal-400" />;
      case "savings":
        return <PiggyBank className="w-4 h-4 text-emerald-400" />;
      case "creditCard":
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      default:
        return <Banknote className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs">
      {/* Net Worth Summary */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div>
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Total Net Worth
          </span>
          <div className="text-2xl font-black text-white mt-0.5">
            {formatCurrency(netWorth)}
          </div>
        </div>
        <div className="text-right text-xs font-mono space-y-0.5">
          <div className="text-zinc-400">
            Assets:{" "}
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(totalAssets)}
            </span>
          </div>
          <div className="text-zinc-400">
            Debts:{" "}
            <span className="text-rose-400 font-semibold">
              {formatCurrency(totalDebts)}
            </span>
          </div>
        </div>
      </div>

      {/* Account List */}
      <div className="mt-3 divide-y divide-zinc-800/40">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="py-2.5 flex items-center justify-between text-xs hover:bg-zinc-800/20 px-1 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-zinc-800/80">
                {getAccountIcon(acc.type)}
              </div>
              <span className="font-medium text-zinc-200">{acc.name}</span>
            </div>
            <span
              className={`font-mono font-semibold ${
                acc.balance < 0 ? "text-rose-400" : "text-zinc-100"
              }`}
            >
              {formatCurrency(acc.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
