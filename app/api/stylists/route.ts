import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stylists = await db.stylist.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(stylists, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch stylists:", error);
    return NextResponse.json(
      { error: "Failed to fetch stylists" },
      { status: 500 }
    );
  }
}
