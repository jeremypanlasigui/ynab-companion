import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "ynab-companion-app",
    version: "1.0.0",
    ynabApiVersion: "1.87.0",
    timestamp: new Date().toISOString(),
  });
}
