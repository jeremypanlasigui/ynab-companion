import Dexie, { type Table } from "dexie";
import {
  PlanSummary,
  Account,
  CategoryGroup,
  Category,
  TransactionDetail,
  SyncQueueItem,
  AppSettings,
  NewTransaction,
  Budget,
} from "./types";
import {
  DEMO_PLAN,
  DEMO_ACCOUNTS,
  DEMO_CATEGORY_GROUPS,
  DEMO_CATEGORIES,
  DEMO_TRANSACTIONS,
  DEMO_SETTINGS,
  DEMO_PLAN_ID,
} from "./demo-data";

async function postMutation(action: string, payload: any) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/data/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
  } catch (err) {
    console.warn("Background server mutation push failed (will retry on sync):", err);
  }
}

export class YNABDatabase extends Dexie {
  plans!: Table<PlanSummary, string>;
  accounts!: Table<Account, string>;
  categoryGroups!: Table<CategoryGroup, string>;
  categories!: Table<Category, string>;
  transactions!: Table<TransactionDetail, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  settings!: Table<AppSettings, string>;
  budgets!: Table<Budget, string>;

  constructor() {
    super("YNABCompanionDB");

    this.version(1).stores({
      plans: "&id, name, last_modified_on",
      accounts: "&id, plan_id, name, type, on_budget, deleted",
      categoryGroups: "&id, plan_id, name, deleted",
      categories: "&id, plan_id, category_group_id, name, deleted",
      transactions: "&id, plan_id, date, account_id, category_id, deleted, cleared",
      syncQueue: "++id, type, createdAt, attempts",
      settings: "&id",
    });

    this.version(2).stores({
      budgets: "&id, plan_id, month, [plan_id+month]",
    });
  }

