import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const services = await db.service.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
      },
    });

    const payload = services.map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
      durationMinutes: s.durationMinutes,
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
