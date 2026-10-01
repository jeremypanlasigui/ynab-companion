A YNAB Companion app designed to run locally and act as an offline-first "thin client" for my YNAB data.

The primary goal is to give the user a more mint-like experience of using YNAB. It is not intended to replace the YNAB app, but to provide a faster, more responsive alternative for day-to-day use. This means the UI should be extremely snappy and focused on quick actions, rather than the more comprehensive features of the YNAB app. It should also be possible to use the app offline, with data being synced when the user comes back online.

The application should allow the user to set a budget for a category and compare it against the actual spending in that category.

The UI should have two main modes:

1. A "Budget View" that shows the user their budget in a way that is easy to understand. This should include:

- Total amount budgeted for the month
- Total amount spent for the month
- Total amount remaining for the month
- Breakdown of each category's spending

2. A "Transaction View" that shows the user all their transactions for the month. This should include:

- Date of transaction
- Payee of transaction
- Category of transaction
- Amount of transaction

## Key Features

- **Persistent Local Database**: Node.js native SQLite database (`data/budget.sqlite`) persisting across all server restarts, reloads, and browser cache clears
- **AES-256-GCM Encrypted at Rest**: All financial transactions, balances, amounts, category targets, and the YNAB Personal Access Token are encrypted on disk
- **Zero-Friction Key Management**: Automatically derives and persists a 256-bit encryption key in `.env.local` (`ENCRYPTION_KEY`)
- Offline-first architecture with reactive local cache (Dexie IndexedDB) synchronized with SQLite
- Fast, responsive UI with modern design
- Quick actions for common tasks (adding transactions, categorizing, etc.)
- View budgets, transactions, and accounts
- Sync with YNAB API (latest version available as of Sept 24, 2026), maintained at docs/dependencies/ynab-api.json

## Tech Stack

- Next.js
- Typescript
- Tailwind CSS
- TanStack Query (React Query)
- YNAB API (latest version available as of Sept 24, 2026)

## Project Structure

```
ynab-companion-app/
├── app/            # Next.js App Router (root layout, pages, global UI)
│   ├── api/        # API routes (e.g., local proxies or helpers)
│   ├── (tabs)/     # Shared tab layout group
│   │   ├── dashboard/  # Dashboard tab
│   │   ├── transactions/ # Transactions tab
│   │   └── budget/     # Budget tab
│   ├── _components/  # Shared components (if needed beyond components/)
│   └── layout.tsx    # Root layout
├── components/     # Reusable React components
│   ├── ui/           # UI primitives (buttons, inputs, cards)
│   ├── layout/       # Layout components (header, nav, sidebar)
│   ├── ynab/         # YNAB-specific components (budget table, transaction list)
│   └── common/       # General-purpose components
├── lib/            # Business logic and utilities
│   ├── ynab/         # YNAB-specific logic
│   │   ├── api.ts      # API client (YNAB SDK wrapper)
│   │   ├── sync.ts     # Sync logic (offline storage, sync orchestration)
│   │   ├── utils.ts  # Utility functions
│   │   └── types.ts  # Type definitions
│   └── utils/        # General utilities
├── public/         # Static assets
├── styles/         # Global styles ( Tailwind)
└── ...             # Config files (tailwind.config.ts, tsconfig.json, etc.)
```

## Documentation

- **[Architecture & System Guidelines](docs/architecture.md)**: Detailed breakdown of the offline-first multi-tier storage model (Dexie IndexedDB + AES-256-GCM encrypted SQLite), synchronization lifecycle, and refactoring roadmap.
- **[UI Style Guide & Frontend Conventions](docs/styleguide.md)**: Visual design tokens, Tailwind CSS standards, milliunit financial representation rules, component patterns, and React 19 / TypeScript guidelines.

## Getting Started & Run Instructions

### Prerequisites

- **Node.js**: v18.18+ or later (v20+ recommended; verified on Node v24)
- **npm**: v9+ (or pnpm / yarn / bun)

### 1. Installation

Install all required dependencies:

```bash
npm install
```

### 2. Running in Development Mode

Start the Next.js development server:

```bash
npm run dev
```

Once started, open [http://localhost:3000](http://localhost:3000) in your browser. The app will automatically redirect to the `/dashboard` tab.

### 3. Building and Running for Production

To create an optimized production build and run it:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

---

## How to Use the App

### Demo Mode (Default)
When you first open the app, it runs in **Demo Mode** using realistic sample data stored directly in your browser's IndexedDB. You can:
- Explore the **Dashboard** for a Mint-style overview of net worth, monthly budget pacing, and recent transactions.
- Open the **Budget View** (`/budget`) to inspect category spending, progress bars, and set budget targets.
- Open the **Transactions View** (`/transactions`) to search, filter by account/category, and record new transactions.
- Test offline behavior: changes are saved instantly and queued for sync.

### Connecting to Your Real YNAB Account
1. Click the **Settings** gear icon in the top-right header.
2. Toggle off **Demo / Mock Mode**.
3. Generate a Personal Access Token from your [YNAB Developer Settings](https://app.ynab.com/settings/developer).
4. Paste your token and click **Test Connection & Load Plans**.
5. Select your budget plan from the dropdown and click **Save Settings**.
6. The app will pull your real accounts, categories, and transactions into local IndexedDB and sync subsequent changes.