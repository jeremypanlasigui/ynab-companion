import { NextResponse } from "next/server";
import { YNABApiClient } from "@/lib/ynab/api";
import { serverDb } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let token = body.token?.trim();

    if (!token) {
      token = serverDb.getEffectiveToken();
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No YNAB Personal Access Token provided. Please enter a token or set YNAB_ACCESS_TOKEN in .env.local.",
          hasEnvToken: Boolean(process.env.YNAB_ACCESS_TOKEN),
        },
        { status: 400 }
      );
    }

    const client = new YNABApiClient(token);
    const res = await client.getPlans();

    if (res.plans && res.plans.length > 0) {
      serverDb.savePlans(res.plans);
    }

    return NextResponse.json({
      success: true,
      plans: res.plans || [],
      default_plan: res.default_plan,
      hasEnvToken: Boolean(process.env.YNAB_ACCESS_TOKEN),
    });
  } catch (err: any) {
    console.error("YNAB test token error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to verify YNAB access token.",
        hasEnvToken: Boolean(process.env.YNAB_ACCESS_TOKEN),
      },
      { status: 400 }
    );
  }
}
