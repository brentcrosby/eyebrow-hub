import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { parsePacificRange } from "@/lib/pacificTimeInput";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        {
          error: "Start and end dates are required",
        },
        {
          status: 400,
        }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid start or end date",
        },
        {
          status: 400,
        }
      );
    }

    const availabilityBlocks = await db.availabilityBlock.findMany({
      where: {
        startTime: {
          lt: endDate,
        },
        endTime: {
          gt: startDate,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(availabilityBlocks, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch availability blocks:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch availability blocks",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    let body: {
      date?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      reason?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "A valid unavailable-time request is required." },
        { status: 400 }
      );
    }

    // The form sends a Pacific date and "HH:MM" times; the instant is worked
    // out here so the staff member's browser timezone never changes it.
    const range = parsePacificRange(body.date, body.startTime, body.endTime);

    if (!range.ok) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const { start: startTime, end: endTime } = range;

    const overlap = await db.availabilityBlock.findFirst({
      where: {
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
      select: {
        id: true,
      },
    });

    if (overlap) {
      return NextResponse.json(
        {
          error: "This time overlaps an existing unavailable block",
        },
        {
          status: 409,
        }
      );
    }

    const block = await db.availabilityBlock.create({
      data: {
        startTime,
        endTime,
        reason:
          typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim()
            : null,
      },
    });

    return NextResponse.json(block, {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create availability block:", error);

    return NextResponse.json(
      {
        error: "Failed to create availability block",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authenticated) {
    return auth.response;
  }

  const id = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      {
        error: "A valid block id is required",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const result = await db.availabilityBlock.deleteMany({
      where: {
        id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error: "Unavailable block not found",
        },
        {
          status: 404,
        }
      );
    }

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Failed to delete availability block:", error);

    return NextResponse.json(
      {
        error: "Failed to delete availability block",
      },
      {
        status: 500,
      }
    );
  }
}