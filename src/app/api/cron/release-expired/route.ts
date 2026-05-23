// src/app/api/cron/release-expired/route.ts
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/expiry";

export const dynamic = "force-dynamic";

/**
 * Called by Vercel Cron every minute (see vercel.json).
 * Protected by CRON_SECRET to prevent public abuse.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseExpiredReservations();
    return NextResponse.json({ released, ok: true });
  } catch (err) {
    console.error("[CRON release-expired]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
