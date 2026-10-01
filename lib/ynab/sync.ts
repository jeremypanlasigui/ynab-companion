/**
 * Sync orchestration engine for offline-first YNAB companion app
 */

import { db } from "./db";
import { SyncStatusState } from "./types";

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

      if (!this.state.isOnline) {
        this.state.isSyncing = false;
        this.state.error = "Offline: Changes saved locally. Will sync when back online.";
        this.notify();
        return false;
      }

      // Execute sync securely via Next.js server API
      const res = await fetch("/api/ynab/sync", {
        method: "POST",
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error || `Server sync failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        await db.populateFromData(json.data);
        if (json.data.settings?.last_synced_at) {
          this.state.lastSyncedAt = json.data.settings.last_synced_at;
        }
      }

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
