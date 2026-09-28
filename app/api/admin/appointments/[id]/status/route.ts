import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

const requestedStatuses = ["confirmed", "rejected", "cancelled"] as const;
const allowedTransitions: Record<string, readonly string[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["cancelled"],
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const status =
    typeof body === "object" && body !== null && "status" in body
      ? body.status
      : undefined;

  if (
    typeof status !== "string" ||
    !requestedStatuses.includes(status as (typeof requestedStatuses)[number])
  ) {
    return NextResponse.json(
      { error: "Status must be confirmed, rejected, or cancelled" },
      { status: 400 }
    );
  }

  try {
    const appointment = await db.appointment.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const currentStatus = appointment.status.trim().toLowerCase();
    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot change appointment from ${appointment.status} to ${status}`,
        },
        { status: 409 }
      );
    }

    const update = await db.appointment.updateMany({
      where: { id, status: appointment.status },
      data: { status },
    });

    if (update.count === 0) {
      const current = await db.appointment.findUnique({
        where: { id },
        select: { status: true },
      });

      return NextResponse.json(
        {
          error: current
            ? "Appointment status changed before this request could be applied"
            : "Appointment not found",
        },
        { status: current ? 409 : 404 }
      );
    }

    const updatedAppointment = await db.appointment.findUnique({
      where: { id },
      include: { service: true, stylist: true },
    });

    return NextResponse.json({ success: true, appointment: updatedAppointment });
  } catch (error) {
    console.error("Failed to update appointment status:", error);
    return NextResponse.json(
      { error: "Failed to update appointment status" },
      { status: 500 }
    );
  }
}
