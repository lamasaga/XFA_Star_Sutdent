import { checkDatabaseHealth } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const db = await checkDatabaseHealth();
  const latency = Date.now() - start;

  const status = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status: db.ok ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: db.ok ? "connected" : "disconnected",
          latency: db.latency,
        },
        api: {
          status: "healthy",
          latency,
        },
      },
      uptime: process.uptime(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}
