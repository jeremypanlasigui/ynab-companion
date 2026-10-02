import {
  PlanSummary,
  Account,
  CategoryGroup,
  Category,
  TransactionDetail,
  AppSettings,
} from "./types";

export const DEMO_PLAN_ID = "demo-plan-mint-ynab";

export const DEMO_PLAN: PlanSummary = {
  id: DEMO_PLAN_ID,
  name: "Personal Finances",
  last_modified_on: new Date().toISOString(),
  first_month: "2026-01-01",
  last_month: "2026-12-01",
  currency_format: {
    iso_code: "USD",
    example_format: "$123,456.78",
    decimal_digits: 2,
    decimal_separator: ".",
    symbol_first: true,
    group_separator: ",",
    currency_symbol: "$",
    display_symbol: true,
  },
};

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "acc-checking-1",
    plan_id: DEMO_PLAN_ID,
    name: "Chase Total Checking",
    type: "checking",
    on_budget: true,
    closed: false,
    balance: 4850250, // $4,850.25
    cleared_balance: 4850250,
    uncleared_balance: 0,
    deleted: false,
  },
  {
    id: "acc-savings-1",
    plan_id: DEMO_PLAN_ID,
    name: "Ally High Yield Savings",
    type: "savings",
    on_budget: true,
    closed: false,
    balance: 24500000, // $24,500.00
    cleared_balance: 24500000,
    uncleared_balance: 0,
    deleted: false,
  },
  {
    id: "acc-credit-1",
    plan_id: DEMO_PLAN_ID,
    name: "Amex Gold Card",
    type: "creditCard",
    on_budget: true,
    closed: false,
    balance: -842100, // -$842.10
    cleared_balance: -720500,
    uncleared_balance: -121600,
    deleted: false,
  },
  {
    id: "acc-cash-1",
    plan_id: DEMO_PLAN_ID,
    name: "Wallet Cash",
    type: "cash",
    on_budget: true,
    closed: false,
    balance: 140000, // $140.00
    cleared_balance: 140000,
    uncleared_balance: 0,
    deleted: false,
  },
];

export const DEMO_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "group-fixed",
    plan_id: DEMO_PLAN_ID,
    name: "Fixed Monthly Bills",
    hidden: false,
    deleted: false,
  },
  {
    id: "group-living",
    plan_id: DEMO_PLAN_ID,
    name: "Everyday Expenses",
    hidden: false,
    deleted: false,
  },
  {
    id: "group-lifestyle",
    plan_id: DEMO_PLAN_ID,
    name: "Fun & Lifestyle",
    hidden: false,
    deleted: false,
  },
  {
    id: "group-savings",
    plan_id: DEMO_PLAN_ID,
    name: "Goals & Rainy Day",
    hidden: false,
    deleted: false,
  },
  {
    id: "group-income",
    plan_id: DEMO_PLAN_ID,
    name: "Income & Inflows",
    hidden: false,
    deleted: false,
  },
];

