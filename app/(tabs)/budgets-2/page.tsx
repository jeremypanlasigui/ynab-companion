"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useYNABData, useLocalBudget } from "@/lib/ynab/hooks";
import { YNABApiClient } from "@/lib/ynab/api";
import { TransactionDetail, Budget } from "@/lib/ynab/types";
import { DEMO_TRANSACTIONS, DEMO_PLAN_ID } from "@/lib/ynab/demo-data";
import {
  formatCurrency,
  formatDate,
  milliunitsToNumber,
  numberToMilliunits,
} from "@/lib/ynab/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PieChart, PieChartSlice } from "@/components/ui/PieChart";
import { EditBudget2Modal } from "@/components/ynab/EditBudget2Modal";
import {
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  Landmark,
  AlertCircle,
  Receipt,
  ChevronDown,
  ChevronUp,
  Tag,
  SlidersHorizontal,
  Edit3,
  Check,
  X,
  Target,
  PieChart as PieChartIcon,
  Wand2,
  Equal,
  Scale,
} from "lucide-react";

interface CategorySpendingSummary {
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

interface AccountTransferItem {
  id: string;
  date: string;
  amount: number; // positive milliunits representing transferred funds
  fromAccountName: string;
  toAccountName: string;
  memo?: string | null;
  cleared?: string;
  pairTransactionId?: string | null;
}

interface BalanceAdjustmentItem {
  id: string;
  date: string;
  amount: number; // in milliunits (can be positive or negative)
  accountName: string;
  payeeName: string;
  memo?: string | null;
  cleared?: string;
}

// Consistent modern color palette for matching category colors between reality and budget charts
const COLOR_PALETTE = [
  "#14b8a6", // Teal
  "#38bdf8", // Sky blue
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#f472b6", // Pink
  "#fb7185", // Rose
  "#fb923c", // Orange
  "#facc15", // Amber/Yellow
  "#34d399", // Emerald
  "#2dd4bf", // Mint
  "#a78bfa", // Violet
  "#94a3b8", // Slate
];

export default function BudgetsV2Page() {
  const { settings, isInitialized, accounts, categories } = useYNABData();

  // Current month in 'YYYY-MM-01' format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  });

  const monthKey = selectedMonth.slice(0, 7); // e.g. '2026-09'
  const activePlanId = settings?.selected_plan_id || DEMO_PLAN_ID;

  // Local Budget data hook
  const { budget: localBudget, updateCategoryAmount, saveBudget } = useLocalBudget(
    activePlanId,
    monthKey
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawTransactions, setRawTransactions] = useState<TransactionDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "demo">("demo");
  const [isMatchingSpent, setIsMatchingSpent] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);

  // Modal & Inline editing states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inlineEditCatId, setInlineEditCatId] = useState<string | null>(null);
  const [inlineAmountStr, setInlineAmountStr] = useState<string>("");

