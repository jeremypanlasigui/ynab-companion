import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "mint";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-zinc-900/80 border-zinc-800 text-zinc-100",
    success: "bg-emerald-950/20 border-emerald-900/40 text-emerald-400",
    warning: "bg-amber-950/20 border-amber-900/40 text-amber-400",
    danger: "bg-rose-950/20 border-rose-900/40 text-rose-400",
    mint: "bg-teal-950/25 border-teal-800/40 text-teal-300",
  }[variant];

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-xs shadow-xs transition-all duration-200 hover:border-zinc-700/80",
        variantStyles,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide uppercase text-zinc-400">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-xl bg-zinc-800/60 text-zinc-300">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-zinc-400/90 font-normal">{subtitle}</p>
      )}
    </div>
  );
}
