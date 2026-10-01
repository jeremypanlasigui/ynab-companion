"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

interface MonthNavigatorProps {
  formattedMonthLabel: string;
  selectedMonth: string;
  monthKey: string;
  dataSource: "api" | "demo";
  lastFetchedAt: Date | null;
  isLoading: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onOpenEditModal: () => void;
  onRefresh: () => void;
}

export function MonthNavigator({
  formattedMonthLabel,
  selectedMonth,
  monthKey,
  dataSource,
  lastFetchedAt,
  isLoading,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  onOpenEditModal,
  onRefresh,
}: MonthNavigatorProps) {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Monthly Budget
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              <Sparkles className="w-3 h-3" />
              API: getTransactionsByMonth
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Category spending progress and fund distribution powered by local Budget and YNAB API
          </p>
        </div>

        {/* Month Navigation & Edit Budget */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1">
            <button
              onClick={onPrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              {formattedMonthLabel}
            </div>
            <button
              onClick={onNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onCurrentMonth}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all"
          >
            Current
          </button>

          <button
            onClick={onOpenEditModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-teal-300 border border-teal-500/30 transition-all shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Edit Budget
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Fetching..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Endpoint & Budget Model Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/50">
            GET /plans/{`{plan_id}`}/months/{selectedMonth}/transactions
          </span>
          <span className="hidden sm:inline text-zinc-500">•</span>
          <span className="text-zinc-300 font-medium">
            Local Budget: <strong className="text-white font-mono">{monthKey}</strong>
          </span>
          <span className="hidden sm:inline text-zinc-500">•</span>
          <span className="hidden sm:inline">
            Source:{" "}
            <strong className="text-zinc-300">
              {dataSource === "api" ? "Live YNAB API" : "Demo Simulation"}
            </strong>
          </span>
        </div>

        {lastFetchedAt && (
          <div className="text-[11px] text-zinc-500">
            Updated {lastFetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
