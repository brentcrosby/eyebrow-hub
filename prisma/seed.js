// prisma/seed.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const services = [
    { name: "Brow Consult",          price: 0,    durationMinutes: 15, active: true },
    { name: "Eyebrow",               price: 15,   durationMinutes: 15, active: true },
    { name: "Eyebrow/Lip",           price: 15,   durationMinutes: 15, active: true },
    { name: "Chin/Lip",              price: 12,   durationMinutes: 15, active: true },
    { name: "Cheeks",                price: 7,    durationMinutes: 15, active: true },
    { name: "Forehead",              price: 7,    durationMinutes: 15, active: true },
    { name: "Full Face",             price: 30,   durationMinutes: 15, active: true },
    { name: "Half Face",             price: 25,   durationMinutes: 15, active: true },
    { name: "Lip",                   price: 6,    durationMinutes: 15, active: true },
    { name: "Unibrow",               price: 5,    durationMinutes: 15, active: true },
    { name: "Men's Eyebrow/Cheeks",  price: 17,   durationMinutes: 15, active: true },
    { name: "Sideburns",             price: 10,   durationMinutes: 15, active: true },
    { name: "Eyebrows/Forehead",     price: 15,   durationMinutes: 15, active: true },
    { name: "Eyebrows/Lip/Chin",     price: 22,   durationMinutes: 15, active: true },
  ];

  const canonicalNames = services.map(s => s.name);

  await prisma.service.deleteMany({
    where: { name: { notIn: canonicalNames } }
  });

  const existing = await prisma.service.findMany({
    where: { name: { in: canonicalNames } },
    select: { name: true }
  });

  const existingNames = new Set(existing.map(s => s.name));
  const toCreate = services.filter(s => !existingNames.has(s.name));

  if (toCreate.length > 0) {
    await prisma.service.createMany({ data: toCreate });
  }

  const stylists = [
    { name: "Ava Nguyen",     active: true },
    { name: "Maya Patel",     active: true },
    { name: "Sofia Ramirez",  active: true },
    { name: "Jasmine Lee",    active: true },
  ];

  const existingStylists = await prisma.stylist.findMany({
    where: { name: { in: stylists.map(s => s.name) } },
    select: { name: true }
  });

  const existingStylistNames = new Set(existingStylists.map(s => s.name));
  const stylistsToCreate = stylists.filter(s => !existingStylistNames.has(s.name));

  if (stylistsToCreate.length > 0) {
    await prisma.stylist.createMany({ data: stylistsToCreate });
  }

  await seedScheduleDemoData();
}

// Demo appointments and blocked time for the admin schedule.
//
// Without these the schedule has nothing to render, which is why the page
// previously shipped with mock fixtures. Rows are anchored to today so the
// schedule is populated whenever the seed runs, and are tagged in `notes` so
// re-running replaces them instead of accumulating duplicates.
//
// Times sit inside 11:00-18:00, the narrowest day in the business-hours table
// (Sunday), so every row lands within opening hours whichever day you seed on.
// The 9:00 row is the deliberate exception: it is before opening on every day,
// which is what exercises the grid's clamping.
const DEMO_MARKER = "seed:demo";

async function seedScheduleDemoData() {
  await prisma.appointment.deleteMany({ where: { notes: DEMO_MARKER } });

  // AvailabilityBlock has no notes column to tag, and one demo block
  // deliberately has a null reason so that render path is covered — which a
  // reason-prefix match alone would never clean up, so re-seeding would pile up
  // duplicates. Scope the delete to the demo window instead. Anything outside
  // these few days, and anything carrying a real reason, is left alone.
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 2);
  windowStart.setHours(0, 0, 0, 0);

  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 3);
  windowEnd.setHours(0, 0, 0, 0);

  await prisma.availabilityBlock.deleteMany({
    where: {
      startTime: { gte: windowStart, lt: windowEnd },
      OR: [{ reason: { startsWith: "[demo]" } }, { reason: null }],
    },
  });

  const services = await prisma.service.findMany();
  const byName = (name) => services.find((service) => service.name === name);

  const stylists = await prisma.stylist.findMany();
  const byStylistName = (name) => stylists.find((stylist) => stylist.name === name);

  const at = (dayOffset, hour, minute) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  const appointments = [
    // A short booking: proves 15 minutes still renders legibly.
    { day: 0, from: [11, 0], to: [11, 15], service: "Eyebrow", status: "confirmed", customer: "Ava Chen", stylist: "Ava Nguyen", source: "online" },
    // An overlapping pair: proves overlaps stay readable side by side.
    { day: 0, from: [12, 0], to: [13, 0], service: "Full Face", status: "confirmed", customer: "Priya Raman", stylist: "Maya Patel", source: "online" },
    { day: 0, from: [12, 30], to: [13, 30], service: "Half Face", status: "pending", customer: "Dana Brooks", stylist: "Sofia Ramirez", source: "online" },
    { day: 0, from: [14, 0], to: [14, 30], service: "Eyebrows/Lip/Chin", status: "confirmed", customer: "Sam Ortiz", stylist: "Jasmine Lee", source: "online" },
    // Cancelled: must never appear on the schedule.
    { day: 0, from: [15, 0], to: [15, 15], service: "Lip", status: "cancelled", customer: "Cancelled Booking", stylist: null, source: "online" },
    // Starts before opening on every weekday: proves the grid clamps it.
    { day: 0, from: [9, 0], to: [11, 30], service: "Brow Consult", status: "confirmed", customer: "Early Arrival", stylist: null, source: "online" },
    // Neighbouring days, so prev/next navigation has something to show.
    // Also a phone/walk-in pair, proving `source` distinguishes staff-entered
    // bookings from the customer flow without a stylist relation being required.
    { day: 1, from: [11, 30], to: [12, 0], service: "Eyebrow", status: "pending", customer: "Jordan Lee", stylist: "Ava Nguyen", source: "manual" },
    { day: 1, from: [13, 0], to: [13, 15], service: "Unibrow", status: "confirmed", customer: "Casey Nolan", stylist: null, source: "manual" },
    { day: -1, from: [16, 0], to: [16, 30], service: "Sideburns", status: "confirmed", customer: "Riley Park", stylist: "Maya Patel", source: "online" },
  ];

  for (const item of appointments) {
    const service = byName(item.service);
    if (!service) continue;

    const stylist = item.stylist ? byStylistName(item.stylist) : null;

    await prisma.appointment.create({
      data: {
        serviceId: service.id,
        stylistId: stylist ? stylist.id : null,
        startTime: at(item.day, item.from[0], item.from[1]),
        endTime: at(item.day, item.to[0], item.to[1]),
        status: item.status,
        source: item.source,
        customerName: item.customer,
        customerPhone: "(555) 010-0100",
        customerEmail: null,
        notes: DEMO_MARKER,
      },
    });
  }

  await prisma.availabilityBlock.createMany({
    data: [
      // With a reason, and without one, so both render paths are covered.
      { startTime: at(0, 16, 0), endTime: at(0, 17, 0), reason: "[demo] Staff meeting" },
      { startTime: at(0, 17, 30), endTime: at(0, 18, 0), reason: null },
      { startTime: at(1, 15, 0), endTime: at(1, 15, 30), reason: "[demo] Supply delivery" },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
