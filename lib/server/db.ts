import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  AppSettings,
  PlanSummary,
  Account,
  CategoryGroup,
  Category,
  TransactionDetail,
  Budget,
  SyncQueueItem,
} from "../ynab/types";
import {
  DEMO_PLAN,
  DEMO_ACCOUNTS,
  DEMO_CATEGORY_GROUPS,
  DEMO_CATEGORIES,
  DEMO_TRANSACTIONS,
  DEMO_SETTINGS,
  DEMO_PLAN_ID,
} from "../ynab/demo-data";
import {
  encryptPayload,
  decryptPayload,
  encryptString,
  decryptString,
} from "./crypto";

class ServerDatabase {
  private db: DatabaseSync;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "budget.sqlite");
    this.db = new DatabaseSync(dbPath);

    // Optimize SQLite with Write-Ahead Logging
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA synchronous = NORMAL;");

    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        encrypted_token TEXT,
        selected_plan_id TEXT,
        selected_plan_name TEXT,
        is_demo_mode INTEGER,
        last_server_knowledge INTEGER,
        last_synced_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT,
        last_modified_on TEXT,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        name TEXT,
        type TEXT,
        on_budget INTEGER,
        closed INTEGER,
        deleted INTEGER,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS category_groups (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        name TEXT,
        hidden INTEGER,
        deleted INTEGER,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        category_group_id TEXT,
        name TEXT,
        hidden INTEGER,
        deleted INTEGER,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        account_id TEXT,
        category_id TEXT,
        date TEXT,
        deleted INTEGER,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        month TEXT,
        encrypted_payload TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        encrypted_payload TEXT,
        created_at TEXT,
        attempts INTEGER,
        last_error TEXT
      );
    `);
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  public getSettings(): AppSettings | null {
    const stmt = this.db.prepare("SELECT * FROM settings WHERE id = 'app_settings' LIMIT 1");
    const row = stmt.get() as any;
    if (!row) return null;

    let decryptedToken = "";
    if (row.encrypted_token) {
      try {
        decryptedToken = decryptString(row.encrypted_token);
      } catch (err) {
        console.error("Failed to decrypt stored YNAB token:", err);
      }
    }

    // Fall back to environment variable if token is empty
    if (!decryptedToken && process.env.YNAB_ACCESS_TOKEN?.trim()) {
      decryptedToken = process.env.YNAB_ACCESS_TOKEN.trim();
    }

    return {
      id: "app_settings",
      api_token: decryptedToken,
      selected_plan_id: row.selected_plan_id || "",
      selected_plan_name: row.selected_plan_name || "",
      is_demo_mode: Boolean(row.is_demo_mode),
      last_server_knowledge: row.last_server_knowledge || 0,
      last_synced_at: row.last_synced_at || null,
    };
  }

  public getEffectiveToken(): string {
    const s = this.getSettings();
    return s?.api_token || process.env.YNAB_ACCESS_TOKEN?.trim() || "";
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings() || {
      id: "app_settings",
      api_token: "",
      selected_plan_id: "",
      selected_plan_name: "",
      is_demo_mode: true,
      last_server_knowledge: 0,
      last_synced_at: null,
    };

    const merged: AppSettings = {
      ...current,
      ...settings,
    };

    const encryptedToken = merged.api_token ? encryptString(merged.api_token) : "";

    const stmt = this.db.prepare(`
      INSERT INTO settings (id, encrypted_token, selected_plan_id, selected_plan_name, is_demo_mode, last_server_knowledge, last_synced_at, updated_at)
      VALUES ('app_settings', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        encrypted_token = excluded.encrypted_token,
        selected_plan_id = excluded.selected_plan_id,
        selected_plan_name = excluded.selected_plan_name,
        is_demo_mode = excluded.is_demo_mode,
        last_server_knowledge = excluded.last_server_knowledge,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      encryptedToken,
      merged.selected_plan_id,
      merged.selected_plan_name || "",
      merged.is_demo_mode ? 1 : 0,
      merged.last_server_knowledge,
      merged.last_synced_at,
      new Date().toISOString()
    );

    return merged;
  }

  // ==========================================
  // PLANS
  // ==========================================
  public getPlans(): PlanSummary[] {
    const rows = this.db.prepare("SELECT * FROM plans").all() as any[];
    return rows.map((r) => {
      let payload: any = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt plan payload:", err);
      }
      return {
        id: r.id,
        name: r.name,
        last_modified_on: r.last_modified_on,
        first_month: payload.first_month || "",
        last_month: payload.last_month || "",
        date_format: payload.date_format,
        currency_format: payload.currency_format,
      };
    });
  }

  public savePlans(plans: PlanSummary[]) {
    const stmt = this.db.prepare(`
      INSERT INTO plans (id, name, last_modified_on, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        last_modified_on = excluded.last_modified_on,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `);

    for (const p of plans) {
      const payload = {
        first_month: p.first_month,
        last_month: p.last_month,
        date_format: p.date_format,
        currency_format: p.currency_format,
      };
      stmt.run(p.id, p.name, p.last_modified_on, encryptPayload(payload), new Date().toISOString());
    }
  }

  // ==========================================
  // ACCOUNTS
  // ==========================================
  public getAccounts(): Account[] {
    const rows = this.db.prepare("SELECT * FROM accounts WHERE deleted = 0").all() as any[];
    return rows.map((r) => {
      let payload: any = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt account payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        name: r.name,
        type: r.type,
        on_budget: Boolean(r.on_budget),
        closed: Boolean(r.closed),
        deleted: Boolean(r.deleted),
        balance: payload.balance ?? 0,
        cleared_balance: payload.cleared_balance ?? 0,
        uncleared_balance: payload.uncleared_balance ?? 0,
        note: payload.note || null,
        transfer_payee_id: payload.transfer_payee_id || null,
      };
    });
  }

  public saveAccounts(accounts: Account[]) {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, plan_id, name, type, on_budget, closed, deleted, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        name = excluded.name,
        type = excluded.type,
        on_budget = excluded.on_budget,
        closed = excluded.closed,
        deleted = excluded.deleted,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `);

    for (const a of accounts) {
      const payload = {
        balance: a.balance,
        cleared_balance: a.cleared_balance,
        uncleared_balance: a.uncleared_balance,
        note: a.note,
        transfer_payee_id: a.transfer_payee_id,
      };
      stmt.run(
        a.id,
        a.plan_id || "",
        a.name,
        a.type,
        a.on_budget ? 1 : 0,
        a.closed ? 1 : 0,
        a.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString()
      );
    }
  }

  // ==========================================
  // CATEGORIES & GROUPS
  // ==========================================
  public getCategoryGroups(): CategoryGroup[] {
    const rows = this.db.prepare("SELECT * FROM category_groups WHERE deleted = 0").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      plan_id: r.plan_id,
      name: r.name,
      hidden: Boolean(r.hidden),
      deleted: Boolean(r.deleted),
    }));
  }

  public saveCategoryGroups(groups: CategoryGroup[]) {
    const stmt = this.db.prepare(`
      INSERT INTO category_groups (id, plan_id, name, hidden, deleted, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        name = excluded.name,
        hidden = excluded.hidden,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    `);

    for (const g of groups) {
      stmt.run(
        g.id,
        g.plan_id || "",
        g.name,
        g.hidden ? 1 : 0,
        g.deleted ? 1 : 0,
        "",
        new Date().toISOString()
      );
    }
  }

  public getCategories(): Category[] {
    const rows = this.db.prepare("SELECT * FROM categories WHERE deleted = 0").all() as any[];
    return rows.map((r) => {
      let payload: any = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt category payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        category_group_id: r.category_group_id,
        name: r.name,
        hidden: Boolean(r.hidden),
        deleted: Boolean(r.deleted),
        budgeted: payload.budgeted ?? 0,
        activity: payload.activity ?? 0,
        balance: payload.balance ?? 0,
        note: payload.note || null,
        goal_type: payload.goal_type || null,
        goal_target: payload.goal_target || null,
        goal_percentage_complete: payload.goal_percentage_complete || null,
      };
    });
  }

  public saveCategories(categories: Category[]) {
    const stmt = this.db.prepare(`
      INSERT INTO categories (id, plan_id, category_group_id, name, hidden, deleted, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        category_group_id = excluded.category_group_id,
        name = excluded.name,
        hidden = excluded.hidden,
        deleted = excluded.deleted,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `);

    for (const c of categories) {
      const payload = {
        budgeted: c.budgeted,
        activity: c.activity,
        balance: c.balance,
        note: c.note,
        goal_type: c.goal_type,
        goal_target: c.goal_target,
        goal_percentage_complete: c.goal_percentage_complete,
      };
      stmt.run(
        c.id,
        c.plan_id || "",
        c.category_group_id,
        c.name,
        c.hidden ? 1 : 0,
        c.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString()
      );
    }
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  public getTransactions(): TransactionDetail[] {
    const rows = this.db.prepare("SELECT * FROM transactions WHERE deleted = 0 ORDER BY date DESC").all() as any[];
    return rows.map((r) => {
      let payload: any = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt transaction payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        account_id: r.account_id,
        category_id: r.category_id,
        date: r.date,
        deleted: Boolean(r.deleted),
        amount: payload.amount ?? 0,
        memo: payload.memo || null,
        cleared: payload.cleared || "uncleared",
        approved: payload.approved ?? true,
        flag_color: payload.flag_color || null,
        account_name: payload.account_name || "",
        payee_name: payload.payee_name || "",
        category_name: payload.category_name || "",
        subtransactions: payload.subtransactions,
        is_local: payload.is_local,
      };
    });
  }

  public saveTransactions(transactions: TransactionDetail[]) {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, plan_id, account_id, category_id, date, deleted, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        account_id = excluded.account_id,
        category_id = excluded.category_id,
        date = excluded.date,
        deleted = excluded.deleted,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `);

    for (const t of transactions) {
      const payload = {
        amount: t.amount,
        memo: t.memo,
        cleared: t.cleared,
        approved: t.approved,
        flag_color: t.flag_color,
        account_name: t.account_name,
        payee_name: t.payee_name,
        category_name: t.category_name,
        subtransactions: t.subtransactions,
        is_local: t.is_local,
      };
      stmt.run(
        t.id,
        t.plan_id || "",
        t.account_id,
        t.category_id || "",
        t.date,
        t.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString()
      );
    }
  }

  public deleteTransaction(id: string) {
    this.db.prepare("UPDATE transactions SET deleted = 1, updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );
  }

  // ==========================================
  // BUDGETS
  // ==========================================
  public getBudgets(): Budget[] {
    const rows = this.db.prepare("SELECT * FROM budgets").all() as any[];
    return rows.map((r) => {
      let payload: any = { categories: [] };
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt budget payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        month: r.month,
        categories: payload.categories || [],
        updated_at: r.updated_at,
      };
    });
  }

  public saveBudget(budget: Budget) {
    const stmt = this.db.prepare(`
      INSERT INTO budgets (id, plan_id, month, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        month = excluded.month,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      budget.id,
      budget.plan_id,
      budget.month,
      encryptPayload({ categories: budget.categories }),
      budget.updated_at || new Date().toISOString()
    );
  }

  // ==========================================
  // SYNC QUEUE
  // ==========================================
  public getSyncQueue(): SyncQueueItem[] {
    const rows = this.db.prepare("SELECT * FROM sync_queue ORDER BY id ASC").all() as any[];
    return rows.map((r) => {
      let payload: any = null;
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt sync queue payload:", err);
      }
      return {
        id: r.id,
        type: r.type,
        payload,
        createdAt: r.created_at,
        attempts: r.attempts,
        lastError: r.last_error,
      };
    });
  }

  public addSyncQueueItem(item: SyncQueueItem): number {
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (type, encrypted_payload, created_at, attempts, last_error)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      item.type,
      encryptPayload(item.payload),
      item.createdAt || new Date().toISOString(),
      item.attempts || 0,
      item.lastError || null
    );
    return Number(res.lastInsertRowid);
  }

  public deleteSyncQueueItem(id: number) {
    this.db.prepare("DELETE FROM sync_queue WHERE id = ?").run(id);
  }

  public clearSyncQueue() {
    this.db.exec("DELETE FROM sync_queue;");
  }

  // ==========================================
  // BOOTSTRAP & SEED
  // ==========================================
  public getBootstrapData() {
    let settings = this.getSettings();
    if (!settings) {
      this.seedDemoData();
      settings = this.getSettings();
    }

    return {
      settings: settings!,
      plans: this.getPlans(),
      accounts: this.getAccounts(),
      categoryGroups: this.getCategoryGroups(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      syncQueue: this.getSyncQueue(),
    };
  }

  public seedDemoData(force = false) {
    if (force) {
      this.db.exec(`
        DELETE FROM plans;
        DELETE FROM accounts;
        DELETE FROM category_groups;
        DELETE FROM categories;
        DELETE FROM transactions;
        DELETE FROM budgets;
        DELETE FROM sync_queue;
        DELETE FROM settings;
      `);
    }

    this.savePlans([DEMO_PLAN]);
    this.saveAccounts(DEMO_ACCOUNTS);
    this.saveCategoryGroups(DEMO_CATEGORY_GROUPS);
    this.saveCategories(DEMO_CATEGORIES);
    this.saveTransactions(DEMO_TRANSACTIONS);
    this.saveSettings(DEMO_SETTINGS);

    this.saveBudget({
      id: `${DEMO_PLAN_ID}:2026-09`,
      plan_id: DEMO_PLAN_ID,
      month: "2026-09",
      categories: DEMO_CATEGORIES.map((c) => ({
        category_id: c.id,
        amount: c.budgeted,
      })),
      updated_at: new Date().toISOString(),
    });
  }
}

export const serverDb = new ServerDatabase();
