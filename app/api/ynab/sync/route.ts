import { NextResponse } from "next/server";
import { YNABApiClient } from "@/lib/ynab/api";
import { serverDb } from "@/lib/server/db";

export async function POST() {
  try {
    let settings = await serverDb.getSettings();
    if (!settings) {
      await serverDb.seedDemoData();
    }
    const currentSettings = await serverDb.getSettings();
    if (!currentSettings) {
      return NextResponse.json({ success: false, error: "Settings not found" }, { status: 500 });
    }

    const token = await serverDb.getEffectiveToken();

    // If demo mode or no token configured, simulate instant local sync
    if (currentSettings.is_demo_mode || !token) {
      await serverDb.clearSyncQueue();
      currentSettings.last_synced_at = new Date().toISOString();
      await serverDb.saveSettings(currentSettings);
      return NextResponse.json({
        success: true,
        data: await serverDb.getBootstrapData(),
      });
    }

    // Live mode with YNAB token
    const planId = currentSettings.selected_plan_id;
    if (!planId) {
      return NextResponse.json(
        { success: false, error: "No budget/plan selected in settings." },
        { status: 400 }
      );
    }

    const client = new YNABApiClient(token);

    // 1. Drain pending sync queue
    const queue = await serverDb.getSyncQueue();
    for (const item of queue) {
      try {
        if (item.type === "CREATE_TRANSACTION") {
          await client.createTransaction(item.payload.plan_id, item.payload.transaction);
          if (item.id) await serverDb.deleteSyncQueueItem(item.id);
        } else if (item.type === "UPDATE_CATEGORY_BUDGET") {
          await client.updateCategoryBudget(
            item.payload.plan_id,
            item.payload.month,
            item.payload.category_id,
            item.payload.budgeted
          );
          if (item.id) await serverDb.deleteSyncQueueItem(item.id);
        } else if (item.type === "UPDATE_TRANSACTION") {
          await client.updateTransaction(
            item.payload.plan_id,
            item.payload.transaction_id,
            item.payload.transaction
          );
          if (item.id) await serverDb.deleteSyncQueueItem(item.id);
        } else if (item.type === "DELETE_TRANSACTION") {
          await client.deleteTransaction(item.payload.plan_id, item.payload.transaction_id);
          if (item.id) await serverDb.deleteSyncQueueItem(item.id);
        }
      } catch (err: any) {
        console.error("Server sync item error:", item, err);
      }
    }

    // 2. Fetch incremental or full plan update from YNAB
    const fullPlanResponse = await client.getPlan(
      planId,
      currentSettings.last_server_knowledge || undefined
    );

    const serverKnowledge = fullPlanResponse.server_knowledge;
    const planData = fullPlanResponse.plan;

    if (planData.accounts?.length) {
      const accountsWithPlan = planData.accounts.map((acc: any) => ({
        ...acc,
        plan_id: planId,
      }));
      await serverDb.saveAccounts(accountsWithPlan);
    }

    if (planData.category_groups?.length) {
      const groups = planData.category_groups.map((cg: any) => ({
        id: cg.id,
        name: cg.name,
        hidden: cg.hidden,
        deleted: cg.deleted,
        plan_id: planId,
      }));
      await serverDb.saveCategoryGroups(groups);
    }

    if (planData.categories?.length) {
      const categoriesWithPlan = planData.categories.map((c: any) => ({
        ...c,
        plan_id: planId,
      }));
      await serverDb.saveCategories(categoriesWithPlan);
    }

    if (planData.transactions?.length) {
      const txsWithPlan = planData.transactions.map((tx: any) => ({
        ...tx,
        plan_id: planId,
      }));
      await serverDb.saveTransactions(txsWithPlan);
    }

    currentSettings.last_server_knowledge = serverKnowledge;
    currentSettings.last_synced_at = new Date().toISOString();
    await serverDb.saveSettings(currentSettings);

    const updatedData = await serverDb.getBootstrapData();
    return NextResponse.json({
      success: true,
      data: updatedData,
    });
  } catch (err: any) {
    console.error("Server sync error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
