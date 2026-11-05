import { loadModule } from "./helpers/loadModule.mjs";
import * as salonTime from "../lib/salonTime.ts";
import * as closures from "../lib/bookingClosures.ts";

export const policy = loadModule("lib/availabilitySettings.ts", { mocks: {
  "@/lib/db": { db: {} }, "@/lib/salonTime": salonTime,
} });

// Legacy suites isolate input, lifecycle, timestamps and atomicity, not current
// notice/hours. Preserve those assertions while explicitly isolating policy.
export const legacySchedulingMocks = {
  "@/lib/bookingClosures": closures,
  "@/lib/availabilitySettings": {
    ...policy,
    getAvailabilitySettings: async () => ({ businessHours: [], schedulingRule: { bufferMinutes: 0 } }),
    isWithinSchedulingPolicy: () => true,
  },
};