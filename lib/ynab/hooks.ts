"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { syncManager } from "./sync";
import { SyncStatusState, BudgetSummary, Budget } from "./types";

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatusState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    syncManager.updatePendingCount();
    syncManager.startPeriodicSync(3);

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    sync: () => syncManager.sync(),
  };
}

export function useYNABData() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    db.initializeDefaults().then(() => {
      setIsInitialized(true);
    });
  }, []);

  const settings = useLiveQuery(() => db.settings.get("app_settings"));
  const plans = useLiveQuery(() => db.plans.toArray(), []);
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.deleted && !a.closed).toArray(),
    []
  );
  const categories = useLiveQuery(
    () => db.categories.filter((c) => !c.deleted && !c.hidden).toArray(),
    []
  );
  const categoryGroups = useLiveQuery(
    () => db.categoryGroups.filter((g) => !g.deleted && !g.hidden).toArray(),
    []
  );
  const transactions = useLiveQuery(
    () => db.transactions.filter((t) => !t.deleted).reverse().sortBy("date"),
    []
  );

  return {
    isInitialized,
    settings,
    plans: plans || [],
    accounts: accounts || [],
    categories: categories || [],
    categoryGroups: categoryGroups || [],
    transactions: transactions || [],
  };
}

export function useBudgetSummary(): BudgetSummary {
  const categories = useLiveQuery(
    () => db.categories.filter((c) => !c.deleted && !c.hidden).toArray(),
    []
  );

  if (!categories || categories.length === 0) {
    return {
      totalBudgeted: 0,
      totalSpent: 0,
      totalRemaining: 0,
      spendingPercentage: 0,
    };
  }

  let totalBudgeted = 0;
  let totalSpent = 0;

  for (const cat of categories) {
    // Only calculate for normal categories (not hidden or internal)
    totalBudgeted += cat.budgeted || 0;
    // Activity is negative for spending
    if (cat.activity < 0) {
      totalSpent += Math.abs(cat.activity);
    }
  }

  const totalRemaining = totalBudgeted - totalSpent;
  const spendingPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  return {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    spendingPercentage,
  };
}

export function useLocalBudget(planId?: string, month?: string) {
  const monthKey = month ? month.slice(0, 7) : "";
  const budgetId = planId && monthKey ? `${planId}:${monthKey}` : undefined;

  const budget = useLiveQuery(
    async () => {
      if (!budgetId) return undefined;
      return db.budgets.get(budgetId);
    },
    [budgetId]
  );

  const saveBudget = async (categoryAmounts: { category_id: string; amount: number }[]) => {
    if (!planId || !monthKey) return;
    const newBudget: Budget = {
      id: `${planId}:${monthKey}`,
      plan_id: planId,
      month: monthKey,
      categories: categoryAmounts,
      updated_at: new Date().toISOString(),
    };
    await db.budgets.put(newBudget);
  };

  const updateCategoryAmount = async (categoryId: string, amount: number) => {
    if (!planId || !monthKey) return;
    const current = (await db.budgets.get(`${planId}:${monthKey}`)) || {
      id: `${planId}:${monthKey}`,
      plan_id: planId,
      month: monthKey,
      categories: [],
      updated_at: new Date().toISOString(),
    };
    const existingIndex = current.categories.findIndex((c) => c.category_id === categoryId);
    const updatedCategories = [...current.categories];
    if (existingIndex >= 0) {
      updatedCategories[existingIndex] = { category_id: categoryId, amount };
    } else {
      updatedCategories.push({ category_id: categoryId, amount });
    }
    await db.budgets.put({
      ...current,
      categories: updatedCategories,
      updated_at: new Date().toISOString(),
    });
  };

  return {
    budget,
    saveBudget,
    updateCategoryAmount,
  };
}
