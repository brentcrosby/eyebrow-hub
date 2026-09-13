import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";

type SettingsBody = {
  businessHours?: Array<{
    dayOfWeek?: unknown;
    enabled?: unknown;
    openMinutes?: unknown;
    closeMinutes?: unknown;
  }>;
  schedulingRule?: {
    minimumNoticeMinutes?: unknown;
    maximumAdvanceDays?: unknown;
    bufferMinutes?: unknown;
  };
};

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function validate(body: SettingsBody): string | null {
  if (
    !Array.isArray(body.businessHours) ||
    body.businessHours.length !== 7
  ) {
    return "Business hours must contain all seven weekdays";
  }

  const days = new Set<number>();

  for (const hours of body.businessHours) {
    if (
      !Number.isInteger(hours.dayOfWeek) ||
      Number(hours.dayOfWeek) < 0 ||
      Number(hours.dayOfWeek) > 6
    ) {
      return "Each weekday must be a number from 0 through 6";
    }

    days.add(Number(hours.dayOfWeek));

    if (typeof hours.enabled !== "boolean") {
      return "Each weekday must include enabled";
    }

    if (
      !isNonNegativeInteger(hours.openMinutes) ||
      !isNonNegativeInteger(hours.closeMinutes)
    ) {
      return "Opening and closing times must be numeric minutes";
    }

    if (
      Number(hours.openMinutes) >= 1440 ||
      Number(hours.closeMinutes) > 1440
    ) {
      return "Opening and closing times must be within one day";
    }

    if (
      hours.enabled &&
      Number(hours.openMinutes) >= Number(hours.closeMinutes)
    ) {
      return "Opening time must be before closing time for enabled days";
    }
  }

  if (days.size !== 7) {
    return "Each weekday can appear only once";
  }

  const rule = body.schedulingRule;

  if (!rule) {
    return "Scheduling rules are required";
  }

  if (!isNonNegativeInteger(rule.minimumNoticeMinutes)) {
    return "Minimum notice must be non-negative minutes";
  }

  if (
    !isNonNegativeInteger(rule.maximumAdvanceDays) ||
    Number(rule.maximumAdvanceDays) < 1
  ) {
    return "Maximum advance booking must be at least one day";
  }

  if (!isNonNegativeInteger(rule.bufferMinutes)) {
    return "Buffer time must be non-negative minutes";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json(await getAvailabilitySettings());
  } catch (error) {
    console.error("Failed to load availability settings:", error);

    return NextResponse.json(
      {
        error: "Failed to load availability settings",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as SettingsBody;
    const validationError = validate(body);

    if (validationError) {
      return NextResponse.json(
        {
          error: validationError,
        },
        {
          status: 400,
        }
      );
    }

    const businessHours = body.businessHours!;
    const rule = body.schedulingRule!;

    await db.$transaction([
      ...businessHours.map((hours) =>
        db.businessHour.upsert({
          where: {
            dayOfWeek: Number(hours.dayOfWeek),
          },
          update: {
            enabled: Boolean(hours.enabled),
            openMinutes: Number(hours.openMinutes),
            closeMinutes: Number(hours.closeMinutes),
          },
          create: {
            dayOfWeek: Number(hours.dayOfWeek),
            enabled: Boolean(hours.enabled),
            openMinutes: Number(hours.openMinutes),
            closeMinutes: Number(hours.closeMinutes),
          },
        })
      ),
      db.schedulingRule.upsert({
        where: {
          id: 1,
        },
        update: {
          minimumNoticeMinutes: Number(rule.minimumNoticeMinutes),
          maximumAdvanceDays: Number(rule.maximumAdvanceDays),
          bufferMinutes: Number(rule.bufferMinutes),
        },
        create: {
          id: 1,
          minimumNoticeMinutes: Number(rule.minimumNoticeMinutes),
          maximumAdvanceDays: Number(rule.maximumAdvanceDays),
          bufferMinutes: Number(rule.bufferMinutes),
        },
      }),
    ]);

    return NextResponse.json(await getAvailabilitySettings());
  } catch (error) {
    console.error("Failed to save availability settings:", error);

    return NextResponse.json(
      {
        error: "Failed to save availability settings",
      },
      {
        status: 500,
      }
    );
  }
}