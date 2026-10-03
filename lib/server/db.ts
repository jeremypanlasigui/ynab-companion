import { DatabaseSync } from "node:sqlite";
import { Pool, PoolConfig } from "pg";
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
  ReceiptIngestion,
  PurchasedGood,
} from "../ynab/types";
import {
  DEMO_PLAN,
  DEMO_ACCOUNTS,
  DEMO_CATEGORY_GROUPS,
  DEMO_CATEGORIES,
  DEMO_TRANSACTIONS,
  DEMO_SETTINGS,
  DEMO_PLAN_ID,
  DEMO_RECEIPTS,
} from "../ynab/demo-data";
import {
  encryptPayload,
  decryptPayload,
  encryptString,
  decryptString,
} from "./crypto";

// ==========================================
// ADAPTER INTERFACE & ROW TYPES
// ==========================================
export interface QueryResult<T = unknown> {
  rows: T[];
  lastInsertId?: number;
  rowCount?: number;
}

export interface IDatabaseDriver {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult<never>>;
  init(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getDriverName(): "sqlite" | "postgres";
  close(): Promise<void>;
}

interface SettingsRow {
  id: string;
  encrypted_token: string | null;
  selected_plan_id: string | null;
  selected_plan_name: string | null;
  is_demo_mode: number | null;
  last_server_knowledge: number | null;
  last_synced_at: string | null;
  encrypted_income_categories: string | null;
  updated_at: string | null;
}

interface PlanRow {
  id: string;
  name: string;
  last_modified_on: string;
  encrypted_payload: string | null;
  updated_at: string;
}

interface AccountRow {
  id: string;
  plan_id: string;
  name: string;
  type: string;
  on_budget: number;
  closed: number;
  deleted: number;
  encrypted_payload: string | null;
  updated_at: string;
}

interface CategoryGroupRow {
  id: string;
  plan_id: string;
  name: string;
  hidden: number;
  deleted: number;
  encrypted_payload: string | null;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  plan_id: string;
  category_group_id: string;
  name: string;
  hidden: number;
  deleted: number;
  encrypted_payload: string | null;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  plan_id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  deleted: number;
  encrypted_payload: string | null;
  updated_at: string;
}

interface BudgetRow {
  id: string;
  plan_id: string;
  month: string;
  encrypted_payload: string | null;
  updated_at: string;
}

interface SyncQueueRow {
  id: number;
  type: string;
  encrypted_payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

interface ReceiptRow {
  id: string;
  plan_id: string;
  date: string;
  vendor: string;
  status: string;
  matched_transaction_id: string | null;
  encrypted_payload: string | null;
  updated_at: string;
}

// ==========================================
// SQLITE DRIVER (Local Development)
// ==========================================
class SqliteDriver implements IDatabaseDriver {
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
  }

