// prisma/seed.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create a PostgreSQL connection pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
// Create a Prisma adapter using the PostgreSQL connection pool
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Define the services to be seeded
  const services = [
    { name: "Waxing service", price: 45.0, durationMinutes: 30, active: true },
    { name: "Manicure", price: 110.0, durationMinutes: 50, active: true },
    { name: "Follow-up", price: 40.0, durationMinutes: 45, active: true },
    { name: "Nail extensions", price: 20.0, durationMinutes: 30, active: true },
    { name: "Facial Treatment", price: 90.0, durationMinutes: 50, active: true },
    { name: "Hair Styling", price: 75.0, durationMinutes: 45, active: true },
    { name: "Pedicure", price: 65.0, durationMinutes: 40, active: true }
  ];

  // Prevent duplicates by checking existing names
  const existing = await prisma.service.findMany({
    where: { name: { in: services.map(s => s.name) } },
    select: { name: true }
  });

  const existingServices = new Set(existing.map(s => s.name));
  const Create  = services.filter(s => !existingServices.has(s.name));

  if (Create.length > 0) {
    await prisma.service.createMany({ data: toCreate });
  }
}
// Execute the main function and handle any errors if needed
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
