import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { releaseExpiredReservations } = await import("@/lib/expiry");
    const released = await releaseExpiredReservations();
    return NextResponse.json({ released, ok: true });
  } catch (err) {
    console.error("[CRON release-expired]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}