export const DEMO_CATEGORIES: Category[] = [
  // Fixed Bills
  {
    id: "cat-rent",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-fixed",
    category_group_name: "Fixed Monthly Bills",
    name: "Rent & Housing",
    hidden: false,
    deleted: false,
    budgeted: 1850000, // $1,850.00
    activity: -1850000, // -$1,850.00 spent
    balance: 0,
  },
  {
    id: "cat-utilities",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-fixed",
    category_group_name: "Fixed Monthly Bills",
    name: "Utilities & Electric",
    hidden: false,
    deleted: false,
    budgeted: 180000, // $180.00
    activity: -142500, // -$142.50 spent
    balance: 37500, // $37.50 left
  },
  {
    id: "cat-internet",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-fixed",
    category_group_name: "Fixed Monthly Bills",
    name: "High Speed Fiber Internet",
    hidden: false,
    deleted: false,
    budgeted: 70000, // $70.00
    activity: -70000, // -$70.00
    balance: 0,
  },
  // Everyday Expenses
  {
    id: "cat-groceries",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-living",
    category_group_name: "Everyday Expenses",
    name: "Groceries & Supermarket",
    hidden: false,
    deleted: false,
    budgeted: 600000, // $600.00
    activity: -468400, // -$468.40 spent
    balance: 131600, // $131.60 remaining
  },
  {
    id: "cat-dining",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-living",
    category_group_name: "Everyday Expenses",
    name: "Restaurants & Takeout",
    hidden: false,
    deleted: false,
    budgeted: 350000, // $350.00
    activity: -382100, // -$382.10 (overspent!)
    balance: -32100, // -$32.10
  },
  {
    id: "cat-transit",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-living",
    category_group_name: "Everyday Expenses",
    name: "Gas & Transportation",
    hidden: false,
    deleted: false,
    budgeted: 200000, // $200.00
    activity: -124500, // -$124.50 spent
    balance: 75500, // $75.50 remaining
  },
  // Fun & Lifestyle
  {
    id: "cat-entertainment",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-lifestyle",
    category_group_name: "Fun & Lifestyle",
    name: "Entertainment & Games",
    hidden: false,
    deleted: false,
    budgeted: 150000, // $150.00
    activity: -84000, // -$84.00 spent
    balance: 66000, // $66.00 remaining
  },
  {
    id: "cat-subscriptions",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-lifestyle",
    category_group_name: "Fun & Lifestyle",
    name: "Digital Subscriptions",
    hidden: false,
    deleted: false,
    budgeted: 65000, // $65.00
    activity: -58990, // -$58.99 spent
    balance: 6010, // $6.01 remaining
  },
  // Goals
  {
    id: "cat-emergency",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-savings",
    category_group_name: "Goals & Rainy Day",
    name: "Emergency Fund",
    hidden: false,
    deleted: false,
    budgeted: 500000, // $500.00
    activity: 0,
    balance: 500000,
  },
  {
    id: "cat-travel",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-savings",
    category_group_name: "Goals & Rainy Day",
    name: "Vacation & Travel Fund",
    hidden: false,
    deleted: false,
    budgeted: 300000, // $300.00
    activity: -115000, // -$115.00 flight deposit
    balance: 185000, // $185.00 remaining
  },
  // Income & Inflows
  {
    id: "cat-inflow",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-income",
    category_group_name: "Income & Inflows",
    name: "Inflow: Ready to Assign",
    hidden: false,
    deleted: false,
    budgeted: 0,
    activity: 3450000, // +$3,450.00
    balance: 3450000,
  },
  {
    id: "cat-side-income",
    plan_id: DEMO_PLAN_ID,
    category_group_id: "group-income",
    category_group_name: "Income & Inflows",
    name: "Freelance & Consulting",
    hidden: false,
    deleted: false,
    budgeted: 0,
    activity: 750000, // +$750.00
    balance: 750000,
  },
];

