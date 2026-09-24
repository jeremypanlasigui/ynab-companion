/**
 * Sync orchestration engine for offline-first YNAB companion app
 */

import { db } from "./db";
import { YNABApiClient } from "./api";
import { SyncStatusState, SyncQueueItem, Category } from "./types";

type SyncListener = (state: SyncStatusState) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private state: SyncStatusState = {
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  };
  private autoSyncInterval: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.state.isOnline = navigator.onLine;
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
      this.updatePendingCount();
    }
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  private handleOnline() {
    this.state.isOnline = true;
    this.state.error = null;
    this.notify();
    // Auto-sync when coming back online
    this.sync();
  }

  private handleOffline() {
    this.state.isOnline = false;
    this.notify();
  }

  public async updatePendingCount() {
    try {
      const count = await db.syncQueue.count();
      this.state.pendingCount = count;
      const settings = await db.settings.get("app_settings");
      if (settings?.last_synced_at) {
        this.state.lastSyncedAt = settings.last_synced_at;
      }
      this.notify();
    } catch {
      // Ignore during SSR or initial db setup
    }
  }

  public async sync(): Promise<boolean> {
    if (this.state.isSyncing) return false;

    try {
      this.state.isSyncing = true;
      this.state.error = null;
      this.notify();

      const settings = await db.settings.get("app_settings");
      if (!settings) {
        await db.initializeDefaults();
      }
      const currentSettings = await db.settings.get("app_settings");
      if (!currentSettings) {
        this.state.isSyncing = false;
        this.notify();
        return false;
      }

      // If in demo mode or without token, simulate instant local sync
      if (currentSettings.is_demo_mode || !currentSettings.api_token) {
        // Drain local queue in demo mode
        await db.syncQueue.clear();
        currentSettings.last_synced_at = new Date().toISOString();
        await db.settings.put(currentSettings);
        this.state.lastSyncedAt = currentSettings.last_synced_at;
        this.state.pendingCount = 0;
        this.state.isSyncing = false;
        this.notify();
        return true;
      }

      // Live mode with token
      if (!this.state.isOnline) {
        this.state.isSyncing = false;
        this.state.error = "Offline: Changes saved locally. Will sync when back online.";
        this.notify();
        return false;
      }

      const client = new YNABApiClient(currentSettings.api_token);
      const planId = currentSettings.selected_plan_id;

      // 1. Drain pending queue
      const queueItems = await db.syncQueue.toArray();
      for (const item of queueItems) {
        try {
          if (item.type === "CREATE_TRANSACTION") {
            await client.createTransaction(item.payload.plan_id, item.payload.transaction);
            if (item.id) await db.syncQueue.delete(item.id);
          } else if (item.type === "UPDATE_CATEGORY_BUDGET") {
            await client.updateCategoryBudget(
              item.payload.plan_id,
              item.payload.month,
              item.payload.category_id,
              item.payload.budgeted
            );
            if (item.id) await db.syncQueue.delete(item.id);
          } else if (item.type === "DELETE_TRANSACTION") {
            await client.deleteTransaction(item.payload.plan_id, item.payload.transaction_id);
            if (item.id) await db.syncQueue.delete(item.id);
          }
        } catch (err: any) {
          console.error("Sync item failed:", item, err);
          if (item.id) {
            item.attempts = (item.attempts || 0) + 1;
            item.lastError = err?.message || String(err);
            await db.syncQueue.put(item);
          }
        }
      }

      // 2. Fetch fresh data from YNAB
      const fullPlanResponse = await client.getPlan(
        planId,
        currentSettings.last_server_knowledge || undefined
      );

      const serverKnowledge = fullPlanResponse.server_knowledge;
      const planData = fullPlanResponse.plan;

      await db.transaction("rw", [
        db.accounts,
        db.categoryGroups,
        db.categories,
        db.transactions,
        db.settings,
      ], async () => {
        if (planData.accounts?.length) {
          const accountsWithPlan = planData.accounts.map((acc: any) => ({
            ...acc,
            plan_id: planId,
          }));
          await db.accounts.bulkPut(accountsWithPlan);
        }

        if (planData.category_groups?.length) {
          const groups = planData.category_groups.map((cg: any) => ({
            id: cg.id,
            name: cg.name,
            hidden: cg.hidden,
            deleted: cg.deleted,
            plan_id: planId,
          }));
          await db.categoryGroups.bulkPut(groups);
        }

        if (planData.categories?.length) {
          const categoriesWithPlan = planData.categories.map((c: any) => ({
            ...c,
            plan_id: planId,
          }));
          await db.categories.bulkPut(categoriesWithPlan);
        }

        if (planData.transactions?.length) {
          const txsWithPlan = planData.transactions.map((tx: any) => ({
            ...tx,
            plan_id: planId,
          }));
          await db.transactions.bulkPut(txsWithPlan);
        }

        currentSettings.last_server_knowledge = serverKnowledge;
        currentSettings.last_synced_at = new Date().toISOString();
        await db.settings.put(currentSettings);
      });

      this.state.lastSyncedAt = currentSettings.last_synced_at;
      this.state.pendingCount = await db.syncQueue.count();
      this.state.isSyncing = false;
      this.notify();
      return true;
    } catch (err: any) {
      console.error("Sync error:", err);
      this.state.isSyncing = false;
      this.state.error = err?.message || "Sync failed. Will retry automatically.";
      this.notify();
      return false;
    }
  }

  public startPeriodicSync(intervalMinutes = 5) {
    if (this.autoSyncInterval) return;
    this.autoSyncInterval = setInterval(() => {
      if (this.state.isOnline) {
        this.sync();
      }
    }, intervalMinutes * 60 * 1000);
  }

  public stopPeriodicSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }
}

export const syncManager = new SyncManager();
