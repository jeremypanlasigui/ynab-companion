import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server/db";

export async function GET() {
  try {
    const data = await serverDb.getBootstrapData();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Bootstrap GET error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load database bootstrap" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "reset_demo") {
      await serverDb.seedDemoData(true);
      const data = await serverDb.getBootstrapData();
      return NextResponse.json({ success: true, message: "Demo data reset successfully", data });
    }

    if (body.action === "save_all" && body.data) {
      const { plans, accounts, categoryGroups, categories, transactions, budgets, settings } = body.data;
      if (plans) await serverDb.savePlans(plans);
      if (accounts) await serverDb.saveAccounts(accounts);
      if (categoryGroups) await serverDb.saveCategoryGroups(categoryGroups);
      if (categories) await serverDb.saveCategories(categories);
      if (transactions) await serverDb.saveTransactions(transactions);
      if (budgets) {
        for (const b of budgets) await serverDb.saveBudget(b);
      }
      if (settings) await serverDb.saveSettings(settings);

      const refreshed = await serverDb.getBootstrapData();
      return NextResponse.json({ success: true, data: refreshed });
    }

    return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    console.error("Bootstrap POST error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process bootstrap request" },
      { status: 500 }
    );
  }
}
