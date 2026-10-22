import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";

const booking = {
  id: 7,
  bookingReference: "0123456789ABCDEF",
  customerName: "Fixture, Customer;\r\nInjected: value\\end",
  customerEmail: "fixture@example.invalid",
  customerPhone: "5305550100",
  services: [
    {
      id: 1,
      name: "Brow, shape;\rExtra\\service",
      price: 25,
      durationMinutes: 30,
    },
    { id: 2, name: "Lip", price: 25, durationMinutes: 30 },
  ],
  stylistName: "Fixture; Stylist",
  date: "2026-10-20",
  time: "10:00 AM",
  // Known UTC instants for this fixture; this test does not validate the API's
  // conversion from a selected Pacific wall time.
  startTime: "2026-10-20T17:00:00.000Z",
  endTime: "2026-10-20T18:00:00.000Z",
  totalPrice: 50,
};

function confirmationFixture(confirmation = booking) {
  let stateIndex = 0;
  let downloaded;
  const anchor = { click() {}, href: "", download: "" };
  const document = {
    createElement: () => anchor,
    body: { appendChild() {}, removeChild() {} },
  };
  const url = {
    createObjectURL(blob) {
      downloaded = blob;
      return "blob:fixture";
    },
    revokeObjectURL() {},
  };
  const { default: BookingContainer } = loadModule(
    "components/BookingContainer.tsx",
    {
      mocks: {
        react: {
          ...React,
          useState(initial) {
            const index = stateIndex++;
            return [
              index === 0
                ? "confirmation"
                : index === 16
                  ? confirmation
                  : initial,
              () => {},
            ];
          },
          useRef: (initial) => ({ current: initial }),
          useEffect() {},
        },
        "react/jsx-runtime": jsxRuntime,
        "next/link": { default: (props) => React.createElement("a", props) },
        "./Dropdown": {},
        "./BookingForm": { default: () => null },
        "@/lib/validations/booking": {
          BOOKING_LIMITS: { services: 4 },
          bookingSelectionSchema: {},
        },
        "@/lib/dateUtils": { toDateParam: () => "2026-10-20" },
      },
      globals: { document, Blob, URL: url },
    }
  );
  return {
    tree: BookingContainer(),
    download: () => downloaded,
    anchor,
  };
}

function downloadCalendar(fixture) {
  const button = React.Children.toArray(fixture.tree.props.children).find(
    (child) =>
      child.type === "button" && child.props.children === "Add to Calendar"
  );
  assert.ok(button);
  button.props.onClick();
  return fixture.download();
}

test("confirmation explains pending approval, reference, Manage Booking and actual cancellation policy", () => {
  const html = renderToStaticMarkup(confirmationFixture().tree);
  assert.match(html, /requested and is pending approval/);
  assert.match(html, /save your confirmation number and booking phone number/);
  assert.match(html, /Confirmation number:\s*<\/span>\s*0123456789ABCDEF/);
  assert.match(html, /href="\/manage-booking"[^>]*>Manage Booking<\/a>/);
  assert.match(html, /first service starts more than 4 hours from now/);
  assert.doesNotMatch(html, /confirmation soon|SMS|reschedul/i);
});

test("calendar download preserves API instants and escapes dynamic text without adding event lines", async () => {
  const fixture = confirmationFixture();
  const content = await downloadCalendar(fixture).text();
  const unfolded = content.replace(/\r\n[ \t]/g, "");
  assert.equal(fixture.anchor.download, "eyebrow-hub-appointment.ics");
  assert.match(
    unfolded,
    /DTSTART:20261020T170000Z\r\nDTEND:20261020T180000Z\r\n/
  );
  assert.match(
    unfolded,
    /DESCRIPTION:Services: Brow\\, shape\\;\\nExtra\\\\service\\, Lip\\nStylist: Fixture\\; Stylist\\nCustomer: Fixture\\, Customer\\;\\nInjected: value\\\\end\r\nEND:VEVENT/
  );
  assert.equal(unfolded.match(/\r\nDESCRIPTION:/g)?.length, 1);
  assert.doesNotMatch(unfolded, /\r\nInjected:/);
});

test("long multibyte calendar text folds within 75 UTF-8 octets and unfolds to one escaped description", async () => {
  const longService = "é🌿".repeat(32);
  const longCustomer = "顾客😀".repeat(32);
  const fixture = confirmationFixture({
    ...booking,
    customerName: `${longCustomer}\r\nX-INJECTED: bad,\\end`,
    services: [
      { ...booking.services[0], name: `${longService};brow\nX-SERVICE: bad` },
      booking.services[1],
    ],
  });
  const content = await downloadCalendar(fixture).text();
  const physicalLines = content.split("\r\n");
  assert.ok(content.endsWith("END:VCALENDAR\r\n"));
  assert.ok(physicalLines.some((line) => line.startsWith(" ")));
  for (const line of physicalLines) {
    assert.ok(
      Buffer.byteLength(line, "utf8") <= 75,
      `line exceeds 75 octets: ${line}`
    );
  }
  // Reject split UTF-8 sequences even when decoding each physical line.
  const rawLines = Buffer.from(content, "utf8")
    .toString("latin1")
    .split("\r\n");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const rawLine of rawLines) {
    assert.doesNotThrow(() =>
      decoder.decode(
        Uint8Array.from(rawLine, (character) => character.charCodeAt(0))
      )
    );
  }

  const unfolded = content.replace(/\r\n[ \t]/g, "");
  assert.match(content, /\r\n /, "the long property is physically folded");
  assert.ok(
    unfolded.includes(
      `DESCRIPTION:Services: ${longService}\\;brow\\nX-SERVICE: bad\\, Lip\\nStylist: Fixture\\; Stylist\\nCustomer: ${longCustomer}\\nX-INJECTED: bad\\,\\\\end\r\nEND:VEVENT`
    )
  );
  const lines = unfolded.split("\r\n");
  const eventLines = lines.slice(
    lines.indexOf("BEGIN:VEVENT") + 1,
    lines.indexOf("END:VEVENT")
  );
  assert.deepEqual(
    eventLines.map((line) => line.split(":", 1)[0]),
    ["UID", "DTSTAMP", "DTSTART", "DTEND", "SUMMARY", "DESCRIPTION"]
  );
  assert.doesNotMatch(unfolded, /\r\nX-INJECTED:/);
  assert.doesNotMatch(unfolded, /\r\nX-SERVICE:/);
});

test("booking form does not offer unsupported rescheduling", () => {
  const { BOOKING_LIMITS, bookingContactSchemas } = loadModule(
    "lib/validations/booking.ts",
    {
      mocks: { zod: { z } },
    }
  );
  const { default: BookingForm } = loadModule("components/BookingForm.tsx", {
    mocks: {
      react: {
        ...React,
        useState: (initial) => [initial, () => {}],
        useRef: () => ({ current: false }),
      },
      "react/jsx-runtime": jsxRuntime,
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingContactSchemas },
      "@/lib/bookingRetry": { bookingRetryMessage: () => "Retry later" },
    },
  });
  const html = renderToStaticMarkup(
    React.createElement(BookingForm, {
      selection: null,
      services: [],
      stylists: [],
      onBook() {},
      onBack() {},
      onTimeConflict() {},
      contact: { name: "", email: "", phone: "", notes: "" },
      onContactChange() {},
      touched: { name: false, email: false, phone: false, notes: false },
      onTouchedChange() {},
      selectionReady: false,
    })
  );
  assert.match(html, /first service starts more than 4 hours from now/);
  assert.doesNotMatch(html, /reschedul/i);
});
