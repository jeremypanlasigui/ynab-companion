import { PieChartSlice } from "@/components/ui/PieChart";

export interface CategorySpendingSummary {
  categoryId: string;
  categoryName: string;
  totalSpent: number; // in milliunits (positive value representing outflow)
  totalInflow: number; // in milliunits (refunds / returns)
  netSpent: number; // totalSpent - totalInflow
  transactionCount: number;
  transactions: {
    id: string;
    date: string;
    amount: number;
    payeeName: string;
    memo?: string | null;
  }[];
  budgetedAmount: number; // in milliunits
  progressPercentage: number; // (totalSpent / budgetedAmount) * 100
  remainingAmount: number; // budgetedAmount - totalSpent
  color: string;
}

export interface AccountTransferItem {
  id: string;
  date: string;
  amount: number; // positive milliunits representing transferred funds
  fromAccountName: string;
  toAccountName: string;
  memo?: string | null;
  cleared?: string;
  pairTransactionId?: string | null;
}

export interface BalanceAdjustmentItem {
  id: string;
  date: string;
  amount: number; // in milliunits (can be positive or negative)
  accountName: string;
  payeeName: string;
  memo?: string | null;
  cleared?: string;
}

export interface StartingBalanceItem {
  id: string;
  date: string;
  amount: number; // in milliunits (positive or negative)
  accountName: string;
  accountType?: string;
  payeeName: string;
  memo?: string | null;
  cleared?: string;
}

export interface IncomeTransactionItem {
  id: string;
  date: string;
  amount: number; // positive milliunits
  payeeName: string;
  accountName: string;
  categoryId?: string;
  categoryName?: string;
  memo?: string | null;
  cleared?: string;
}

export interface IncomeCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryGroupName?: string | null;
  totalIncome: number; // positive milliunits
  percentageOfTotal: number;
  transactionCount: number;
  transactions: IncomeTransactionItem[];
}

export interface IncomePayeeContribution {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface IncomePayeeBreakdown {
  payeeName: string;
  totalIncome: number; // positive milliunits
  percentageOfTotal: number;
  transactionCount: number;
  categories: IncomePayeeContribution[];
  transactions: IncomeTransactionItem[];
}

export interface BudgetCalculationResult {
  categoryList: CategorySpendingSummary[];
  totalSpending: number;
  totalBudgeted: number;
  totalSpendingTxCount: number;
  topCategory: CategorySpendingSummary | null;
  transfersList: AccountTransferItem[];
  totalTransferred: number;
  balanceAdjustmentsList: BalanceAdjustmentItem[];
  totalAdjustmentsNet: number;
  accountsAddedList: StartingBalanceItem[];
  totalAccountsAddedNet: number;
  totalMonthIncome: number;
  incomeCategoryBreakdown: IncomeCategoryBreakdown[];
  incomePayeeBreakdown: IncomePayeeBreakdown[];
  netCashflow: number;
  savingsRate: number | null;
  categoryInflowMap: Map<string, number>;
  realitySlices: PieChartSlice[];
  budgetSlices: PieChartSlice[];
}
