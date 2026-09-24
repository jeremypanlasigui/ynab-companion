"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/ynab/utils";

export interface PieChartSlice {
  id: string;
  label: string;
  value: number; // in milliunits
  color: string;
}

interface PieChartProps {
  title: string;
  subtitle?: string;
  slices: PieChartSlice[];
  centerLabel?: string;
  emptyMessage?: string;
  height?: number;
}

export function PieChart({
  title,
  subtitle,
  slices,
  centerLabel = "Total",
  emptyMessage = "No data available",
}: PieChartProps) {
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const totalValue = slices.reduce((acc, s) => acc + s.value, 0);

  // Filter out zero-value slices for arc calculation
  const validSlices = slices.filter((s) => s.value > 0);

  // SVG Geometry
  const size = 260;
  const center = size / 2;
  const radius = 98;
  const innerRadius = 62;

  // Compute angles
  let currentAngle = -Math.PI / 2; // start at 12 o'clock

  const arcs = validSlices.map((slice) => {
    const sliceAngle = totalValue > 0 ? (slice.value / totalValue) * 2 * Math.PI : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // Outer arc points
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    // Inner arc points
    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    // Full circle edge case
    let pathData: string;
    if (sliceAngle >= 2 * Math.PI - 0.001) {
      pathData = `
        M ${center} ${center - radius}
        A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius}
        Z
        M ${center} ${center - innerRadius}
        A ${innerRadius} ${innerRadius} 0 1 0 ${center - 0.001} ${center - innerRadius}
        Z
      `;
    } else {
      pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
        Z
      `;
    }

    const percentage = totalValue > 0 ? Math.round((slice.value / totalValue) * 100) : 0;

    return {
      ...slice,
      pathData,
      percentage,
    };
  });

  const activeSlice = arcs.find((a) => a.id === hoveredSliceId);

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-xs flex flex-col justify-between h-full">
      {/* Title */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs font-mono font-normal text-zinc-400">
            {formatCurrency(totalValue)}
          </span>
        </h3>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Donut Chart Visual */}
      <div className="relative flex items-center justify-center my-3">
        {totalValue === 0 ? (
          <div className="w-[200px] h-[200px] rounded-full border-4 border-dashed border-zinc-800 flex items-center justify-center text-center p-4">
            <span className="text-xs text-zinc-500 font-medium">{emptyMessage}</span>
          </div>
        ) : (
          <div className="relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="overflow-visible"
            >
              {arcs.map((arc) => {
                const isHovered = hoveredSliceId === arc.id;
                return (
                  <path
                    key={arc.id}
                    d={arc.pathData}
                    fill={arc.color}
                    className="transition-all duration-200 cursor-pointer stroke-zinc-950 stroke-2"
                    style={{
                      opacity: hoveredSliceId ? (isHovered ? 1 : 0.45) : 0.9,
                      transform: isHovered ? "scale(1.03)" : "scale(1)",
                      transformOrigin: `${center}px ${center}px`,
                      filter: isHovered ? `drop-shadow(0 0 8px ${arc.color}80)` : "none",
                    }}
                    onMouseEnter={() => setHoveredSliceId(arc.id)}
                    onMouseLeave={() => setHoveredSliceId(null)}
                  />
                );
              })}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 line-clamp-1">
                {activeSlice ? activeSlice.label : centerLabel}
              </span>
              <span className="text-base font-extrabold text-white font-mono mt-0.5">
                {formatCurrency(activeSlice ? activeSlice.value : totalValue)}
              </span>
              <span className="text-[11px] font-semibold text-teal-400 mt-0.5">
                {activeSlice ? `${activeSlice.percentage}%` : "100%"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {validSlices.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-zinc-800/60 max-h-48 overflow-y-auto pr-1">
          {arcs.map((arc) => {
            const isHovered = hoveredSliceId === arc.id;
            return (
              <div
                key={arc.id}
                onMouseEnter={() => setHoveredSliceId(arc.id)}
                onMouseLeave={() => setHoveredSliceId(null)}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  isHovered ? "bg-zinc-800/80 text-white" : "hover:bg-zinc-850/40 text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: arc.color }}
                  />
                  <span className="truncate text-xs font-medium">{arc.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="text-zinc-400">{formatCurrency(arc.value)}</span>
                  <span className="font-semibold text-zinc-200 w-8 text-right">
                    {arc.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