  async initializeDefaults() {
    // 1. Attempt to bootstrap from encrypted server-side SQLite database
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/data/bootstrap");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            await this.populateFromData(json.data);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not bootstrap from server SQLite API, using local cache:", err);
      }
    }

    // 2. Fallback to local Dexie cache or demo seeding if empty
    const existingSettings = await this.settings.get("app_settings");
    if (!existingSettings) {
      await this.seedDemoData();
    }
  }

  async populateFromData(data: {
    plans?: PlanSummary[];
    accounts?: Account[];
    categoryGroups?: CategoryGroup[];
    categories?: Category[];
    transactions?: TransactionDetail[];
    budgets?: Budget[];
    settings?: AppSettings;
    syncQueue?: SyncQueueItem[];
  }) {
    await this.transaction("rw", [
      this.plans,
      this.accounts,
      this.categoryGroups,
      this.categories,
      this.transactions,
      this.budgets,
      this.settings,
    ], async () => {
      if (data.plans) {
        await this.plans.clear();
        if (data.plans.length) await this.plans.bulkPut(data.plans);
      }
      if (data.accounts) {
        await this.accounts.clear();
        if (data.accounts.length) await this.accounts.bulkPut(data.accounts);
      }
      if (data.categoryGroups) {
        await this.categoryGroups.clear();
        if (data.categoryGroups.length) await this.categoryGroups.bulkPut(data.categoryGroups);
      }
      if (data.categories) {
        await this.categories.clear();
        if (data.categories.length) await this.categories.bulkPut(data.categories);
      }
      if (data.transactions) {
        await this.transactions.clear();
        if (data.transactions.length) await this.transactions.bulkPut(data.transactions);
      }
      if (data.budgets) {
        await this.budgets.clear();
        if (data.budgets.length) await this.budgets.bulkPut(data.budgets);
      }
      if (data.settings) {
        await this.settings.put(data.settings);
      }
    });
  }

  async seedDemoData(force = false) {
    if (force && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/data/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_demo" }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            await this.populateFromData(json.data);
            return;
          }
        }
      } catch (err) {
        console.warn("Server reset_demo failed, resetting locally:", err);
      }
    }

    if (force) {
      await this.transaction("rw", [
        this.plans,
        this.accounts,
        this.categoryGroups,
        this.categories,
        this.transactions,
        this.syncQueue,
        this.settings,
        this.budgets,
      ], async () => {
        await this.plans.clear();
        await this.accounts.clear();
        await this.categoryGroups.clear();
        await this.categories.clear();
        await this.transactions.clear();
        await this.syncQueue.clear();
        await this.settings.clear();
        await this.budgets.clear();
      });
    }

    await this.transaction("rw", [
      this.plans,
      this.accounts,
      this.categoryGroups,
      this.categories,
      this.transactions,
      this.settings,
      this.budgets,
    ], async () => {
      await this.plans.put(DEMO_PLAN);
      await this.accounts.bulkPut(DEMO_ACCOUNTS);
      await this.categoryGroups.bulkPut(DEMO_CATEGORY_GROUPS);
      await this.categories.bulkPut(DEMO_CATEGORIES);
      await this.transactions.bulkPut(DEMO_TRANSACTIONS);
      await this.settings.put(DEMO_SETTINGS);

      // Seed sample budget only for demo month 2026-09
      await this.budgets.put({
        id: `${DEMO_PLAN_ID}:2026-09`,
        plan_id: DEMO_PLAN_ID,
        month: "2026-09",
        categories: DEMO_CATEGORIES.map((c) => ({
          category_id: c.id,
          amount: c.budgeted,
        })),
        updated_at: new Date().toISOString(),
      });
    });
  }

  /**
   * Get budget for a plan and month ('YYYY-MM' or 'YYYY-MM-01')
   */
  async getBudget(planId: string, month: string): Promise<Budget | undefined> {
    const monthKey = month.slice(0, 7);
    const id = `${planId}:${monthKey}`;
    return this.budgets.get(id);
  }

  /**
   * Save or update budget for a plan and month
   */
  async saveBudget(budget: Budget): Promise<string> {
    const res = await this.budgets.put(budget);
    postMutation("SAVE_BUDGET", budget);
    return res;
  }

  /**
   * Optimistically add a new transaction locally and persist to SQLite
   */
  async addLocalTransaction(newTx: NewTransaction, planId?: string): Promise<TransactionDetail> {
    const settings = await this.settings.get("app_settings");
    const activePlanId = planId || settings?.selected_plan_id || DEMO_PLAN_ID;

    const account = await this.accounts.get(newTx.account_id);
    let category: Category | undefined;
    if (newTx.category_id) {
      category = await this.categories.get(newTx.category_id);
    }

    const txId = `local-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullTx: TransactionDetail = {
      id: txId,
      plan_id: activePlanId,
      date: newTx.date,
      amount: newTx.amount,
      memo: newTx.memo || null,
      cleared: newTx.cleared || "uncleared",
      approved: newTx.approved ?? true,
      flag_color: newTx.flag_color || null,
      account_id: newTx.account_id,
      account_name: account?.name || "Account",
      payee_name: newTx.payee_name || "Uncategorized Payee",
      category_id: newTx.category_id || null,
      category_name: category ? category.name : "Uncategorized",
      deleted: false,
      is_local: true,
    };

    await this.transaction("rw", [
      this.transactions,
      this.accounts,
      this.categories,
      this.syncQueue,
    ], async () => {
      // 1. Store transaction
      await this.transactions.put(fullTx);

      // 2. Optimistically update account balance
      if (account) {
        account.balance += newTx.amount;
        if (newTx.cleared === "cleared") {
          account.cleared_balance += newTx.amount;
        } else {
          account.uncleared_balance += newTx.amount;
        }
        await this.accounts.put(account);
      }

      // 3. Optimistically update category spending activity and remaining balance
      if (category) {
        category.activity += newTx.amount;
        category.balance += newTx.amount;
        await this.categories.put(category);
      }

      // 4. Enqueue to sync queue if not in demo mode with no token
      if (settings && !settings.is_demo_mode && settings.api_token) {
        const queueItem: SyncQueueItem = {
          type: "CREATE_TRANSACTION",
          payload: {
            plan_id: activePlanId,
            transaction: {
              account_id: newTx.account_id,
              date: newTx.date,
              amount: newTx.amount,
              payee_name: newTx.payee_name,
              category_id: newTx.category_id,
              memo: newTx.memo,
              cleared: newTx.cleared,
              approved: newTx.approved,
            },
            local_id: txId,
          },
          createdAt: new Date().toISOString(),
          attempts: 0,
        };
        await this.syncQueue.add(queueItem);
        postMutation("ADD_SYNC_QUEUE", queueItem);
      }
    });

    // Persist mutation to encrypted SQLite
    postMutation("SAVE_TRANSACTION", fullTx);

    return fullTx;
  }

  /**
   * Optimistically update category budget amount and persist to SQLite
   */
  async updateCategoryBudget(categoryId: string, newBudgetedMilliunits: number, month?: string) {
    const settings = await this.settings.get("app_settings");
    const activePlanId = settings?.selected_plan_id || DEMO_PLAN_ID;
    const category = await this.categories.get(categoryId);
    if (!category) return;

    const diff = newBudgetedMilliunits - category.budgeted;
    category.budgeted = newBudgetedMilliunits;
    category.balance += diff;

    await this.transaction("rw", [this.categories, this.syncQueue], async () => {
      await this.categories.put(category);

      if (settings && !settings.is_demo_mode && settings.api_token) {
        const queueItem: SyncQueueItem = {
          type: "UPDATE_CATEGORY_BUDGET",
          payload: {
            plan_id: activePlanId,
            category_id: categoryId,
            month: month || new Date().toISOString().slice(0, 7) + "-01",
            budgeted: newBudgetedMilliunits,
          },
          createdAt: new Date().toISOString(),
          attempts: 0,
        };
        await this.syncQueue.add(queueItem);
        postMutation("ADD_SYNC_QUEUE", queueItem);
      }
    });

    postMutation("UPDATE_CATEGORY_BUDGET", {
      category_id: categoryId,
      budgeted: newBudgetedMilliunits,
      month,
    });
  }

  /**
   * Optimistically delete transaction and persist to SQLite
   */
  async deleteLocalTransaction(id: string) {
    const tx = await this.transactions.get(id);
    if (!tx) return;

    const settings = await this.settings.get("app_settings");
    const account = await this.accounts.get(tx.account_id);
    const category = tx.category_id ? await this.categories.get(tx.category_id) : undefined;

    await this.transaction("rw", [
      this.transactions,
      this.accounts,
      this.categories,
      this.syncQueue,
    ], async () => {
      // Revert account balance
      if (account) {
        account.balance -= tx.amount;
        if (tx.cleared === "cleared") {
          account.cleared_balance -= tx.amount;
        } else {
          account.uncleared_balance -= tx.amount;
        }
        await this.accounts.put(account);
      }

      // Revert category
      if (category) {
        category.activity -= tx.amount;
        category.balance -= tx.amount;
        await this.categories.put(category);
      }

      await this.transactions.delete(id);

      if (settings && !settings.is_demo_mode && settings.api_token && !tx.is_local) {
        const queueItem: SyncQueueItem = {
          type: "DELETE_TRANSACTION",
          payload: {
            plan_id: tx.plan_id || settings.selected_plan_id,
            transaction_id: id,
          },
          createdAt: new Date().toISOString(),
          attempts: 0,
        };
        await this.syncQueue.add(queueItem);
        postMutation("ADD_SYNC_QUEUE", queueItem);
      }
    });

    postMutation("DELETE_TRANSACTION", {
      id,
      account_id: tx.account_id,
      amount: tx.amount,
      category_id: tx.category_id,
    });
  }

  /**
   * Persist configured income categories for a plan into AppSettings and sync to SQLite
   */
  async saveIncomeCategories(planId: string, categoryIds: string[]) {
    const current = await this.settings.get("app_settings");
    if (!current) return;
    const updatedByPlan = {
      ...(current.income_category_ids_by_plan || {}),
      [planId]: categoryIds,
    };
    const updated: AppSettings = {
      ...current,
      income_category_ids_by_plan: updatedByPlan,
    };
    await this.settings.put(updated);
    postMutation("SAVE_SETTINGS", updated);
  }
}

export const db = new YNABDatabase();
