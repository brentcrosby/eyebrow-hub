import { NextRequest } from "next/server";
import { vi } from "vitest";

/**
 * Creates a mock Next.js Request object for testing API routes.
 *
 * Usage:
 * ```typescript
 * const request = createMockNextRequest("GET", {
 *   searchParams: { date: "2025-03-15", duration: "30" },
 *   cookies: { adminAccessToken: "test-token" }
 * });
 * ```
 */
export function createMockNextRequest(
  method: string = "GET",
  options: {
    cookies?: Record<string, string>;
    searchParams?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  const url = new URL("http://localhost:3000/api/test");

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const request = new NextRequest(url, {
    method,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Add cookies to request if provided
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([key, value]) => {
      request.cookies.set(key, value);
    });
  }

  return request;
}

/**
 * Creates a mock Prisma client with all database tables mocked.
 * Returns vitest mocks that can be configured with .mockResolvedValue(), .mockRejectedValue(), etc.
 *
 * Usage:
 * ```typescript
 * const db = mockDatabaseQueries();
 * db.appointment.findMany.mockResolvedValue([{ id: 1, startTime: new Date() }]);
 *
 * // In your test:
 * // const appointments = await getAppointments(); // Uses mocked db
 * // expect(db.appointment.findMany).toHaveBeenCalledWith(/* ... */);
 * ```
 */
export function mockDatabaseQueries() {
  return {
    businessHour: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    schedulingRule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    availabilityBlock: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stylist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

/**
 * Mock database for use with vi.mock('@/lib/db', { spy: true })
 *
 * Usage in your test file:
 * ```typescript
 * import { vi } from 'vitest';
 *
 * vi.mock('@/lib/db', () => ({
 *   db: mockDatabaseQueries()
 * }));
 *
 * // Now any code that imports db from @/lib/db will use the mock
 * ```
 */
export function createMockSupabase() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };
}

export function timeToMinutes(hour: number, minute: number = 0): number {
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMin = String(min).padStart(2, "0");

  return `${displayHour}:${displayMin} ${period}`;
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

