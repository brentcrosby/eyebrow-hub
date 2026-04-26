import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    const pendingRequestsCount = await db.bookingRequest.count({
      where: {
        status: "PENDING",
      },
    });

    return NextResponse.json({ pendingRequestsCount }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);

    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
