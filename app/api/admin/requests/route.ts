import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    const bookingRequests = await db.bookingRequest.findMany({
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const payload = bookingRequests.map((bookingRequest) => ({
      id: bookingRequest.id,
      customerName: bookingRequest.customerName,
      serviceId: bookingRequest.serviceId,
      service: bookingRequest.service,
      requestedDateTime: bookingRequest.requestedDateTime.toISOString(),
      status: bookingRequest.status.toLowerCase(),
      createdAt: bookingRequest.createdAt.toISOString(),
      updatedAt: bookingRequest.updatedAt.toISOString(),
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch booking requests:", error);

    return NextResponse.json(
      { error: "Failed to fetch booking requests" },
      { status: 500 }
    );
  }
}
