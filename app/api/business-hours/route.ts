import { NextResponse } from "next/server";
import { getBusinessHoursList } from "@/lib/businessHours";

// Returns the full week so callers fetch once and pick the day they need,
// rather than refetching every time the selected date changes.
export async function GET() {
  return NextResponse.json(getBusinessHoursList(), { status: 200 });
}
