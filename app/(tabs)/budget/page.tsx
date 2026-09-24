"use client";

import { useState } from "react";
import { BudgetSummaryCard } from "@/components/ynab/BudgetSummaryCard";
import { CategoryList } from "@/components/ynab/CategoryList";
import { SetBudgetModal } from "@/components/ynab/SetBudgetModal";
import { Search, PlusCircle, SlidersHorizontal } from "lucide-react";

export default function BudgetPage() {
  const [search, setSearch] = useState("");
  const [isSetBudgetOpen, setIsSetBudgetOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Budget View
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track and adjust monthly budgets with instant actual-spending comparisons
          </p>
        </div>

        <button
          onClick={() => setIsSetBudgetOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors shadow-xs self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Set Category Budget
        </button>
      </div>

      {/* Main Budget Card */}
      <BudgetSummaryCard />

      {/* Category Breakdown & Filter Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Category Breakdown
            </h2>
            <p className="text-xs text-zinc-400">
              Assigned vs actual spending per group
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search category name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Categories List */}
        <CategoryList searchQuery={search} />
      </div>

      {/* Global Set Budget Modal */}
      <SetBudgetModal
        isOpen={isSetBudgetOpen}
        onClose={() => setIsSetBudgetOpen(false)}
      />
    </div>
  );
}
