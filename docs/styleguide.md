# YNAB Companion App Style Guide & Frontend Conventions

This document establishes the UI/UX design standards, component architecture, formatting conventions, and TypeScript/React code guidelines for the **YNAB Companion App**.

All new features, components, and refactors should adhere strictly to these guidelines to maintain a cohesive, high-performance, and polished fintech experience.

---

## 1. Visual Design Philosophy & Aesthetics

The YNAB Companion App is designed as a **Mint-inspired, high-density, snappy companion client**:
- **Dark-First Modern Fintech**: Sleek, eye-friendly dark aesthetic using zinc neutrals with vibrant, purposeful semantic accents.
- **Instantaneous Feel**: Zero layout shifts, snappy micro-transitions (150–200ms), and optimistic UI updates.
- **High Information Scannability**: Numbers and financial statuses must be immediately identifiable via consistent typography, color cues, and progress indicators.
- **Glassmorphism & Depth**: Subtle translucent layers (`backdrop-blur-xs` or `backdrop-blur-md`) with soft borders (`border-zinc-800/80`) to give elevated surfaces depth without clutter.

---

## 2. Color Palette & Semantic Tokens

We use [Tailwind CSS v4](https://tailwindcss.com/) with a curated set of palette tokens:

### 2.1 Surfaces & Neutrals
| Token / Utility | Use Case |
| :--- | :--- |
| `bg-zinc-950` | App-wide root background |
| `bg-zinc-900/60` | Card, container, and elevated panel backgrounds |
| `bg-zinc-900` | Input backgrounds, dropdowns, secondary button fills |
| `bg-zinc-800` | Selected navigation items, subtle hover states, separators |
| `border-zinc-800` | Standard border for cards, inputs, and tables |
| `border-zinc-800/80` | Subtle hairline borders for sticky headers & footers |
| `border-zinc-700` | Hover border for interactive cards and inputs |

### 2.2 Semantic Financial Accents
| Token / Utility | Semantic Meaning | Common Use Cases |
| :--- | :--- | :--- |
| `text-teal-400` / `bg-teal-500` | **Brand / Primary Action** | Primary buttons, active tabs, brand icons, logo accent |
| `text-emerald-400` / `bg-emerald-500` | **Positive / Inflow / Safe** | Inflows, income transactions, budgeted under target, positive balances |
| `text-amber-400` / `bg-amber-500` | **Caution / Near Budget** | Categories at 80%–100% of budget, pending sync status |
| `text-rose-400` / `bg-rose-500` | **Negative / Overspent / Error** | Overspent categories (>100%), negative account balances, sync failure |
| `text-violet-400` / `bg-violet-500` | **Transfers / Reconciliation** | Transfers between accounts, reconciled statuses |
| `text-zinc-400` | **Muted / Secondary** | Timestamps, memos, secondary labels, placeholders |

---

## 3. Typography & Hierarchy

The application utilizes **Geist Sans** for UI copy and **Geist Mono** for figures and dates.

### 3.1 Type Scale & Hierarchy
- **Page Titles**: `text-2xl sm:text-3xl font-extrabold tracking-tight text-white`
- **Section Headers**: `text-base sm:text-lg font-bold text-white tracking-tight`
- **Card Subheadings / Group Titles**: `text-xs sm:text-sm font-semibold text-zinc-300`
- **Body & Row Text**: `text-xs sm:text-sm text-zinc-200`
- **Secondary / Helper Text**: `text-xs text-zinc-400`
- **Metadata / Micro Badges**: `text-[10px] sm:text-[11px] font-medium text-zinc-500`

### 3.2 Monospace for Numbers
Always apply monospace formatting or tabular figures to financial tables, transaction amounts, and balances so decimals and commas align vertically:
```tsx
<span className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-white">
  {formatCurrency(amount)}
</span>
```

---

## 4. Financial Representation & Formatting Rules

### 4.1 The Milliunit Rule
YNAB represents all monetary amounts as **milliunits** (integer values where `1000 milliunits = $1.00`).
- **Never store floats or dollar decimals in database schemas or state.**
- **Conversions**:
  - Milliunits to standard number: `milliunitsToNumber(milliunits)` (`val / 1000`)
  - User input to milliunits: `numberToMilliunits(number)` (`Math.round(val * 1000)`)

### 4.2 Currency Display (`formatCurrency`)
Use the centralized `formatCurrency` utility from `lib/ynab/utils.ts`:
```tsx
import { formatCurrency } from "@/lib/ynab/utils";

// Standard representation: "$45.20" or "-$12.50"
formatCurrency(tx.amount);

// Forced sign for inflows: "+$1,200.00"
formatCurrency(tx.amount, { showSign: true });

// Round dollar display for summaries: "$1,250"
formatCurrency(budgetTotal, { hideDecimals: true });
```

### 4.3 Sign Conventions
- **Transactions**:
  - Inflow (Income/Deposit): Positive number (`amount > 0`).
  - Outflow (Expense/Spending): Negative number (`amount < 0`).
- **Category Activity**:
  - Negative for spending (e.g. `-45000` = spent $45.00).
- **Transfers**:
  - Matched pairs of transactions across accounts with positive/negative mirrored amounts and `transfer_account_id` set.

---

## 5. Component Anatomy & UI Patterns

### 5.1 Cards & Containers
Standard card wrapper:
```tsx
<div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-xs transition-all hover:border-zinc-700/80">
  {/* Card Header */}
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-zinc-400">{subtitle}</p>
    </div>
    {actionSlot}
  </div>
  {/* Card Body */}
  <div>{children}</div>
</div>
```

### 5.2 Buttons
- **Primary Action (Mint Glow)**:
  `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-zinc-950 transition-all shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-95`
- **Secondary / Ghost Action**:
  `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all active:scale-95`
- **Danger Action**:
  `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-all`

### 5.3 Modals
Use the shared `Modal` component (`components/ui/Modal.tsx`) rather than creating custom fixed overlay divs.
- Always include an accessible title and dismiss button (`X` icon).
- Max width should scale appropriately: `max-w-md` for alerts/confirmation, `max-w-2xl` for standard forms, `max-w-4xl` for multi-column wizards.

### 5.4 Badges & Status Pills
Use `components/ui/Badge.tsx`:
```tsx
<Badge variant="emerald">Cleared</Badge>
<Badge variant="amber">Pending</Badge>
<Badge variant="rose">Overspent</Badge>
<Badge variant="zinc">Uncategorized</Badge>
```

---

## 6. React 19 & TypeScript Code Standards

### 6.1 Avoid `any`
Loose types are strictly disallowed.
- Use explicit domain interfaces from `lib/ynab/types.ts` (`TransactionDetail`, `Category`, `Account`, `Budget`).
- For unknown payloads or mutation items, use discriminated unions or `Record<string, unknown>`.
- Example:
  ```typescript
  // ❌ Bad
  async function postMutation(action: string, payload: any) { ... }

  // ✅ Good
  export type MutationPayload =
    | { action: "upsertTransaction"; payload: TransactionDetail }
    | { action: "deleteTransaction"; payload: { id: string } }
    | { action: "saveBudget"; payload: Budget };

  async function postMutation(mutation: MutationPayload) { ... }
  ```

### 6.2 React 19 Effect Hygiene (No Synchronous `setState` in Effects)
React 19 flags synchronous `setState` inside `useEffect` (`react-hooks/set-state-in-effect`) because it triggers cascading re-renders.
- **Pattern 1: Derive state during rendering instead of syncing via Effect**:
  ```tsx
  // ❌ Bad: Syncing props into state with useEffect
  useEffect(() => {
    if (settings) {
      setToken(settings.api_token);
    }
  }, [settings]);

  // ✅ Good: Derive or use key to reset
  const token = customToken ?? settings?.api_token ?? "";
  ```
- **Pattern 2: Mount check without cascading renders**:
  If hydration safety is needed, prefer checking browser presence or using `useSyncExternalStore`.

### 6.3 Separation of Calculation Logic from UI Rendering
Never write 200+ line aggregation or filtering loops directly inside JSX or page components.
- Extract calculations to pure functions in `utils.ts` or custom hooks:
  - `useBudgetMonthCalculations(transactions, categories, month)`
  - `calculateCategorySpending(transactions, categories)`
  - `groupTransfers(transactions)`
- Keep page components focused on layout, coordinating hooks, and passing props to focused child components.

---

## 7. Icons & Media
- Use [`lucide-react`](https://lucide.dev/) exclusively for icons.
- Set uniform sizes: `w-3.5 h-3.5` for buttons/badges, `w-4 h-4` for standard inputs/navigation, `w-5 h-5` for card hero icons.
- Always provide descriptive text or aria labels alongside icon-only buttons.
