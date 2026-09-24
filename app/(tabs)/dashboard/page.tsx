"use client";

import Link from "next/link";
import { BudgetSummaryCard } from "@/components/ynab/BudgetSummaryCard";
import { AccountSummary } from "@/components/ynab/AccountSummary";
import { TransactionTable } from "@/components/ynab/TransactionTable";
import { CategoryList } from "@/components/ynab/CategoryList";
import { ArrowRight, PieChart, Receipt, Sparkles } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Financial Snapshot
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Fast, offline-first companion view of your YNAB budget and accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/budget"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all"
          >
            <PieChart className="w-3.5 h-3.5 text-teal-400" />
            Full Budget View
          </Link>
          <Link
            href="/transactions"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all"
          >
            <Receipt className="w-3.5 h-3.5 text-teal-400" />
            All Transactions
          </Link>
        </div>
      </div>

      {/* Main Budget Card & Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Monthly Budget Overview */}
        <div className="lg:col-span-2 space-y-6">
          <BudgetSummaryCard />

          {/* Quick Spending Categories Preview */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Budget Categories
                </h3>
                <p className="text-xs text-zinc-400">
                  Track actual spending against targets
                </p>
              </div>
              <Link
                href="/budget"
                className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                Manage all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <CategoryList />
          </div>
        </div>

        {/* Right 1 Col: Accounts & Net Worth */}
        <div className="space-y-6">
          <AccountSummary />

          {/* Mint-like Quick Tips / Offline info box */}
          <div className="rounded-2xl border border-teal-900/40 bg-teal-950/20 p-4">
            <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs mb-1">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Offline-First Architecture
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every action you perform is instantly saved to your browser&apos;s IndexedDB.
              Changes queue seamlessly and sync whenever an internet connection or YNAB token is present.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Recent Transactions
            </h3>
            <p className="text-xs text-zinc-400">
              Latest activity across all connected accounts
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <TransactionTable limit={5} showFilters={false} />
      </div>
    </div>
  );
}
