import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    const employee = employeeId
      ? await db.stylist.findUnique({
          where: { id: Number(employeeId) },
          select: { id: true, name: true, active: true },
        })
      : await db.stylist.findFirst({
          where: { active: true },
          orderBy: { id: "asc" },
          select: { id: true, name: true, active: true },
        });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

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

    const payload = {
      employee,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price.toString(),
        durationMinutes: service.durationMinutes,
        active: service.active,
      })),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch employee services:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee services" },
      { status: 500 }
    );
  }
}