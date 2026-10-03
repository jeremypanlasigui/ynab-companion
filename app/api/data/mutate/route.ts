import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case "SAVE_TRANSACTION": {
        await serverDb.saveTransactions([payload]);
        // Also update account balance & category balance in DB if requested
        if (payload.account_id) {
          const accounts = await serverDb.getAccounts();
          const acc = accounts.find((a) => a.id === payload.account_id);
          if (acc) {
            acc.balance += payload.amount;
            if (payload.cleared === "cleared") {
              acc.cleared_balance += payload.amount;
            } else {
              acc.uncleared_balance += payload.amount;
            }
            await serverDb.saveAccounts([acc]);
          }
        }
        if (payload.category_id) {
          const categories = await serverDb.getCategories();
          const cat = categories.find((c) => c.id === payload.category_id);
          if (cat) {
            cat.activity += payload.amount;
            cat.balance += payload.amount;
            await serverDb.saveCategories([cat]);
          }
        }
        return NextResponse.json({ success: true });
      }

      case "DELETE_TRANSACTION": {
        await serverDb.deleteTransaction(payload.id);
        if (payload.account_id && typeof payload.amount === "number") {
          const accounts = await serverDb.getAccounts();
          const acc = accounts.find((a) => a.id === payload.account_id);
          if (acc) {
            acc.balance -= payload.amount;
            if (payload.cleared === "cleared") {
              acc.cleared_balance -= payload.amount;
            } else {
              acc.uncleared_balance -= payload.amount;
            }
            await serverDb.saveAccounts([acc]);
          }
        }
        if (payload.category_id && typeof payload.amount === "number") {
          const categories = await serverDb.getCategories();
          const cat = categories.find((c) => c.id === payload.category_id);
          if (cat) {
            cat.activity -= payload.amount;
            cat.balance -= payload.amount;
            await serverDb.saveCategories([cat]);
          }
        }
        return NextResponse.json({ success: true });
      }

      case "SAVE_BUDGET": {
        await serverDb.saveBudget(payload);
        return NextResponse.json({ success: true });
      }

      case "UPDATE_CATEGORY_BUDGET": {
        const categories = await serverDb.getCategories();
        const cat = categories.find((c) => c.id === payload.category_id);
        if (cat) {
          const diff = payload.budgeted - cat.budgeted;
          cat.budgeted = payload.budgeted;
          cat.balance += diff;
          await serverDb.saveCategories([cat]);
        }
        return NextResponse.json({ success: true });
      }

      case "SAVE_SETTINGS": {
        const saved = await serverDb.saveSettings(payload);
        return NextResponse.json({ success: true, settings: saved });
      }

      case "ADD_SYNC_QUEUE": {
        const id = await serverDb.addSyncQueueItem(payload);
        return NextResponse.json({ success: true, id });
      }

      case "DELETE_SYNC_QUEUE": {
        await serverDb.deleteSyncQueueItem(payload.id);
        return NextResponse.json({ success: true });
      }

      case "SAVE_RECEIPT": {
        await serverDb.saveReceipts([payload]);
        return NextResponse.json({ success: true });
      }

      case "DELETE_RECEIPT": {
        await serverDb.deleteReceipt(payload.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown mutation action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("Mutation error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to execute mutation" },
      { status: 500 }
    );
  }
}
