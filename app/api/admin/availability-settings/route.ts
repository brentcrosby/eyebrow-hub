import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";
import { availabilitySettingsSchema } from "@/lib/validations/availabilitySettings";

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json(
      await getAvailabilitySettings()
    );
  } catch (error) {
    console.error(
      "Failed to load availability settings:",
      error
    );

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
    const body: unknown = await request.json();

    const validation =
      availabilitySettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Invalid availability settings",
        },
        {
          status: 400,
        }
      );
    }

    const { businessHours, schedulingRule } =
      validation.data;

    await db.$transaction([
      ...businessHours.map((hours) =>
        db.businessHour.upsert({
          where: {
            dayOfWeek: hours.dayOfWeek,
          },
          update: {
            enabled: hours.enabled,
            openMinutes: hours.openMinutes,
            closeMinutes: hours.closeMinutes,
          },
          create: {
            dayOfWeek: hours.dayOfWeek,
            enabled: hours.enabled,
            openMinutes: hours.openMinutes,
            closeMinutes: hours.closeMinutes,
          },
        })
      ),
      db.schedulingRule.upsert({
        where: {
          id: 1,
        },
        update: {
          minimumNoticeMinutes:
            schedulingRule.minimumNoticeMinutes,
          maximumAdvanceDays:
            schedulingRule.maximumAdvanceDays,
          bufferMinutes:
            schedulingRule.bufferMinutes,
        },
        create: {
          id: 1,
          minimumNoticeMinutes:
            schedulingRule.minimumNoticeMinutes,
          maximumAdvanceDays:
            schedulingRule.maximumAdvanceDays,
          bufferMinutes:
            schedulingRule.bufferMinutes,
        },
      }),
    ]);

    return NextResponse.json(
      await getAvailabilitySettings()
    );
  } catch (error) {
    console.error(
      "Failed to save availability settings:",
      error
    );

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