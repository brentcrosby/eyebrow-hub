import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 500 }
    );
  }
}
