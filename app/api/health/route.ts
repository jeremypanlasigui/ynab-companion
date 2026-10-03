import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkDb = searchParams.get("db") !== "false";

  let dbStatus = { ok: true, driver: serverDb.getDriverName() };
  if (checkDb) {
    try {
      dbStatus = await serverDb.healthCheck();
    } catch {
      dbStatus = { ok: false, driver: serverDb.getDriverName() };
    }
  }

  const isHealthy = !checkDb || dbStatus.ok;

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "unhealthy",
      app: "ynab-companion-app",
      version: "1.0.0",
      ynabApiVersion: "1.87.0",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