  public async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        encrypted_token TEXT,
        selected_plan_id TEXT,
        selected_plan_name TEXT,
        is_demo_mode INTEGER,
        last_server_knowledge INTEGER,
        last_synced_at TEXT,
        encrypted_income_categories TEXT,
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

      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        date TEXT,
        vendor TEXT,
        status TEXT,
        matched_transaction_id TEXT,
        encrypted_payload TEXT,
        updated_at TEXT
      );
    `);

    try {
      this.db.exec("ALTER TABLE settings ADD COLUMN encrypted_income_categories TEXT;");
    } catch {
      // Column already exists
    }
  }

  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const stmt = this.db.prepare(sql);
    const rows = (stmt.all(...(params as any[])) as unknown[]) as T[];
    return { rows, rowCount: rows.length };
  }

  public async execute(sql: string, params: unknown[] = []): Promise<QueryResult<never>> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params as any[]));
    return {
      rows: [],
      lastInsertId: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
      rowCount: Number(result.changes),
    };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.query("SELECT 1 as alive");
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  public getDriverName(): "sqlite" | "postgres" {
    return "sqlite";
  }

  public async close(): Promise<void> {
    this.db.close();
  }
}

// ==========================================
// POSTGRES DRIVER (GCP Cloud SQL / Remote)
// ==========================================
class PostgresDriver implements IDatabaseDriver {
  private pool: Pool;

  constructor() {
    let poolConfig: PoolConfig;

    if (process.env.DATABASE_URL) {
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
      };
    } else {
      const isLocalHost =
        process.env.DB_HOST === "127.0.0.1" ||
        process.env.DB_HOST === "localhost" ||
        !process.env.DB_HOST;

      const sslOption =
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : process.env.DB_SSL === "false"
          ? false
          : isLocalHost
          ? false
          : { rejectUnauthorized: false };

      poolConfig = {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "ynab_companion",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        ssl: sslOption,
        max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    }

    this.pool = new Pool(poolConfig);

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }

  /**
   * Translates SQLite-style '?' placeholders into PostgreSQL-style '$1, $2, ...'
   */
  private translateQuery(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  public async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          encrypted_token TEXT,
          selected_plan_id TEXT,
          selected_plan_name TEXT,
          is_demo_mode INTEGER,
          last_server_knowledge INTEGER,
          last_synced_at TEXT,
          encrypted_income_categories TEXT,
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
          id SERIAL PRIMARY KEY,
          type TEXT,
          encrypted_payload TEXT,
          created_at TEXT,
          attempts INTEGER,
          last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS receipts (
          id TEXT PRIMARY KEY,
          plan_id TEXT,
          date TEXT,
          vendor TEXT,
          status TEXT,
          matched_transaction_id TEXT,
          encrypted_payload TEXT,
          updated_at TEXT
        );

        ALTER TABLE settings ADD COLUMN IF NOT EXISTS encrypted_income_categories TEXT;
      `);
    } finally {
      client.release();
    }
  }

  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const pgSql = this.translateQuery(sql);
    const result = await this.pool.query(pgSql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? undefined,
    };
  }

  public async execute(sql: string, params: unknown[] = []): Promise<QueryResult<never>> {
    let pgSql = this.translateQuery(sql);
    // If inserting into sync_queue without returning, add RETURNING id
    if (sql.includes("INSERT INTO sync_queue") && !sql.toLowerCase().includes("returning")) {
      pgSql += " RETURNING id";
    }

    const result = await this.pool.query(pgSql, params);
    const lastInsertId =
      result.rows && result.rows.length > 0 && "id" in result.rows[0]
        ? Number((result.rows[0] as { id: unknown }).id)
        : undefined;

    return {
      rows: [],
      lastInsertId,
      rowCount: result.rowCount ?? undefined,
    };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.pool.query("SELECT 1 as alive");
      return res.rows.length > 0;
    } catch (err) {
      console.error("Postgres health check failed:", err);
      return false;
    }
  }

  public getDriverName(): "sqlite" | "postgres" {
    return "postgres";
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// ==========================================
// UNIFIED SERVER DATABASE CLASS
// ==========================================
export class ServerDatabase {
  private driver: IDatabaseDriver;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const usePostgres =
      process.env.DB_TYPE === "postgres" ||
      Boolean(process.env.DATABASE_URL) ||
      (Boolean(process.env.DB_HOST) && process.env.DB_TYPE !== "sqlite");

    if (usePostgres) {
      this.driver = new PostgresDriver();
    } else {
      this.driver = new SqliteDriver();
    }
  }

  public getDriverName(): "sqlite" | "postgres" {
    return this.driver.getDriverName();
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.driver.init().then(() => {
        this.initialized = true;
      });
    }
    await this.initPromise;
  }

  public async healthCheck(): Promise<{ ok: boolean; driver: "sqlite" | "postgres" }> {
    await this.ensureInitialized();
    const ok = await this.driver.healthCheck();
    return { ok, driver: this.driver.getDriverName() };
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  public async getSettings(): Promise<AppSettings | null> {
    await this.ensureInitialized();
    const res = await this.driver.query<SettingsRow>(
      "SELECT * FROM settings WHERE id = 'app_settings' LIMIT 1"
    );
    const row = res.rows[0];
    if (!row) return null;

    let decryptedToken = "";
    if (row.encrypted_token) {
      try {
        decryptedToken = decryptString(row.encrypted_token);
      } catch (err) {
        console.error("Failed to decrypt stored YNAB token:", err);
      }
    }

    if (!decryptedToken && process.env.YNAB_ACCESS_TOKEN?.trim()) {
      decryptedToken = process.env.YNAB_ACCESS_TOKEN.trim();
    }

    let incomeCategoriesByPlan: Record<string, string[]> = {};
    if (row.encrypted_income_categories) {
      try {
        incomeCategoriesByPlan = decryptPayload(row.encrypted_income_categories);
      } catch (err) {
        console.error("Failed to decrypt stored income categories:", err);
      }
    }

    return {
      id: "app_settings",
      api_token: decryptedToken,
      selected_plan_id: row.selected_plan_id || "",
      selected_plan_name: row.selected_plan_name || "",
      is_demo_mode: Boolean(row.is_demo_mode),
      last_server_knowledge: row.last_server_knowledge || 0,
      last_synced_at: row.last_synced_at || null,
      income_category_ids_by_plan: incomeCategoriesByPlan,
    };
  }

  public async getEffectiveToken(): Promise<string> {
    const s = await this.getSettings();
    return s?.api_token || process.env.YNAB_ACCESS_TOKEN?.trim() || "";
  }

  public async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    await this.ensureInitialized();
    const current = (await this.getSettings()) || {
      id: "app_settings",
      api_token: "",
      selected_plan_id: "",
      selected_plan_name: "",
      is_demo_mode: true,
      last_server_knowledge: 0,
      last_synced_at: null,
      income_category_ids_by_plan: {},
    };

    const merged: AppSettings = {
      ...current,
      ...settings,
    };

    const encryptedToken = merged.api_token ? encryptString(merged.api_token) : "";
    const incomeCats =
      merged.income_category_ids_by_plan || current.income_category_ids_by_plan || {};
    const encryptedIncomeCategories = encryptPayload(incomeCats);

    await this.driver.execute(
      `
      INSERT INTO settings (id, encrypted_token, selected_plan_id, selected_plan_name, is_demo_mode, last_server_knowledge, last_synced_at, encrypted_income_categories, updated_at)
      VALUES ('app_settings', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        encrypted_token = excluded.encrypted_token,
        selected_plan_id = excluded.selected_plan_id,
        selected_plan_name = excluded.selected_plan_name,
        is_demo_mode = excluded.is_demo_mode,
        last_server_knowledge = excluded.last_server_knowledge,
        last_synced_at = excluded.last_synced_at,
        encrypted_income_categories = excluded.encrypted_income_categories,
        updated_at = excluded.updated_at
      `,
      [
        encryptedToken,
        merged.selected_plan_id,
        merged.selected_plan_name || "",
        merged.is_demo_mode ? 1 : 0,
        merged.last_server_knowledge,
        merged.last_synced_at,
        encryptedIncomeCategories,
        new Date().toISOString(),
      ]
    );

    return merged;
  }

  // ==========================================
  // PLANS
  // ==========================================
  public async getPlans(): Promise<PlanSummary[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<PlanRow>("SELECT * FROM plans");
    return res.rows.map((r) => {
      let payload: Record<string, any> = {};
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

  public async savePlans(plans: PlanSummary[]): Promise<void> {
    await this.ensureInitialized();
    const sql = `
      INSERT INTO plans (id, name, last_modified_on, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        last_modified_on = excluded.last_modified_on,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `;

    for (const p of plans) {
      const payload = {
        first_month: p.first_month,
        last_month: p.last_month,
        date_format: p.date_format,
        currency_format: p.currency_format,
      };
      await this.driver.execute(sql, [
        p.id,
        p.name,
        p.last_modified_on,
        encryptPayload(payload),
        new Date().toISOString(),
      ]);
    }
  }

  // ==========================================
  // ACCOUNTS
  // ==========================================
  public async getAccounts(): Promise<Account[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<AccountRow>(
      "SELECT * FROM accounts WHERE deleted = 0"
    );
    return res.rows.map((r) => {
      let payload: Record<string, any> = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt account payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        name: r.name,
        type: r.type as any,
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

  public async saveAccounts(accounts: Account[]): Promise<void> {
    await this.ensureInitialized();
    const sql = `
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
    `;

    for (const a of accounts) {
      const payload = {
        balance: a.balance,
        cleared_balance: a.cleared_balance,
        uncleared_balance: a.uncleared_balance,
        note: a.note,
        transfer_payee_id: a.transfer_payee_id,
      };
      await this.driver.execute(sql, [
        a.id,
        a.plan_id || "",
        a.name,
        a.type,
        a.on_budget ? 1 : 0,
        a.closed ? 1 : 0,
        a.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString(),
      ]);
    }
  }

  // ==========================================
  // CATEGORIES & GROUPS
  // ==========================================
  public async getCategoryGroups(): Promise<CategoryGroup[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<CategoryGroupRow>(
      "SELECT * FROM category_groups WHERE deleted = 0"
    );
    return res.rows.map((r) => ({
      id: r.id,
      plan_id: r.plan_id,
      name: r.name,
      hidden: Boolean(r.hidden),
      deleted: Boolean(r.deleted),
    }));
  }

  public async saveCategoryGroups(groups: CategoryGroup[]): Promise<void> {
    await this.ensureInitialized();
    const sql = `
      INSERT INTO category_groups (id, plan_id, name, hidden, deleted, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        name = excluded.name,
        hidden = excluded.hidden,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    `;

    for (const g of groups) {
      await this.driver.execute(sql, [
        g.id,
        g.plan_id || "",
        g.name,
        g.hidden ? 1 : 0,
        g.deleted ? 1 : 0,
        "",
        new Date().toISOString(),
      ]);
    }
  }

  public async getCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<CategoryRow>(
      "SELECT * FROM categories WHERE deleted = 0"
    );
    return res.rows.map((r) => {
      let payload: Record<string, any> = {};
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

  public async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureInitialized();
    const sql = `
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
    `;

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
      await this.driver.execute(sql, [
        c.id,
        c.plan_id || "",
        c.category_group_id,
        c.name,
        c.hidden ? 1 : 0,
        c.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString(),
      ]);
    }
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  public async getTransactions(): Promise<TransactionDetail[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<TransactionRow>(
      "SELECT * FROM transactions WHERE deleted = 0 ORDER BY date DESC"
    );
    return res.rows.map((r) => {
      let payload: Record<string, any> = {};
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt transaction payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        account_id: r.account_id,
        category_id: r.category_id || "",
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

  public async saveTransactions(transactions: TransactionDetail[]): Promise<void> {
    await this.ensureInitialized();
    const sql = `
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
    `;

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
      await this.driver.execute(sql, [
        t.id,
        t.plan_id || "",
        t.account_id,
        t.category_id || "",
        t.date,
        t.deleted ? 1 : 0,
        encryptPayload(payload),
        new Date().toISOString(),
      ]);
    }
  }

  public async deleteTransaction(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.driver.execute(
      "UPDATE transactions SET deleted = 1, updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id]
    );
  }

  // ==========================================
  // BUDGETS
  // ==========================================
  public async getBudgets(): Promise<Budget[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<BudgetRow>("SELECT * FROM budgets");
    return res.rows.map((r) => {
      let payload: Record<string, any> = { categories: [] };
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

  public async saveBudget(budget: Budget): Promise<void> {
    await this.ensureInitialized();
    const sql = `
      INSERT INTO budgets (id, plan_id, month, encrypted_payload, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        month = excluded.month,
        encrypted_payload = excluded.encrypted_payload,
        updated_at = excluded.updated_at
    `;

    await this.driver.execute(sql, [
      budget.id,
      budget.plan_id,
      budget.month,
      encryptPayload({ categories: budget.categories }),
      budget.updated_at || new Date().toISOString(),
    ]);
  }

  // ==========================================
  // SYNC QUEUE
  // ==========================================
  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<SyncQueueRow>(
      "SELECT * FROM sync_queue ORDER BY id ASC"
    );
    return res.rows.map((r) => {
      let payload: any = null;
      try {
        if (r.encrypted_payload) payload = decryptPayload(r.encrypted_payload);
      } catch (err) {
        console.error("Failed to decrypt sync queue payload:", err);
      }
      return {
        id: r.id,
        type: r.type as any,
        payload,
        createdAt: r.created_at,
        attempts: r.attempts,
        lastError: r.last_error || undefined,
      };
    });
  }

  public async addSyncQueueItem(item: SyncQueueItem): Promise<number> {
    await this.ensureInitialized();
    const res = await this.driver.execute(
      `
      INSERT INTO sync_queue (type, encrypted_payload, created_at, attempts, last_error)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        item.type,
        encryptPayload(item.payload),
        item.createdAt || new Date().toISOString(),
        item.attempts || 0,
        item.lastError || null,
      ]
    );
    return res.lastInsertId || 0;
  }

  public async deleteSyncQueueItem(id: number): Promise<void> {
    await this.ensureInitialized();
    await this.driver.execute("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  public async clearSyncQueue(): Promise<void> {
    await this.ensureInitialized();
    await this.driver.execute("DELETE FROM sync_queue");
  }

  // ==========================================
  // RECEIPTS
  // ==========================================
  public async getReceipts(): Promise<ReceiptIngestion[]> {
    await this.ensureInitialized();
    const res = await this.driver.query<ReceiptRow>(
      "SELECT * FROM receipts ORDER BY date DESC"
    );
    return res.rows.map((r) => {
      let payload: {
        total_amount?: number;
        food_amount?: number;
        non_food_amount?: number;
        raw_text?: string;
        image_url?: string;
        goods?: PurchasedGood[];
      } = {};
      try {
        if (r.encrypted_payload) {
          payload = decryptPayload(r.encrypted_payload);
        }
      } catch (err) {
        console.error("Failed to decrypt receipt payload:", err);
      }
      return {
        id: r.id,
        plan_id: r.plan_id,
        date: r.date,
        vendor: r.vendor,
        status: (r.status || "unresolved") as any,
        matched_transaction_id: r.matched_transaction_id || null,
        total_amount: payload.total_amount ?? 0,
        food_amount: payload.food_amount ?? 0,
        non_food_amount: payload.non_food_amount ?? 0,
        raw_text: payload.raw_text,
        image_url: payload.image_url,
        goods: payload.goods || [],
        created_at: r.updated_at,
      };
    });
  }

  public async saveReceipts(receipts: ReceiptIngestion[]): Promise<void> {
    await this.ensureInitialized();
    for (const r of receipts) {
      const payload = encryptPayload({
        total_amount: r.total_amount,
        food_amount: r.food_amount,
        non_food_amount: r.non_food_amount,
        raw_text: r.raw_text,
        image_url: r.image_url,
        goods: r.goods,
      });

      const sql = `
        INSERT INTO receipts (id, plan_id, date, vendor, status, matched_transaction_id, encrypted_payload, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          plan_id = excluded.plan_id,
          date = excluded.date,
          vendor = excluded.vendor,
          status = excluded.status,
          matched_transaction_id = excluded.matched_transaction_id,
          encrypted_payload = excluded.encrypted_payload,
          updated_at = excluded.updated_at
      `;

      await this.driver.execute(sql, [
        r.id,
        r.plan_id,
        r.date,
        r.vendor,
        r.status,
        r.matched_transaction_id || null,
        payload,
        r.created_at || new Date().toISOString(),
      ]);
    }
  }

  public async deleteReceipt(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.driver.execute("DELETE FROM receipts WHERE id = ?", [id]);
  }

  // ==========================================
  // BOOTSTRAP & SEED
  // ==========================================
  public async getBootstrapData() {
    let settings = await this.getSettings();
    if (!settings) {
      await this.seedDemoData();
      settings = await this.getSettings();
    }

    const [
      plans,
      accounts,
      categoryGroups,
      categories,
      transactions,
      budgets,
      syncQueue,
      receipts,
    ] = await Promise.all([
      this.getPlans(),
      this.getAccounts(),
      this.getCategoryGroups(),
      this.getCategories(),
      this.getTransactions(),
      this.getBudgets(),
      this.getSyncQueue(),
      this.getReceipts(),
    ]);

    return {
      settings: settings!,
      plans,
      accounts,
      categoryGroups,
      categories,
      transactions,
      budgets,
      syncQueue,
      receipts,
    };
  }

  public async seedDemoData(force = false): Promise<void> {
    await this.ensureInitialized();
    if (force) {
      await this.driver.execute("DELETE FROM plans;");
      await this.driver.execute("DELETE FROM accounts;");
      await this.driver.execute("DELETE FROM category_groups;");
      await this.driver.execute("DELETE FROM categories;");
      await this.driver.execute("DELETE FROM transactions;");
      await this.driver.execute("DELETE FROM budgets;");
      await this.driver.execute("DELETE FROM sync_queue;");
      await this.driver.execute("DELETE FROM settings;");
      await this.driver.execute("DELETE FROM receipts;");
    }

    await this.savePlans([DEMO_PLAN]);
    await this.saveAccounts(DEMO_ACCOUNTS);
    await this.saveCategoryGroups(DEMO_CATEGORY_GROUPS);
    await this.saveCategories(DEMO_CATEGORIES);
    await this.saveTransactions(DEMO_TRANSACTIONS);
    await this.saveSettings(DEMO_SETTINGS);
    await this.saveReceipts(DEMO_RECEIPTS);

    await this.saveBudget({
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
