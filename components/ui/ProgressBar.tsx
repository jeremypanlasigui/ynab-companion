import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // percentage (0 to 100+)
  max?: number;
  height?: "sm" | "md" | "lg";
  variant?: "mint" | "emerald" | "amber" | "rose" | "dynamic";
  className?: string;
  showIndicatorLine?: number; // Optional month pacing vertical marker (e.g. 75%)
}

export function ProgressBar({
  value,
  max = 100,
  height = "md",
  variant = "dynamic",
  className,
  showIndicatorLine,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
  const isOver = value > max;

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  }[height];

  let colorClasses = "bg-emerald-500";
  if (variant === "dynamic") {
    if (isOver || percentage >= 100) {
      colorClasses = "bg-rose-500";
    } else if (percentage >= 85) {
      colorClasses = "bg-amber-400";
    } else {
      colorClasses = "bg-emerald-400";
    }
  } else if (variant === "mint") {
    colorClasses = "bg-teal-400";
  } else if (variant === "emerald") {
    colorClasses = "bg-emerald-500";
  } else if (variant === "amber") {
    colorClasses = "bg-amber-400";
  } else if (variant === "rose") {
    colorClasses = "bg-rose-500";
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-zinc-800", heightClasses, className)}>
      <div
        className={cn("h-full transition-all duration-500 ease-out rounded-full", colorClasses)}
        style={{ width: `${percentage}%` }}
      />
      {showIndicatorLine !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-xs z-10"
          style={{ left: `${Math.min(Math.max(0, showIndicatorLine), 100)}%` }}
          title={`Month pacing: ${showIndicatorLine}%`}
        />
      )}
    </div>
  );
}
