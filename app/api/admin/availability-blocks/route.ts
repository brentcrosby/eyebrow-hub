import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// This endpoint is written for the intended camelCase Prisma schema.
// It requires the AvailabilityBlock table to have startTime/endTime fields.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start or end date" },
        { status: 400 }
      );
    }

    const availabilityBlocks = await db.availabilityBlock.findMany({
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(availabilityBlocks, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch availability blocks:", error);

    return NextResponse.json(
      { error: "Failed to fetch availability blocks" },
      { status: 500 }
    );
  }
}