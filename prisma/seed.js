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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