  // Map of account ID to account Name for quick reference
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (accounts) {
      for (const acc of accounts) {
        map.set(acc.id, acc.name);
      }
    }
    return map;
  }, [accounts]);

  // Fetch transactions specifically using getTransactionsByMonth endpoint
  const fetchMonthTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (
        !settings?.is_demo_mode &&
        settings?.api_token &&
        settings?.selected_plan_id
      ) {
        // Live YNAB API Call to getTransactionsByMonth
        const client = new YNABApiClient(settings.api_token);
        const response = await client.getTransactionsByMonth(
          settings.selected_plan_id,
          selectedMonth
        );
        setRawTransactions(response.transactions || []);
        setDataSource("api");
      } else {
        // Demo Mode: simulate getTransactionsByMonth by filtering demo transactions
        const monthPrefix = selectedMonth.slice(0, 7);
        const filtered = DEMO_TRANSACTIONS.filter((tx) =>
          tx.date ? tx.date.startsWith(monthPrefix) : true
        );
        const finalTxs = filtered.length > 0 ? filtered : DEMO_TRANSACTIONS;
        setRawTransactions(finalTxs);
        setDataSource("demo");
      }
      setLastFetchedAt(new Date());
    } catch (err: any) {
      console.error("Failed to fetch getTransactionsByMonth:", err);
      setError(err?.message || "Failed to load transactions for month.");
    } finally {
      setIsLoading(false);
    }
  }, [settings, selectedMonth]);

  useEffect(() => {
    if (isInitialized) {
      fetchMonthTransactions();
    }
  }, [isInitialized, fetchMonthTransactions]);

  // Navigate months
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const newYear = prevDate.getFullYear();
    const newMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${newYear}-${newMonth}-01`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(year, month, 1);
    const newYear = nextDate.getFullYear();
    const newMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${newYear}-${newMonth}-01`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${month}-01`);
  };

  const formattedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Color mapper by category ID
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIdx = 0;
    for (const cat of categories) {
      map.set(cat.id, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
      colorIdx++;
    }
    return map;
  }, [categories]);

  // Process raw transactions from getTransactionsByMonth and merge with local Budget
  const {
    categoryList,
    totalSpending,
    totalBudgeted,
    totalSpendingTxCount,
    topCategory,
    transfersList,
    totalTransferred,
    balanceAdjustmentsList,
    totalAdjustmentsNet,
    realitySlices,
    budgetSlices,
  } = useMemo(() => {
    const spendingMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        totalSpent: number;
        totalInflow: number;
        netSpent: number;
        transactionCount: number;
        transactions: any[];
      }
    >();

    const transfers: AccountTransferItem[] = [];
    const balanceAdjustments: BalanceAdjustmentItem[] = [];
    const processedTransferIds = new Set<string>();
    let spendingTxCount = 0;

    // 1. Process transactions
    for (const tx of rawTransactions) {
      if (tx.deleted) continue;

      // Balance adjustment detection (debt_transaction_type === 'balanceAdjustment' or reconciliation payee/memo)
      const isTxBalanceAdjustment = Boolean(
        tx.debt_transaction_type === "balanceAdjustment" ||
        tx.payee_name?.toLowerCase().includes("balance adjustment") ||
        tx.payee_name?.toLowerCase().includes("reconciliation") ||
        tx.memo?.toLowerCase().includes("balance adjustment")
      );

      if (isTxBalanceAdjustment) {
        balanceAdjustments.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          accountName:
            tx.account_name ||
            accountsMap.get(tx.account_id) ||
            "Unknown Account",
          payeeName: tx.payee_name || "Reconciliation Balance Adjustment",
          memo: tx.memo,
          cleared: tx.cleared,
        });
        continue; // Exclude balance adjustments from spending & budget calculations
      }

      // Transfer detection
      const isTxTransfer = Boolean(
        tx.transfer_account_id ||
        tx.transfer_transaction_id ||
        tx.payee_name?.trim().toLowerCase().startsWith("transfer :") ||
        tx.payee_name?.trim().toLowerCase().startsWith("transfer:")
      );

      if (isTxTransfer) {
        if (!processedTransferIds.has(tx.id)) {
          processedTransferIds.add(tx.id);
          if (tx.transfer_transaction_id) {
            processedTransferIds.add(tx.transfer_transaction_id);
          }

          let fromAccount = "";
          let toAccount = "";

          const otherAccountFromPayee = tx.payee_name
            ? tx.payee_name.replace(/^transfer\s*:\s*/i, "").trim()
            : "";
          const otherAccountFromId = tx.transfer_account_id
            ? accountsMap.get(tx.transfer_account_id) || `Account (${tx.transfer_account_id})`
            : "";
          const resolvedOtherAccount =
            otherAccountFromPayee || otherAccountFromId || "Linked Account";

          if (tx.amount < 0) {
            fromAccount = tx.account_name || "Unknown Account";
            toAccount = resolvedOtherAccount;
          } else {
            fromAccount = resolvedOtherAccount;
            toAccount = tx.account_name || "Unknown Account";
          }

          transfers.push({
            id: tx.id,
            date: tx.date,
            amount: Math.abs(tx.amount),
            fromAccountName: fromAccount,
            toAccountName: toAccount,
            memo: tx.memo,
            cleared: tx.cleared,
            pairTransactionId: tx.transfer_transaction_id,
          });
        }
        continue; // Exclude transfers from spending calculations
      }

      // Subtransactions (split)
      if (tx.subtransactions && tx.subtransactions.length > 0) {
        for (const sub of tx.subtransactions) {
          if (sub.deleted) continue;

          // Check if subtransaction is a balance adjustment
          const isSubBalanceAdjustment = Boolean(
            (sub as any).debt_transaction_type === "balanceAdjustment" ||
            sub.payee_name?.toLowerCase().includes("balance adjustment") ||
            sub.payee_name?.toLowerCase().includes("reconciliation") ||
            sub.memo?.toLowerCase().includes("balance adjustment")
          );

          if (isSubBalanceAdjustment) {
            balanceAdjustments.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: sub.amount,
              accountName:
                tx.account_name ||
                accountsMap.get(tx.account_id) ||
                "Unknown Account",
              payeeName:
                sub.payee_name ||
                tx.payee_name ||
                "Reconciliation Balance Adjustment",
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });
            continue; // Exclude balance adjustments from spending & budget calculations
          }

          const isSubTransfer = Boolean(
            sub.transfer_account_id ||
            sub.payee_name?.trim().toLowerCase().startsWith("transfer :") ||
            sub.payee_name?.trim().toLowerCase().startsWith("transfer:")
          );

          if (isSubTransfer) {
            let fromAccount = "";
            let toAccount = "";
            const otherAccountFromPayee = sub.payee_name
              ? sub.payee_name.replace(/^transfer\s*:\s*/i, "").trim()
              : "";
            const otherAccountFromId = sub.transfer_account_id
              ? accountsMap.get(sub.transfer_account_id) || `Account (${sub.transfer_account_id})`
              : "";
            const resolvedOtherAccount =
              otherAccountFromPayee || otherAccountFromId || "Linked Account";

            if (sub.amount < 0) {
              fromAccount = tx.account_name || "Unknown Account";
              toAccount = resolvedOtherAccount;
            } else {
              fromAccount = resolvedOtherAccount;
              toAccount = tx.account_name || "Unknown Account";
            }

            transfers.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: Math.abs(sub.amount),
              fromAccountName: fromAccount,
              toAccountName: toAccount,
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });
            continue;
          }

          spendingTxCount++;
          const catId = sub.category_id || "uncategorized";
          const catName = sub.category_name || "Uncategorized";

          if (!spendingMap.has(catId)) {
            spendingMap.set(catId, {
              categoryId: catId,
              categoryName: catName,
              totalSpent: 0,
              totalInflow: 0,
              netSpent: 0,
              transactionCount: 0,
              transactions: [],
            });
          }

          const item = spendingMap.get(catId)!;
          item.transactionCount++;

          if (sub.amount < 0) {
            item.totalSpent += Math.abs(sub.amount);
          } else {
            item.totalInflow += sub.amount;
          }
          item.netSpent = item.totalSpent - item.totalInflow;

          item.transactions.push({
            id: `${tx.id}-${sub.id}`,
            date: tx.date,
            amount: sub.amount,
            payeeName: sub.payee_name || tx.payee_name || "Unknown Payee",
            memo: sub.memo || tx.memo,
          });
        }
      } else {
        // Standard transaction
        spendingTxCount++;
        const catId = tx.category_id || "uncategorized";
        const catName =
          tx.category_name ||
          (tx.amount > 0 ? "Inflow: Ready to Assign" : "Uncategorized");

        if (!spendingMap.has(catId)) {
          spendingMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            totalSpent: 0,
            totalInflow: 0,
            netSpent: 0,
            transactionCount: 0,
            transactions: [],
          });
        }

        const item = spendingMap.get(catId)!;
        item.transactionCount++;

        if (tx.amount < 0) {
          item.totalSpent += Math.abs(tx.amount);
        } else {
          item.totalInflow += tx.amount;
        }
        item.netSpent = item.totalSpent - item.totalInflow;

        item.transactions.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          payeeName: tx.payee_name || "Unknown Payee",
          memo: tx.memo,
        });
      }
    }

    // 2. Build local budget mapping for this month
    // Default behavior for new monthly budgets is empty (no fallback to category standard budgeted values)
    const budgetMap = new Map<string, number>();
    if (localBudget?.categories) {
      for (const b of localBudget.categories) {
        budgetMap.set(b.category_id, b.amount);
      }
    }

    // 3. Collect all category IDs (either has spending OR has a budget allocated)
    const allCategoryIds = new Set<string>();
    for (const [id, s] of spendingMap.entries()) {
      if (s.totalSpent > 0) allCategoryIds.add(id);
    }
    for (const [id, amt] of budgetMap.entries()) {
      if (amt > 0) allCategoryIds.add(id);
    }
    for (const c of categories) {
      if (!c.deleted && !c.hidden) {
        allCategoryIds.add(c.id);
      }
    }

    // 4. Build unified category summaries
    const combinedList: CategorySpendingSummary[] = [];

    allCategoryIds.forEach((catId) => {
      const spending = spendingMap.get(catId);
      const budgetedAmount = budgetMap.get(catId) || 0;
      const totalSpent = spending?.totalSpent || 0;

      // Skip categories that have 0 spending AND 0 budgeted
      if (totalSpent === 0 && budgetedAmount === 0) return;

      const catObj = categories.find((c) => c.id === catId);
      const categoryName =
        catObj?.name || spending?.categoryName || "Uncategorized";

      // Category spending progress calculation
      let progressPercentage = 0;
      if (budgetedAmount > 0) {
        progressPercentage = Math.round((totalSpent / budgetedAmount) * 100);
      } else if (totalSpent > 0) {
        progressPercentage = 100; // unbudgeted spending
      }

      const remainingAmount = budgetedAmount - totalSpent;
      const color =
        categoryColorMap.get(catId) ||
        COLOR_PALETTE[combinedList.length % COLOR_PALETTE.length];

      combinedList.push({
        categoryId: catId,
        categoryName,
        totalSpent,
        totalInflow: spending?.totalInflow || 0,
        netSpent: spending?.netSpent || 0,
        transactionCount: spending?.transactionCount || 0,
        transactions: spending?.transactions || [],
        budgetedAmount,
        progressPercentage,
        remainingAmount,
        color,
      });
    });

    // Sort categories: highest spending first, then highest budget
    combinedList.sort((a, b) => b.totalSpent - a.totalSpent || b.budgetedAmount - a.budgetedAmount);

    const totalSpentAll = combinedList.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalBudgetedAll = combinedList.reduce((acc, c) => acc + c.budgetedAmount, 0);

    const top = combinedList.find((c) => c.totalSpent > 0) || null;

    // Sort transfers by date descending
    transfers.sort((a, b) => b.date.localeCompare(a.date));
    const totalTransferredVolume = transfers.reduce((acc, c) => acc + c.amount, 0);

    // Sort balance adjustments by date descending
    balanceAdjustments.sort((a, b) => b.date.localeCompare(a.date));
    const totalAdjustmentsNet = balanceAdjustments.reduce((acc, c) => acc + c.amount, 0);

    // 5. Generate pie chart slices for Reality and Budget
    const realitySlices: PieChartSlice[] = combinedList
      .filter((c) => c.totalSpent > 0)
      .map((c) => ({
        id: c.categoryId,
        label: c.categoryName,
        value: c.totalSpent,
        color: c.color,
      }));

    const budgetSlices: PieChartSlice[] = combinedList
      .filter((c) => c.budgetedAmount > 0)
      .map((c) => ({
        id: c.categoryId,
        label: c.categoryName,
        value: c.budgetedAmount,
        color: c.color,
      }));

    return {
      categoryList: combinedList,
      totalSpending: totalSpentAll,
      totalBudgeted: totalBudgetedAll,
      totalSpendingTxCount: spendingTxCount,
      topCategory: top,
      transfersList: transfers,
      totalTransferred: totalTransferredVolume,
      balanceAdjustmentsList: balanceAdjustments,
      totalAdjustmentsNet,
      realitySlices,
      budgetSlices,
    };
  }, [rawTransactions, accountsMap, localBudget, categories, categoryColorMap]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryList;
    const q = searchQuery.toLowerCase();
    return categoryList.filter((cat) =>
      cat.categoryName.toLowerCase().includes(q)
    );
  }, [categoryList, searchQuery]);

  // Handle inline quick edit save
  const handleSaveInline = async (categoryId: string) => {
    const parsed = parseFloat(inlineAmountStr);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateCategoryAmount(categoryId, numberToMilliunits(parsed));
    }
    setInlineEditCatId(null);
    setInlineAmountStr("");
  };

  // Update all category budgets to match actual spending for this month
  const handleMatchAllToSpent = async () => {
    setIsMatchingSpent(true);
    try {
      // Only store category-amount pairs for categories with spending or active budget
      const newCategoryAmounts = categoryList
        .filter((c) => c.totalSpent > 0 || c.budgetedAmount > 0)
        .map((c) => ({
          category_id: c.categoryId,
          amount: c.totalSpent,
        }));

      await saveBudget(newCategoryAmounts);
      setMatchSuccess(true);
      setTimeout(() => setMatchSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to match budgets to spent:", err);
    } finally {
      setIsMatchingSpent(false);
    }
  };

  // Update a single category's budget to match its amount spent
  const handleMatchCategoryToSpent = async (categoryId: string, spentAmount: number) => {
    await updateCategoryAmount(categoryId, spentAmount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Budgets 2.0
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
              onClick={handlePrevMonth}
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
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all"
          >
            Current
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-teal-300 border border-teal-500/30 transition-all shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Edit Budget
          </button>

          <button
            onClick={fetchMonthTransactions}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
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

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold text-white">Error fetching transactions</p>
            <p className="text-rose-300/90 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchMonthTransactions}
            className="px-3 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-medium text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spending */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Month Spending</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {formatCurrency(totalSpending)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Actual outflows from API
          </p>
        </div>

        {/* Total Budgeted */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total Budgeted</span>
            <Target className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {formatCurrency(totalBudgeted)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Planned funds in local Budget
          </p>
        </div>

        {/* Total Spending Transactions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Spending Transactions</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {totalSpendingTxCount}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Excludes transfers &amp; adjustments
          </p>
        </div>

        {/* Top Spending Category */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Top Category</span>
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <div
            className="text-lg font-bold text-white mt-2 truncate"
            title={topCategory?.categoryName || "None"}
          >
            {topCategory?.categoryName || "None"}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono">
            {topCategory ? formatCurrency(topCategory.totalSpent) : "$0.00"}
          </p>
        </div>
      </div>

      {/* Two Pie Charts: Reality vs Budget Distribution */}
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

      {/* Category Spending Progress Breakdown Section */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Category Spending Progress
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Progress: Spent ÷ Budget
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Progress bars track actual expenses against your locally defined Budget for {formattedMonthLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-teal-500 focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleMatchAllToSpent}
              disabled={isMatchingSpent || categoryList.length === 0}
              title="Update all category budgets to match their current actual spending"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all shrink-0 disabled:opacity-50"
            >
              <Wand2
                className={`w-3.5 h-3.5 text-teal-400 ${
                  isMatchingSpent ? "animate-spin" : ""
                }`}
              />
              <span>
                {matchSuccess ? "Budgets Matched!" : "Match Budget to Spent"}
              </span>
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Edit All</span>
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && categoryList.length === 0 && (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-zinc-800/40 animate-pulse border border-zinc-800/60"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredCategories.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
            <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-300">
              No categories found
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              There are no categories with spending or budget amounts for {formattedMonthLabel}.
            </p>
          </div>
        )}

        {/* Categories List with Category Spending Progress */}
        <div className="space-y-3">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategoryId === cat.categoryId;
            const isEditing = inlineEditCatId === cat.categoryId;
            const isUnbudgeted =
              cat.budgetedAmount === 0 && cat.totalSpent > 0;
            const isOverBudget = cat.remainingAmount < 0;
            const isOverspentOrUnbudgeted = isOverBudget || isUnbudgeted;
            const isPerfect100 =
              cat.budgetedAmount > 0 && cat.totalSpent === cat.budgetedAmount;

            return (
              <div
                key={cat.categoryId}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700 transition-all overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Category Details & Spending Progress Bar */}
                  <div
                    onClick={() =>
                      !isEditing &&
                      setExpandedCategoryId(isExpanded ? null : cat.categoryId)
                    }
                    className="flex-1 min-w-0 space-y-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-bold text-white truncate">
                          {cat.categoryName}
                        </span>
                        {cat.transactionCount > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                            {cat.transactionCount}{" "}
                            {cat.transactionCount === 1 ? "tx" : "txs"}
                          </span>
                        )}
                        {isUnbudgeted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                            Unbudgeted
                          </span>
                        )}
                        {isPerfect100 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
                            100% Matched
                          </span>
                        )}
                      </div>

                      {/* Progress percentage */}
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          isOverspentOrUnbudgeted
                            ? "text-rose-400 font-bold"
                            : isPerfect100
                            ? "text-green-400 font-black drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]"
                            : cat.progressPercentage >= 85
                            ? "text-amber-400 font-bold"
                            : "text-zinc-300 font-semibold"
                        }`}
                      >
                        {isUnbudgeted ? ">100%" : `${cat.progressPercentage}%`}
                      </span>
                    </div>

                    {/* Category Spending Progress Bar (Spent ÷ Budget) */}
                    <div className="w-full">
                      <ProgressBar
                        value={isUnbudgeted ? 100 : cat.progressPercentage}
                        max={100}
                        height="sm"
                        variant={isOverspentOrUnbudgeted ? "rose" : "dynamic"}
                      />
                    </div>

                    {/* Subtext info */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                      <span className="truncate pr-2">
                        <strong
                          className={
                            isOverspentOrUnbudgeted
                              ? "text-rose-400 font-bold"
                              : isPerfect100
                              ? "text-green-400 font-bold"
                              : "text-zinc-200"
                          }
                        >
                          {formatCurrency(cat.totalSpent)}
                        </strong>{" "}
                        spent of{" "}
                        <span
                          className={
                            isPerfect100
                              ? "text-green-400 font-semibold"
                              : ""
                          }
                        >
                          {formatCurrency(cat.budgetedAmount)}
                        </span>{" "}
                        budgeted
                      </span>
                      <span
                        className={`shrink-0 ${
                          isOverspentOrUnbudgeted
                            ? "text-rose-400 font-semibold"
                            : isPerfect100
                            ? "text-green-400 font-bold"
                            : "text-zinc-400"
                        }`}
                      >
                        {isOverspentOrUnbudgeted
                          ? `${formatCurrency(Math.abs(cat.remainingAmount))} over`
                          : isPerfect100
                          ? "$0.00 left"
                          : `${formatCurrency(cat.remainingAmount)} left`}
                      </span>
                    </div>
                  </div>

                  {/* Budget & Actions Column - Fixed width so left progress bar width is identical across all rows */}
                  <div className="w-full sm:w-72 md:w-80 shrink-0 flex items-center justify-between sm:justify-end gap-2.5 sm:pl-5 sm:border-l sm:border-zinc-800/80">
                    {/* Inline Budget Editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={inlineAmountStr}
                            onChange={(e) => setInlineAmountStr(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInline(cat.categoryId);
                              if (e.key === "Escape") setInlineEditCatId(null);
                            }}
                            autoFocus
                            className="w-full pl-6 pr-2 py-1 rounded-lg bg-zinc-950 border border-teal-500 text-xs font-mono text-white focus:outline-hidden"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveInline(cat.categoryId)}
                          title="Save budget"
                          className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineEditCatId(null)}
                          title="Cancel"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Quick match spent shortcut for this specific category */}
                        {cat.budgetedAmount !== cat.totalSpent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchCategoryToSpent(cat.categoryId, cat.totalSpent);
                            }}
                            title={`Match budget to spent: ${formatCurrency(cat.totalSpent)}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-teal-500/10 hover:border-teal-500/30 border border-zinc-700/60 text-[11px] font-medium text-zinc-300 hover:text-teal-300 transition-all shrink-0"
                          >
                            <Equal className="w-3 h-3 text-teal-400" />
                            <span className="hidden xl:inline">Match Spent</span>
                          </button>
                        )}

                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-400">Budget:</span>
                            <span
                              className={`text-sm font-bold font-mono ${
                                isOverspentOrUnbudgeted
                                  ? "text-rose-400"
                                  : isPerfect100
                                  ? "text-green-400"
                                  : "text-white"
                              }`}
                            >
                              {formatCurrency(cat.budgetedAmount)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInlineEditCatId(cat.categoryId);
                                setInlineAmountStr(
                                  String(milliunitsToNumber(cat.budgetedAmount))
                                );
                              }}
                              title="Edit budget amount"
                              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expand icon */}
                    <div className="w-6 flex items-center justify-center shrink-0">
                      {cat.transactions.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategoryId(isExpanded ? null : cat.categoryId)
                          }
                          className="text-zinc-500 hover:text-zinc-300 p-1"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions for this Category */}
                {isExpanded && cat.transactions.length > 0 && (
                  <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-4 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 pb-1">
                      Transactions in this category ({cat.transactions.length})
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {cat.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-medium text-zinc-200">
                              {tx.payeeName}
                            </span>
                            {tx.memo && (
                              <span className="text-zinc-500 text-[11px] ml-2 italic">
                                &quot;{tx.memo}&quot;
                              </span>
                            )}
                            <div className="text-[10px] text-zinc-500">
                              {formatDate(tx.date)}
                            </div>
                          </div>
                          <div
                            className={`font-semibold font-mono ${
                              tx.amount < 0 ? "text-zinc-200" : "text-emerald-400"
                            }`}
                          >
                            {formatCurrency(tx.amount, { showSign: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Transfers Section (Split Out & Excluded from Spending Calculations) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Account Transfers
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-teal-300 border border-zinc-700/60">
                  {transfersList.length} {transfersList.length === 1 ? "transfer" : "transfers"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Internal funds moved between accounts •{" "}
                <span className="text-zinc-500">
                  Excluded from category spending &amp; totals
                </span>
              </p>
            </div>
          </div>

          {transfersList.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500">Total Transferred:</span>
              <span className="font-extrabold text-white font-mono">
                {formatCurrency(totalTransferred)}
              </span>
            </div>
          )}
        </div>

        {/* Transfers List */}
        {transfersList.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
            <ArrowRightLeft className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">
              No account transfers this month
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              No internal transfer activity detected in the transactions returned for{" "}
              {formattedMonthLabel}.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transfersList.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Accounts Involved & Date */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-white flex-wrap">
                    {/* From Account */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-semibold">{transfer.fromAccountName}</span>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />

                    {/* To Account */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/30 border border-teal-800/40 text-teal-200">
                      <Landmark className="w-3.5 h-3.5 text-teal-400" />
                      <span className="font-semibold">{transfer.toAccountName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>{formatDate(transfer.date)}</span>
                    {transfer.memo && (
                      <>
                        <span>•</span>
                        <span className="italic text-zinc-400">
                          &quot;{transfer.memo}&quot;
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount & Status */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-white font-mono">
                      {formatCurrency(transfer.amount)}
                    </div>
                    <span className="text-[10px] text-zinc-500 block">
                      Transfer
                    </span>
                  </div>
                  {transfer.cleared && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        transfer.cleared === "cleared"
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {transfer.cleared}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Balance Adjustments Section (Split Out & Excluded from Budget Calculations) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Balance Adjustments
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-purple-300 border border-zinc-700/60">
                  {balanceAdjustmentsList.length}{" "}
                  {balanceAdjustmentsList.length === 1 ? "adjustment" : "adjustments"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Account reconciliation corrections •{" "}
                <span className="text-zinc-500">
                  Excluded from budget spending &amp; category totals
                </span>
              </p>
            </div>
          </div>

          {balanceAdjustmentsList.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500">Net Adjustment:</span>
              <span
                className={`font-extrabold font-mono ${
                  totalAdjustmentsNet > 0
                    ? "text-emerald-400"
                    : totalAdjustmentsNet < 0
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {formatCurrency(totalAdjustmentsNet, { showSign: true })}
              </span>
            </div>
          )}
        </div>

        {/* Balance Adjustments List */}
        {balanceAdjustmentsList.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/30">
            <Scale className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">
              No balance adjustments this month
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              No reconciliation balance adjustments recorded for {formattedMonthLabel}.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {balanceAdjustmentsList.map((adj) => {
              const isPositive = adj.amount > 0;
              const isNegative = adj.amount < 0;

              return (
                <div
                  key={adj.id}
                  className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Account Involved, Payee & Date */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-white flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                        <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold">{adj.accountName}</span>
                      </div>
                      <span className="text-zinc-500">•</span>
                      <span className="font-medium text-zinc-300">{adj.payeeName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatDate(adj.date)}</span>
                      {adj.memo && (
                        <>
                          <span>•</span>
                          <span className="italic text-zinc-400">
                            &quot;{adj.memo}&quot;
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount & Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-4 sm:border-l sm:border-zinc-800">
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold font-mono ${
                          isPositive
                            ? "text-emerald-400"
                            : isNegative
                            ? "text-rose-400"
                            : "text-white"
                        }`}
                      >
                        {formatCurrency(adj.amount, { showSign: true })}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        Reconciliation
                      </span>
                    </div>
                    {adj.cleared && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          adj.cleared === "reconciled"
                            ? "bg-purple-950/40 text-purple-400 border border-purple-800/40"
                            : adj.cleared === "cleared"
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {adj.cleared}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Budget Modal */}
      <EditBudget2Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        planId={activePlanId}
        month={monthKey}
        monthLabel={formattedMonthLabel}
        categories={categories}
        currentBudget={localBudget}
      />
    </div>
  );
}
