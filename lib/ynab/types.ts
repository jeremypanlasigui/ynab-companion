/**
 * YNAB API Types and Application Interfaces
 * Based on OpenAPI 3.1.1 specification (docs/dependencies/ynab-api.json)
 */

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "creditCard"
  | "lineOfCredit"
  | "otherAsset"
  | "otherLiability"
  | "mortgage"
  | "autoLoan"
  | "studentLoan"
  | "personalLoan"
  | "medicalDebt"
  | "otherDebt";

export type TransactionClearedStatus = "cleared" | "uncleared" | "reconciled";

export type TransactionFlagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | null;

export interface DateFormat {
  format: string;
}

export interface CurrencyFormat {
  iso_code: string;
  example_format: string;
  decimal_digits: number;
  decimal_separator: string;
  symbol_first: boolean;
  group_separator: string;
  currency_symbol: string;
  display_symbol: boolean;
}

export interface PlanSummary {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  date_format?: DateFormat;
  currency_format?: CurrencyFormat;
  accounts?: Account[];
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  on_budget: boolean;
  closed: boolean;
  note?: string | null;
  balance: number; // in milliunits (1000 = $1.00)
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id?: string | null;
  deleted: boolean;
  plan_id?: string;
}

export interface Category {
  id: string;
  category_group_id: string;
  category_group_name?: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  note?: string | null;
  budgeted: number; // milliunits budgeted for the month
  activity: number; // milliunits spent for the month (usually negative for spending)
  balance: number;  // milliunits available remaining
  goal_type?: string | null;
  goal_target?: number | null;
  goal_percentage_complete?: number | null;
  plan_id?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  plan_id?: string;
  categories?: Category[];
}

export interface SubTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  deleted: boolean;
}

export interface TransactionDetail {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  amount: number; // milliunits. Inflow > 0, Outflow < 0
  memo?: string | null;
  cleared: TransactionClearedStatus;
  approved: boolean;
  flag_color?: TransactionFlagColor;
  account_id: string;
  account_name: string;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  matched_transaction_id?: string | null;
  import_id?: string | null;
  subtransactions?: SubTransaction[];
  deleted: boolean;
  debt_transaction_type?:
    | "payment"
    | "refund"
    | "fee"
    | "interest"
    | "escrow"
    | "balanceAdjustment"
    | "credit"
    | "charge"
    | null;
  plan_id?: string;
  is_local?: boolean; // True if locally created/mutated before sync
}

export interface NewTransaction {
  account_id: string;
  date: string;
  amount: number; // milliunits
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  memo?: string | null;
  cleared?: TransactionClearedStatus;
  approved?: boolean;
  flag_color?: TransactionFlagColor;
}

export interface MonthSummary {
  month: string; // 'YYYY-MM-01'
  note?: string | null;
  income: number;
  budgeted: number;
  activity: number;
  to_be_budgeted: number;
  age_of_money?: number | null;
  deleted: boolean;
}

export interface MonthDetail extends MonthSummary {
  categories: Category[];
}

export interface User {
  id: string;
}

// App Settings & Sync Types
export interface AppSettings {
  id: "app_settings";
  api_token: string;
  selected_plan_id: string;
  selected_plan_name?: string;
  is_demo_mode: boolean;
  last_server_knowledge: number;
  last_synced_at: string | null;
  income_category_ids_by_plan?: Record<string, string[]>;
}

export type SyncOperationType =
  | "CREATE_TRANSACTION"
  | "UPDATE_TRANSACTION"
  | "DELETE_TRANSACTION"
  | "UPDATE_CATEGORY_BUDGET";

export interface SyncQueueItem {
  id?: number;
  type: SyncOperationType;
  payload: any;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  error: string | null;
}

export interface BudgetSummary {
  totalBudgeted: number; // in milliunits
  totalSpent: number;    // in milliunits (positive number for spending amount)
  totalRemaining: number; // in milliunits
  spendingPercentage: number;
}

export interface CategoryBudgetAmount {
  category_id: string;
  amount: number; // in milliunits (1000 = $1.00)
}

export interface Budget {
  id: string; // `${plan_id}:${month}`
  plan_id: string;
  month: string; // 'YYYY-MM' (e.g. '2026-09')
  categories: CategoryBudgetAmount[];
  updated_at?: string;
}

// Food Budgeting & Receipt Ingestion Types
export type FoodSubCategory =
  | "fruits"
  | "veggies"
  | "meat"
  | "dairy"
  | "snacks"
  | "pantry"
  | "beverages"
  | "prepared"
  | "tax"
  | "ca crv"
  | "home goods"
  | "other";

export interface BoundingBox {
  x0: number; // percentage 0-100 across image width
  y0: number; // percentage 0-100 across image height
  x1: number;
  y1: number;
}

export interface PurchasedGood {
  id: string;
  receipt_id: string;
  name: string;
  amount: number; // in milliunits (negative for expense outflow, e.g. -4990 = $4.99)
  category: FoodSubCategory;
  is_food: boolean; // false if home goods/non-food
  notes?: string;
  bbox?: BoundingBox;
}


export type ReceiptMatchStatus = "matched" | "unresolved" | "manual";

export interface ReceiptIngestion {
  id: string;
  plan_id: string;
  date: string; // 'YYYY-MM-DD'
  vendor: string; // e.g. "Trader Joe's", "Costco", "Target"
  total_amount: number; // milliunits (negative)
  food_amount: number; // milliunits (negative)
  non_food_amount: number; // milliunits (negative)
  status: ReceiptMatchStatus;
  matched_transaction_id?: string | null;
  raw_text?: string;
  image_url?: string;
  goods: PurchasedGood[];
  created_at: string;
}

export interface SaveSubTransaction {
  amount: number;
  category_id?: string | null;
  memo?: string | null;
  payee_name?: string | null;
}
