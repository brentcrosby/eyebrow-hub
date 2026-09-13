import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type ServiceResponse = {
  id: number;
  name: string;
  price: string;
  durationMinutes: number;
  active: boolean;
};

export async function GET(): Promise<Response> {
  try {
    const services = await db.service.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        active: true,
      },
    });

    const payload: ServiceResponse[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price.toString(),
      durationMinutes: s.durationMinutes,
      active: s.active,
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
