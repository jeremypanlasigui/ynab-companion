"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, PieChartSlice } from "@/components/ui/PieChart";

interface DistributionChartsProps {
  realitySlices: PieChartSlice[];
  budgetSlices: PieChartSlice[];
  formattedMonthLabel: string;
  monthKey: string;
}

export function DistributionCharts({
  realitySlices,
  budgetSlices,
  formattedMonthLabel,
  monthKey,
}: DistributionChartsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-teal-400" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Distribution of Funds: Reality vs Budget
          </h2>
        </div>
        <span className="text-xs text-zinc-400 hidden sm:inline">
          Matching colors per category for side-by-side comparison
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Chart 1: Reality (Actual Spending) */}
        <PieChart
          title="Distribution in Reality (Actual Spend)"
          subtitle={`Actual category outflows for ${formattedMonthLabel}`}
          slices={realitySlices}
          centerLabel="Actual Spent"
          emptyMessage="No actual spending recorded for this month"
        />

        {/* Chart 2: Budget (Planned Allocation) */}
        <PieChart
          title="Distribution in Budget (Planned)"
          subtitle={`Planned allocations from local Budget (${monthKey})`}
          slices={budgetSlices}
          centerLabel="Total Budgeted"
          emptyMessage="No budget amounts defined for this month"
        />
      </div>
    </div>
  );
}
