import { test, expect } from "@playwright/test";
import { clearBucket, localFixture } from "./dt524-local-helpers.mjs";

test("manage-booking page displays the real 429 retry time", async ({
  page,
}) => {
  const { db, callerKey, baseURL } = localFixture();
  try {
    await clearBucket(db, "lookup", callerKey);
    for (let i = 0; i < 30; i++) {
      const response = await page.request.post(
        `${baseURL}/api/bookings/lookup`,
        { data: {} }
      );
      expect(response.status()).toBe(404);
    }
    await page.goto(`${baseURL}/manage-booking`);
    await page.getByLabel("Confirmation number").fill("ABCDEF0123456789");
    await page.getByLabel("Booking phone number").fill("5305551234");
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/bookings/lookup") &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Find booking" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(429);
    const retry = Number(response.headers()["retry-after"]);
    expect(retry).toBeGreaterThan(0);
    const minutes = Math.ceil(retry / 60);
    await expect(page.locator("main p[role='alert']")).toHaveText(
      `Too many requests. Please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
    );
  } finally {
    await clearBucket(db, "lookup", callerKey);
    await db.$disconnect();
  }
});