export const DEMO_TRANSACTIONS: TransactionDetail[] = [
  {
    id: "tx-1",
    plan_id: DEMO_PLAN_ID,
    date: new Date().toISOString().slice(0, 10),
    amount: -78500, // -$78.50
    memo: "Weekly fresh grocery run",
    cleared: "cleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Trader Joe's",
    category_id: "cat-groceries",
    category_name: "Groceries & Supermarket",
    deleted: false,
  },
  {
    id: "tx-2",
    plan_id: DEMO_PLAN_ID,
    date: new Date().toISOString().slice(0, 10),
    amount: -1850, // -$18.50
    memo: "Iced latte and croissant",
    cleared: "uncleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Blue Bottle Coffee",
    category_id: "cat-dining",
    category_name: "Restaurants & Takeout",
    deleted: false,
  },
  {
    id: "tx-3",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    amount: -45000, // -$45.00
    memo: "Full tank fillup",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Chevron",
    category_id: "cat-transit",
    category_name: "Gas & Transportation",
    deleted: false,
  },
  {
    id: "tx-4",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    amount: -12450, // -$124.50
    memo: "Dinner with friends",
    cleared: "cleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Nobu Sushi Bar",
    category_id: "cat-dining",
    category_name: "Restaurants & Takeout",
    deleted: false,
  },
  {
    id: "tx-5",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    amount: -1549, // -$15.49
    memo: "Monthly streaming 4K plan",
    cleared: "cleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Netflix",
    category_id: "cat-subscriptions",
    category_name: "Digital Subscriptions",
    deleted: false,
  },
  {
    id: "tx-6",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    amount: -1850000, // -$1,850.00
    memo: "Monthly Rent Auto-Pay",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Sunset Ridge Apartments",
    category_id: "cat-rent",
    category_name: "Rent & Housing",
    deleted: false,
  },
  {
    id: "tx-7",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10),
    amount: -70000, // -$70.00
    memo: "Gigabit internet auto-bill",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Sonic Telecom",
    category_id: "cat-internet",
    category_name: "High Speed Fiber Internet",
    deleted: false,
  },
  {
    id: "tx-8",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 8).toISOString().slice(0, 10),
    amount: 3450000, // +$3,450.00 Paycheck Inflow
    memo: "Bi-weekly salary direct deposit",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Acme Corp Payroll",
    category_id: "cat-inflow",
    category_name: "Inflow: Ready to Assign",
    deleted: false,
  },
  {
    id: "tx-9",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    amount: -142500, // -$142.50
    memo: "Electric & Gas bill",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Pacific Gas & Electric",
    category_id: "cat-utilities",
    category_name: "Utilities & Electric",
    deleted: false,
  },
  {
    id: "tx-10",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 12).toISOString().slice(0, 10),
    amount: -115000, // -$115.00
    memo: "Weekend getaway cabin reservation deposit",
    cleared: "cleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Airbnb",
    category_id: "cat-travel",
    category_name: "Vacation & Travel Fund",
    deleted: false,
  },
  {
    id: "tx-11",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10),
    amount: -500000, // -$500.00 transferred out
    memo: "Monthly emergency fund transfer",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Transfer : Ally High Yield Savings",
    category_id: null,
    category_name: null,
    transfer_account_id: "acc-savings-1",
    transfer_transaction_id: "tx-12",
    deleted: false,
  },
  {
    id: "tx-12",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10),
    amount: 500000, // +$500.00 received in savings
    memo: "Monthly emergency fund transfer",
    cleared: "cleared",
    approved: true,
    account_id: "acc-savings-1",
    account_name: "Ally High Yield Savings",
    payee_name: "Transfer : Chase Total Checking",
    category_id: null,
    category_name: null,
    transfer_account_id: "acc-checking-1",
    transfer_transaction_id: "tx-11",
    deleted: false,
  },
  {
    id: "tx-13",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10),
    amount: -350000, // -$350.00 CC payment
    memo: "Credit card statement auto-payment",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Transfer : Amex Gold Card",
    category_id: null,
    category_name: null,
    transfer_account_id: "acc-credit-1",
    transfer_transaction_id: "tx-14",
    deleted: false,
  },
  {
    id: "tx-14",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10),
    amount: 350000, // +$350.00 received on CC
    memo: "Credit card statement auto-payment",
    cleared: "cleared",
    approved: true,
    account_id: "acc-credit-1",
    account_name: "Amex Gold Card",
    payee_name: "Transfer : Chase Total Checking",
    category_id: null,
    category_name: null,
    transfer_account_id: "acc-checking-1",
    transfer_transaction_id: "tx-13",
    deleted: false,
  },
  {
    id: "tx-15",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    amount: -1500, // -$1.50 adjustment
    memo: "Reconciliation adjustment to match bank statement",
    cleared: "reconciled",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Reconciliation Balance Adjustment",
    category_id: null,
    category_name: null,
    debt_transaction_type: "balanceAdjustment",
    deleted: false,
  },
  {
    id: "tx-16",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    amount: 750000, // +$750.00
    memo: "Q3 Website consulting project payment",
    cleared: "cleared",
    approved: true,
    account_id: "acc-checking-1",
    account_name: "Chase Total Checking",
    payee_name: "Apex Design Studio",
    category_id: "cat-side-income",
    category_name: "Freelance & Consulting",
    deleted: false,
  },
  {
    id: "tx-17",
    plan_id: DEMO_PLAN_ID,
    date: new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 10),
    amount: 25000000, // +$25,000.00 Starting Balance
    memo: "Initial account opening balance",
    cleared: "reconciled",
    approved: true,
    account_id: "acc-savings-1",
    account_name: "Marcus High Yield Savings",
    payee_name: "Starting Balance",
    category_id: "cat-inflow",
    category_name: "Inflow: Ready to Assign",
    deleted: false,
  },
];

export const DEMO_SETTINGS: AppSettings = {
  id: "app_settings",
  api_token: "",
  selected_plan_id: DEMO_PLAN_ID,
  selected_plan_name: "Personal Finances (Demo)",
  is_demo_mode: true,
  last_server_knowledge: 100,
  last_synced_at: new Date().toISOString(),
  income_category_ids_by_plan: {
    [DEMO_PLAN_ID]: ["cat-inflow", "cat-side-income", "inflow:ready-to-assign"],
  },
};
