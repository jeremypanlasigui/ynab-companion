/**
 * Utility functions for YNAB milliunit conversions, formatting, and calculations
 */

export function milliunitsToNumber(milliunits: number): number {
  if (isNaN(milliunits)) return 0;
  return Math.round(milliunits) / 1000;
}

export function numberToMilliunits(amount: number): number {
  if (isNaN(amount)) return 0;
  return Math.round(amount * 1000);
}

export function formatCurrency(
  milliunits: number,
  options?: {
    showSign?: boolean;
    currencySymbol?: string;
    hideDecimals?: boolean;
  }
): string {
  const {
    showSign = false,
    currencySymbol = "$",
    hideDecimals = false,
  } = options || {};

  const num = milliunitsToNumber(milliunits);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formattedNum = absNum.toLocaleString("en-US", {
    minimumFractionDigits: hideDecimals ? 0 : 2,
    maximumFractionDigits: hideDecimals ? 0 : 2,
  });

  if (isNegative) {
    return `-${currencySymbol}${formattedNum}`;
  }
  if (showSign && num > 0) {
    return `+${currencySymbol}${formattedNum}`;
  }
  return `${currencySymbol}${formattedNum}`;
}

export function getCurrentMonthString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      
      const today = new Date();
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return "Today";
      }

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return "Yesterday";
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function getMonthPacing(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const percentageElapsed = Math.round((currentDay / totalDays) * 100);

  return {
    totalDays,
    currentDay,
    daysRemaining,
    percentageElapsed,
  };
}

export function calculateBudgetStatus(budgeted: number, activity: number) {
  // activity is negative for spending (e.g., -300000 = $300 spent)
  const spent = Math.abs(Math.min(0, activity));
  const remaining = budgeted + activity; // e.g. 500000 + (-300000) = 200000

  let percentage = 0;
  if (budgeted > 0) {
    percentage = Math.round((spent / budgeted) * 100);
  } else if (spent > 0) {
    percentage = 100;
  }

  let status: "good" | "warning" | "danger" = "good";
  if (remaining < 0) {
    status = "danger";
  } else if (percentage >= 85) {
    status = "warning";
  }

  return {
    spent,
    remaining,
    percentage,
    status,
  };
}
