import { useMemo } from "react";
import { TransactionDetail, Category, Account, Budget } from "@/lib/ynab/types";
import { PieChartSlice } from "@/components/ui/PieChart";
import {
  CategorySpendingSummary,
  AccountTransferItem,
  BalanceAdjustmentItem,
  StartingBalanceItem,
  IncomeTransactionItem,
  IncomeCategoryBreakdown,
  IncomePayeeBreakdown,
  BudgetCalculationResult,
} from "./types";
import { COLOR_PALETTE } from "./constants";

interface UseBudgetCalculationsProps {
  rawTransactions: TransactionDetail[];
  categories: Category[];
  accounts: Account[];
  localBudget?: Budget;
  selectedIncomeCategoryIds: Set<string>;
}

export function useBudgetCalculations({
  rawTransactions,
  categories,
  accounts,
  localBudget,
  selectedIncomeCategoryIds,
}: UseBudgetCalculationsProps): BudgetCalculationResult {
  // Map of account ID to account Name for quick reference
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (accounts) {
      for (const acc of accounts) {
        map.set(acc.id, acc.name);
      }
    }
    return map;
  }, [accounts]);

  // Color mapper by category ID
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIdx = 0;
    for (const cat of categories) {
      map.set(cat.id, COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]);
      colorIdx++;
    }
    return map;
  }, [categories]);

  return useMemo(() => {
    const spendingMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        totalSpent: number;
        totalInflow: number;
        netSpent: number;
        transactionCount: number;
        transactions: {
          id: string;
          date: string;
          amount: number;
          payeeName: string;
          memo?: string | null;
        }[];
      }
    >();

    const incomeMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryGroupName?: string | null;
        totalIncome: number;
        transactions: IncomeTransactionItem[];
      }
    >();

    const categoryInflows = new Map<string, number>();

    const isIncomeCat = (catId?: string | null, catName?: string | null) => {
      if (catId && selectedIncomeCategoryIds.has(catId)) return true;
      if (
        (!catId || catId === "inflow:ready-to-assign" || catId === "cat-inflow") &&
        catName?.toLowerCase().includes("ready to assign") &&
        (selectedIncomeCategoryIds.has("inflow:ready-to-assign") ||
          selectedIncomeCategoryIds.has("cat-inflow"))
      ) {
        return true;
      }
      return false;
    };

    const transfers: AccountTransferItem[] = [];
    const balanceAdjustments: BalanceAdjustmentItem[] = [];
    const accountsAdded: StartingBalanceItem[] = [];
    const processedTransferIds = new Set<string>();
    let spendingTxCount = 0;

    // 1. Process transactions
    for (const tx of rawTransactions) {
      if (tx.deleted) continue;

      // Starting balance detection
      const isTxStartingBalance = Boolean(
        tx.payee_name?.trim().toLowerCase() === "starting balance" ||
          tx.payee_name?.toLowerCase().includes("starting balance") ||
          tx.memo?.toLowerCase().includes("starting balance")
      );

      if (isTxStartingBalance) {
        const accObj = accounts.find((a) => a.id === tx.account_id);
        accountsAdded.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          accountName:
            tx.account_name ||
            accObj?.name ||
            accountsMap.get(tx.account_id) ||
            "Account",
          accountType: accObj?.type,
          payeeName: tx.payee_name || "Starting Balance",
          memo: tx.memo,
          cleared: tx.cleared,
        });
        continue;
      }

      // Track inflow amounts for modal category badges
      if (tx.amount > 0) {
        const rawCatId =
          tx.category_id ||
          (tx.category_name?.toLowerCase().includes("ready to assign")
            ? "inflow:ready-to-assign"
            : "uncategorized");
        categoryInflows.set(rawCatId, (categoryInflows.get(rawCatId) || 0) + tx.amount);
      }

      // Balance adjustment detection
      const isTxBalanceAdjustment = Boolean(
        tx.debt_transaction_type === "balanceAdjustment" ||
          tx.payee_name?.toLowerCase().includes("balance adjustment") ||
          tx.payee_name?.toLowerCase().includes("reconciliation") ||
          tx.memo?.toLowerCase().includes("balance adjustment")
      );

      if (isTxBalanceAdjustment) {
        balanceAdjustments.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          accountName:
            tx.account_name ||
            accountsMap.get(tx.account_id) ||
            "Unknown Account",
          payeeName: tx.payee_name || "Reconciliation Balance Adjustment",
          memo: tx.memo,
          cleared: tx.cleared,
        });
        continue;
      }

      // Transfer detection
      const isTxTransfer = Boolean(
        tx.transfer_account_id ||
          tx.transfer_transaction_id ||
          tx.payee_name?.trim().toLowerCase().startsWith("transfer :") ||
          tx.payee_name?.trim().toLowerCase().startsWith("transfer:")
      );

      if (isTxTransfer) {
        if (!processedTransferIds.has(tx.id)) {
          processedTransferIds.add(tx.id);
          if (tx.transfer_transaction_id) {
            processedTransferIds.add(tx.transfer_transaction_id);
          }

          let fromAccount = "";
          let toAccount = "";

          const otherAccountFromPayee = tx.payee_name
            ? tx.payee_name.replace(/^transfer\s*:\s*/i, "").trim()
            : "";
          const otherAccountFromId = tx.transfer_account_id
            ? accountsMap.get(tx.transfer_account_id) ||
              `Account (${tx.transfer_account_id})`
            : "";
          const resolvedOtherAccount =
            otherAccountFromPayee || otherAccountFromId || "Linked Account";

          if (tx.amount < 0) {
            fromAccount = tx.account_name || "Unknown Account";
            toAccount = resolvedOtherAccount;
          } else {
            fromAccount = resolvedOtherAccount;
            toAccount = tx.account_name || "Unknown Account";
          }

          transfers.push({
            id: tx.id,
            date: tx.date,
            amount: Math.abs(tx.amount),
            fromAccountName: fromAccount,
            toAccountName: toAccount,
            memo: tx.memo,
            cleared: tx.cleared,
            pairTransactionId: tx.transfer_transaction_id,
          });
        }
        continue;
      }

      // Subtransactions (split)
      if (tx.subtransactions && tx.subtransactions.length > 0) {
        for (const sub of tx.subtransactions) {
          if (sub.deleted) continue;

          // Check if subtransaction is starting balance
          const isSubStartingBalance = Boolean(
            sub.payee_name?.trim().toLowerCase() === "starting balance" ||
              sub.payee_name?.toLowerCase().includes("starting balance") ||
              sub.memo?.toLowerCase().includes("starting balance") ||
              tx.payee_name?.toLowerCase().includes("starting balance")
          );

          if (isSubStartingBalance) {
            const accObj = accounts.find((a) => a.id === tx.account_id);
            accountsAdded.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: sub.amount,
              accountName:
                tx.account_name ||
                accObj?.name ||
                accountsMap.get(tx.account_id) ||
                "Account",
              accountType: accObj?.type,
              payeeName: sub.payee_name || tx.payee_name || "Starting Balance",
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });
            continue;
          }

          if (sub.amount > 0) {
            const rawCatId =
              sub.category_id ||
              (sub.payee_name?.toLowerCase().includes("ready to assign")
                ? "inflow:ready-to-assign"
                : "uncategorized");
            categoryInflows.set(
              rawCatId,
              (categoryInflows.get(rawCatId) || 0) + sub.amount
            );
          }

          // Check if subtransaction is a balance adjustment
          const isSubBalanceAdjustment = Boolean(
            sub.payee_name?.toLowerCase().includes("balance adjustment") ||
              sub.payee_name?.toLowerCase().includes("reconciliation") ||
              sub.memo?.toLowerCase().includes("balance adjustment")
          );

          if (isSubBalanceAdjustment) {
            balanceAdjustments.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: sub.amount,
              accountName:
                tx.account_name ||
                accountsMap.get(tx.account_id) ||
                "Unknown Account",
              payeeName:
                sub.payee_name ||
                tx.payee_name ||
                "Reconciliation Balance Adjustment",
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });
            continue;
          }

          const isSubTransfer = Boolean(
            sub.transfer_account_id ||
              sub.payee_name?.trim().toLowerCase().startsWith("transfer :") ||
              sub.payee_name?.trim().toLowerCase().startsWith("transfer:")
          );

          if (isSubTransfer) {
            let fromAccount = "";
            let toAccount = "";
            const otherAccountFromPayee = sub.payee_name
              ? sub.payee_name.replace(/^transfer\s*:\s*/i, "").trim()
              : "";
            const otherAccountFromId = sub.transfer_account_id
              ? accountsMap.get(sub.transfer_account_id) ||
                `Account (${sub.transfer_account_id})`
            : "";
            const resolvedOtherAccount =
              otherAccountFromPayee || otherAccountFromId || "Linked Account";

            if (sub.amount < 0) {
              fromAccount = tx.account_name || "Unknown Account";
              toAccount = resolvedOtherAccount;
            } else {
              fromAccount = resolvedOtherAccount;
              toAccount = tx.account_name || "Unknown Account";
            }

            transfers.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: Math.abs(sub.amount),
              fromAccountName: fromAccount,
              toAccountName: toAccount,
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });
            continue;
          }

          // Check if subtransaction is Income
          if (isIncomeCat(sub.category_id, sub.payee_name || tx.category_name)) {
            const resolvedCatId = sub.category_id || "inflow:ready-to-assign";
            const catObj = categories.find((c) => c.id === resolvedCatId);
            const resolvedCatName =
              catObj?.name ||
              sub.payee_name ||
              tx.category_name ||
              "Inflow: Ready to Assign";
            const resolvedGroupName =
              catObj?.category_group_name || "Income & Inflows";

            if (!incomeMap.has(resolvedCatId)) {
              incomeMap.set(resolvedCatId, {
                categoryId: resolvedCatId,
                categoryName: resolvedCatName,
                categoryGroupName: resolvedGroupName,
                totalIncome: 0,
                transactions: [],
              });
            }

            const inc = incomeMap.get(resolvedCatId)!;
            inc.totalIncome += sub.amount;
            inc.transactions.push({
              id: `${tx.id}-${sub.id}`,
              date: tx.date,
              amount: sub.amount,
              payeeName: sub.payee_name || tx.payee_name || "Unknown Payee",
              accountName:
                tx.account_name ||
                accountsMap.get(tx.account_id) ||
                "Account",
              categoryId: resolvedCatId,
              categoryName: resolvedCatName,
              memo: sub.memo || tx.memo,
              cleared: tx.cleared,
            });

            continue;
          }

          spendingTxCount++;
          const catId = sub.category_id || "uncategorized";
          const catName = sub.category_name || "Uncategorized";

          if (!spendingMap.has(catId)) {
            spendingMap.set(catId, {
              categoryId: catId,
              categoryName: catName,
              totalSpent: 0,
              totalInflow: 0,
              netSpent: 0,
              transactionCount: 0,
              transactions: [],
            });
          }

          const item = spendingMap.get(catId)!;
          item.transactionCount++;

          if (sub.amount < 0) {
            item.totalSpent += Math.abs(sub.amount);
          } else {
            item.totalInflow += sub.amount;
          }
          item.netSpent = item.totalSpent - item.totalInflow;

          item.transactions.push({
            id: `${tx.id}-${sub.id}`,
            date: tx.date,
            amount: sub.amount,
            payeeName: sub.payee_name || tx.payee_name || "Unknown Payee",
            memo: sub.memo || tx.memo,
          });
        }
      } else {
        // Income transaction detection
        if (isIncomeCat(tx.category_id, tx.category_name)) {
          const resolvedCatId = tx.category_id || "inflow:ready-to-assign";
          const catObj = categories.find((c) => c.id === resolvedCatId);
          const resolvedCatName =
            catObj?.name || tx.category_name || "Inflow: Ready to Assign";
          const resolvedGroupName =
            catObj?.category_group_name || "Income & Inflows";

          if (!incomeMap.has(resolvedCatId)) {
            incomeMap.set(resolvedCatId, {
              categoryId: resolvedCatId,
              categoryName: resolvedCatName,
              categoryGroupName: resolvedGroupName,
              totalIncome: 0,
              transactions: [],
            });
          }

          const inc = incomeMap.get(resolvedCatId)!;
          inc.totalIncome += tx.amount;
          inc.transactions.push({
            id: tx.id,
            date: tx.date,
            amount: tx.amount,
            payeeName: tx.payee_name || "Unknown Payee",
            accountName:
              tx.account_name || accountsMap.get(tx.account_id) || "Account",
            categoryId: resolvedCatId,
            categoryName: resolvedCatName,
            memo: tx.memo,
            cleared: tx.cleared,
          });

          continue;
        }

        // Standard transaction
        spendingTxCount++;
        const catId = tx.category_id || "uncategorized";
        const catName =
          tx.category_name ||
          (tx.amount > 0 ? "Inflow: Ready to Assign" : "Uncategorized");

        if (!spendingMap.has(catId)) {
          spendingMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            totalSpent: 0,
            totalInflow: 0,
            netSpent: 0,
            transactionCount: 0,
            transactions: [],
          });
        }

        const item = spendingMap.get(catId)!;
        item.transactionCount++;

        if (tx.amount < 0) {
          item.totalSpent += Math.abs(tx.amount);
        } else {
          item.totalInflow += tx.amount;
        }
        item.netSpent = item.totalSpent - item.totalInflow;

        item.transactions.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          payeeName: tx.payee_name || "Unknown Payee",
          memo: tx.memo,
        });
      }
    }

    // 2. Build local budget mapping for this month
    const budgetMap = new Map<string, number>();
    if (localBudget?.categories) {
      for (const b of localBudget.categories) {
        budgetMap.set(b.category_id, b.amount);
      }
    }

    // 3. Collect all category IDs
    const allCategoryIds = new Set<string>();
    for (const [id, s] of spendingMap.entries()) {
      if (s.totalSpent > 0) allCategoryIds.add(id);
    }
    for (const [id, amt] of budgetMap.entries()) {
      if (amt > 0) allCategoryIds.add(id);
    }
    for (const c of categories) {
      if (!c.deleted && !c.hidden) {
        allCategoryIds.add(c.id);
      }
    }

    // 4. Build unified category summaries
    const combinedList: CategorySpendingSummary[] = [];

    allCategoryIds.forEach((catId) => {
      const spending = spendingMap.get(catId);
      const budgetedAmount = budgetMap.get(catId) || 0;
      const totalSpent = spending?.totalSpent || 0;

      if (totalSpent === 0 && budgetedAmount === 0) return;

      const catObj = categories.find((c) => c.id === catId);
      const categoryName =
        catObj?.name || spending?.categoryName || "Uncategorized";

      let progressPercentage = 0;
      if (budgetedAmount > 0) {
        progressPercentage = Math.round((totalSpent / budgetedAmount) * 100);
      } else if (totalSpent > 0) {
        progressPercentage = 100;
      }

      const remainingAmount = budgetedAmount - totalSpent;
      const color =
        categoryColorMap.get(catId) ||
        COLOR_PALETTE[combinedList.length % COLOR_PALETTE.length];

      combinedList.push({
        categoryId: catId,
        categoryName,
        totalSpent,
        totalInflow: spending?.totalInflow || 0,
        netSpent: spending?.netSpent || 0,
        transactionCount: spending?.transactionCount || 0,
        transactions: spending?.transactions || [],
        budgetedAmount,
        progressPercentage,
        remainingAmount,
        color,
      });
    });

    combinedList.sort(
      (a, b) => b.totalSpent - a.totalSpent || b.budgetedAmount - a.budgetedAmount
    );

    const totalSpentAll = combinedList.reduce((acc, c) => acc + c.totalSpent, 0);
    const totalBudgetedAll = combinedList.reduce(
      (acc, c) => acc + c.budgetedAmount,
      0
    );

    const top = combinedList.find((c) => c.totalSpent > 0) || null;

    transfers.sort((a, b) => b.date.localeCompare(a.date));
    const totalTransferredVolume = transfers.reduce(
      (acc, c) => acc + c.amount,
      0
    );

    balanceAdjustments.sort((a, b) => b.date.localeCompare(a.date));
    const totalAdjustmentsNet = balanceAdjustments.reduce(
      (acc, c) => acc + c.amount,
      0
    );

    accountsAdded.sort((a, b) => b.date.localeCompare(a.date));
    const totalAccountsAddedNet = accountsAdded.reduce(
      (acc, c) => acc + c.amount,
      0
    );

    // 5. Aggregate Income Breakdown
    for (const catId of selectedIncomeCategoryIds) {
      if (!incomeMap.has(catId)) {
        const catObj = categories.find((c) => c.id === catId);
        const name =
          catObj?.name ||
          (catId === "inflow:ready-to-assign"
            ? "Inflow: Ready to Assign"
            : "Income Category");
        const group = catObj?.category_group_name || "Income & Inflows";
        incomeMap.set(catId, {
          categoryId: catId,
          categoryName: name,
          categoryGroupName: group,
          totalIncome: 0,
          transactions: [],
        });
      }
    }

    let totalMonthIncome = 0;
    for (const item of incomeMap.values()) {
      if (item.totalIncome > 0) {
        totalMonthIncome += item.totalIncome;
      }
    }

    const incomeCategoryBreakdown: IncomeCategoryBreakdown[] = [];
    for (const item of incomeMap.values()) {
      const percentage =
        totalMonthIncome > 0
          ? Math.round(
              (Math.max(0, item.totalIncome) / totalMonthIncome) * 100
            )
          : 0;

      item.transactions.sort((a, b) => b.date.localeCompare(a.date));

      incomeCategoryBreakdown.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryGroupName: item.categoryGroupName,
        totalIncome: Math.max(0, item.totalIncome),
        percentageOfTotal: percentage,
        transactionCount: item.transactions.length,
        transactions: item.transactions,
      });
    }

    incomeCategoryBreakdown.sort((a, b) => b.totalIncome - a.totalIncome);

    // 6. Aggregate Income by Payee
    const payeeMap = new Map<
      string,
      {
        payeeName: string;
        totalIncome: number;
        categoryMap: Map<
          string,
          { categoryId: string; categoryName: string; amount: number }
        >;
        transactions: IncomeTransactionItem[];
      }
    >();

    for (const catItem of incomeMap.values()) {
      for (const tx of catItem.transactions) {
        const rawPayee = (tx.payeeName || "").trim();
        const payeeKey = rawPayee || "Unspecified Payee";

        if (!payeeMap.has(payeeKey)) {
          payeeMap.set(payeeKey, {
            payeeName: payeeKey,
            totalIncome: 0,
            categoryMap: new Map(),
            transactions: [],
          });
        }

        const p = payeeMap.get(payeeKey)!;
        p.totalIncome += tx.amount;
        p.transactions.push(tx);

        const catKey = tx.categoryId || catItem.categoryId;
        const catName = tx.categoryName || catItem.categoryName;
        if (!p.categoryMap.has(catKey)) {
          p.categoryMap.set(catKey, {
            categoryId: catKey,
            categoryName: catName,
            amount: 0,
          });
        }
        p.categoryMap.get(catKey)!.amount += tx.amount;
      }
    }

    const incomePayeeBreakdown: IncomePayeeBreakdown[] = [];
    for (const p of payeeMap.values()) {
      const percentage =
        totalMonthIncome > 0
          ? Math.round((Math.max(0, p.totalIncome) / totalMonthIncome) * 100)
          : 0;

      p.transactions.sort((a, b) => b.date.localeCompare(a.date));

      const catContributions = Array.from(p.categoryMap.values()).sort(
        (a, b) => b.amount - a.amount
      );

      incomePayeeBreakdown.push({
        payeeName: p.payeeName,
        totalIncome: Math.max(0, p.totalIncome),
        percentageOfTotal: percentage,
        transactionCount: p.transactions.length,
        categories: catContributions,
        transactions: p.transactions,
      });
    }

    incomePayeeBreakdown.sort((a, b) => b.totalIncome - a.totalIncome);

    const netCashflow = totalMonthIncome - totalSpentAll;
    const savingsRate =
      totalMonthIncome > 0
        ? Math.round((netCashflow / totalMonthIncome) * 100)
        : null;

    // 7. Pie chart slices
    const realitySlices: PieChartSlice[] = combinedList
      .filter((c) => c.totalSpent > 0)
      .map((c) => ({
        id: c.categoryId,
        label: c.categoryName,
        value: c.totalSpent,
        color: c.color,
      }));

    const budgetSlices: PieChartSlice[] = combinedList
      .filter((c) => c.budgetedAmount > 0)
      .map((c) => ({
        id: c.categoryId,
        label: c.categoryName,
        value: c.budgetedAmount,
        color: c.color,
      }));

    return {
      categoryList: combinedList,
      totalSpending: totalSpentAll,
      totalBudgeted: totalBudgetedAll,
      totalSpendingTxCount: spendingTxCount,
      topCategory: top,
      transfersList: transfers,
      totalTransferred: totalTransferredVolume,
      balanceAdjustmentsList: balanceAdjustments,
      totalAdjustmentsNet,
      accountsAddedList: accountsAdded,
      totalAccountsAddedNet,
      totalMonthIncome,
      incomeCategoryBreakdown,
      incomePayeeBreakdown,
      netCashflow,
      savingsRate,
      categoryInflowMap: categoryInflows,
      realitySlices,
      budgetSlices,
    };
  }, [
    rawTransactions,
    accounts,
    accountsMap,
    localBudget,
    categories,
    categoryColorMap,
    selectedIncomeCategoryIds,
  ]);
}
