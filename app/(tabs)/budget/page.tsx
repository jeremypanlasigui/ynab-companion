"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useYNABData, useLocalBudget } from "@/lib/ynab/hooks";
import { YNABApiClient } from "@/lib/ynab/api";
import { TransactionDetail } from "@/lib/ynab/types";
import { DEMO_TRANSACTIONS, DEMO_PLAN_ID } from "@/lib/ynab/demo-data";
import { db } from "@/lib/ynab/db";
import { EditBudget2Modal } from "@/components/ynab/EditBudget2Modal";
import { ConfigureIncomeCategoriesModal } from "@/components/ynab/ConfigureIncomeCategoriesModal";
import { AlertCircle } from "lucide-react";
import {
  useBudgetCalculations,
  MonthNavigator,
  BudgetKpiCards,
  DistributionCharts,
  IncomeBreakdownSection,
  CategorySpendingSection,
  TransfersSection,
  AdjustmentsAndStartingBalancesSection,
} from "@/components/ynab/budget";

export default function BudgetPage() {
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
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<"api" | "demo">("demo");
  const [isMatchingSpent, setIsMatchingSpent] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIncomeConfigOpen, setIsIncomeConfigOpen] = useState(false);

  // Derive selected income categories reactively from encrypted database AppSettings
  const selectedIncomeCategoryIds = useMemo(() => {
    const list = settings?.income_category_ids_by_plan?.[activePlanId];
    if (list && list.length > 0) {
      return new Set(list);
    }

    // One-time automatic migration: if legacy localStorage exists, read and migrate into DB
    if (typeof window !== "undefined" && activePlanId) {
      const stored = localStorage.getItem(`ynab_income_categories_${activePlanId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            void db.saveIncomeCategories(activePlanId, parsed);
            localStorage.removeItem(`ynab_income_categories_${activePlanId}`);
            return new Set(parsed);
          }
        } catch {}
      }
    }

    return new Set(["cat-inflow", "cat-side-income", "inflow:ready-to-assign"]);
  }, [settings?.income_category_ids_by_plan, activePlanId]);

  const handleSaveIncomeCategories = async (newSelected: Set<string>) => {
    await db.saveIncomeCategories(activePlanId, Array.from(newSelected));
  };

  // Fetch transactions using getTransactionsByMonth endpoint
  const fetchMonthTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (
        !settings?.is_demo_mode &&
        settings?.api_token &&
        settings?.selected_plan_id
      ) {
        const client = new YNABApiClient(settings.api_token);
        const response = await client.getTransactionsByMonth(
          settings.selected_plan_id,
          selectedMonth
        );
        setRawTransactions(response.transactions || []);
        setDataSource("api");
      } else {
        const monthPrefix = selectedMonth.slice(0, 7);
        const filtered = DEMO_TRANSACTIONS.filter((tx) =>
          tx.date ? tx.date.startsWith(monthPrefix) : true
        );
        const finalTxs = filtered.length > 0 ? filtered : DEMO_TRANSACTIONS;
        setRawTransactions(finalTxs);
        setDataSource("demo");
      }
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      console.error("Failed to fetch getTransactionsByMonth:", err);
      const msg = err instanceof Error ? err.message : "Failed to load transactions for month.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [settings, selectedMonth]);

  useEffect(() => {
    let ignore = false;
    if (isInitialized) {
      const runFetch = async () => {
        setIsLoading(true);
        setError(null);
        try {
          if (
            !settings?.is_demo_mode &&
            settings?.api_token &&
            settings?.selected_plan_id
          ) {
            const client = new YNABApiClient(settings.api_token);
            const response = await client.getTransactionsByMonth(
              settings.selected_plan_id,
              selectedMonth
            );
            if (!ignore) {
              setRawTransactions(response.transactions || []);
              setDataSource("api");
            }
          } else {
            const monthPrefix = selectedMonth.slice(0, 7);
            const filtered = DEMO_TRANSACTIONS.filter((tx) =>
              tx.date ? tx.date.startsWith(monthPrefix) : true
            );
            const finalTxs = filtered.length > 0 ? filtered : DEMO_TRANSACTIONS;
            if (!ignore) {
              setRawTransactions(finalTxs);
              setDataSource("demo");
            }
          }
          if (!ignore) setLastFetchedAt(new Date());
        } catch (err: unknown) {
          if (!ignore) {
            console.error("Failed to fetch getTransactionsByMonth:", err);
            const msg = err instanceof Error ? err.message : "Failed to load transactions for month.";
            setError(msg);
          }
        } finally {
          if (!ignore) setIsLoading(false);
        }
      };

      void runFetch();
    }

    return () => {
      ignore = true;
    };
  }, [isInitialized, settings, selectedMonth]);

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

  // Execute modular calculation hook
  const {
    categoryList,
    totalSpending,
    totalBudgeted,
    transfersList,
    totalTransferred,
    balanceAdjustmentsList,
    totalAdjustmentsNet,
    accountsAddedList,
    totalAccountsAddedNet,
    totalMonthIncome,
    incomeCategoryBreakdown,
    incomePayeeBreakdown,
    netCashflow,
    savingsRate,
    categoryInflowMap,
    realitySlices,
    budgetSlices,
  } = useBudgetCalculations({
    rawTransactions,
    categories,
    accounts,
    localBudget,
    selectedIncomeCategoryIds,
  });

  // Filter categories based on search input
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryList;
    const q = searchQuery.toLowerCase();
    return categoryList.filter((cat) =>
      cat.categoryName.toLowerCase().includes(q)
    );
  }, [categoryList, searchQuery]);

  // Save inline category amount
  const handleSaveInline = async (categoryId: string, amountMilliunits: number) => {
    await updateCategoryAmount(categoryId, amountMilliunits);
  };

  // Match all categories to actual spent
  const handleMatchAllToSpent = async () => {
    setIsMatchingSpent(true);
    try {
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

  // Match single category to actual spent
  const handleMatchCategoryToSpent = async (categoryId: string, spentAmount: number) => {
    await updateCategoryAmount(categoryId, spentAmount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Month Navigator Header & Ribbon */}
      <MonthNavigator
        formattedMonthLabel={formattedMonthLabel}
        selectedMonth={selectedMonth}
        monthKey={monthKey}
        dataSource={dataSource}
        lastFetchedAt={lastFetchedAt}
        isLoading={isLoading}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onCurrentMonth={handleCurrentMonth}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onRefresh={fetchMonthTransactions}
      />

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
      <BudgetKpiCards
        totalMonthIncome={totalMonthIncome}
        totalSpending={totalSpending}
        totalBudgeted={totalBudgeted}
        netCashflow={netCashflow}
        savingsRate={savingsRate}
        incomeCategoryBreakdown={incomeCategoryBreakdown}
        incomePayeeBreakdown={incomePayeeBreakdown}
      />

      {/* Two Pie Charts: Reality vs Budget Distribution */}
      <DistributionCharts
        realitySlices={realitySlices}
        budgetSlices={budgetSlices}
        formattedMonthLabel={formattedMonthLabel}
        monthKey={monthKey}
      />

      {/* Income Section */}
      <IncomeBreakdownSection
        totalMonthIncome={totalMonthIncome}
        netCashflow={netCashflow}
        savingsRate={savingsRate}
        incomeCategoryBreakdown={incomeCategoryBreakdown}
        incomePayeeBreakdown={incomePayeeBreakdown}
        selectedIncomeCategoryIds={selectedIncomeCategoryIds}
        formattedMonthLabel={formattedMonthLabel}
        onOpenIncomeConfig={() => setIsIncomeConfigOpen(true)}
      />

      {/* Category Spending Progress Breakdown Section */}
      <CategorySpendingSection
        filteredCategories={filteredCategories}
        categoryList={categoryList}
        formattedMonthLabel={formattedMonthLabel}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={isLoading}
        isMatchingSpent={isMatchingSpent}
        matchSuccess={matchSuccess}
        onMatchAllToSpent={handleMatchAllToSpent}
        onMatchCategoryToSpent={handleMatchCategoryToSpent}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onSaveInline={handleSaveInline}
      />

      {/* Account Transfers Section */}
      <TransfersSection
        transfersList={transfersList}
        totalTransferred={totalTransferred}
        formattedMonthLabel={formattedMonthLabel}
      />

      {/* Balance Adjustments & Starting Balances Section */}
      <AdjustmentsAndStartingBalancesSection
        balanceAdjustmentsList={balanceAdjustmentsList}
        totalAdjustmentsNet={totalAdjustmentsNet}
        accountsAddedList={accountsAddedList}
        totalAccountsAddedNet={totalAccountsAddedNet}
        formattedMonthLabel={formattedMonthLabel}
      />

      {/* Configure Income Categories Modal */}
      <ConfigureIncomeCategoriesModal
        isOpen={isIncomeConfigOpen}
        onClose={() => setIsIncomeConfigOpen(false)}
        categories={categories}
        selectedCategoryIds={selectedIncomeCategoryIds}
        categoryInflowsThisMonth={categoryInflowMap}
        onSave={handleSaveIncomeCategories}
      />

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
