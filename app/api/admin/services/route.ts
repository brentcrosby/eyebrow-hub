import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/lib/validations/service";

type ServiceResponse = {
  id: number;
  name: string;
  price: string;
  durationMinutes: number;
  active: boolean;
};

function serializeService(service: {
  id: number;
  name: string;
  price: Prisma.Decimal;
  durationMinutes: number;
  active: boolean;
}): ServiceResponse {
  return {
    id: service.id,
    name: service.name,
    price: service.price.toString(),
    durationMinutes: service.durationMinutes,
    active: service.active,
  };
}

function validationError(error: import("zod").ZodError) {
  return NextResponse.json(
    { success: false, errors: error.flatten().fieldErrors },
    { status: 400 }
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const services = await db.service.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        active: true,
      },
    });

    const payload: ServiceResponse[] = services.map(serializeService);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const service = await db.service.create({
      data: parsed.data,
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        active: true,
      },
    });

    return NextResponse.json(serializeService(service), { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const { id, ...data } = parsed.data;
    const service = await db.service.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        active: true,
      },
    });

    return NextResponse.json(serializeService(service), { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    console.error("Failed to update service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}
