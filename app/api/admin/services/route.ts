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

export async function DELETE(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const id = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "A valid service id is required" },
      { status: 400 }
    );
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const service = await tx.service.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            active: true,
            _count: { select: { appointments: true } },
          },
        });

        if (!service) return null;

        if (service._count.appointments > 0) {
          const deactivated = await tx.service.update({
            where: { id },
            data: { active: false },
            select: {
              id: true,
              name: true,
              price: true,
              durationMinutes: true,
              active: true,
            },
          });

          return {
            action: "deactivated" as const,
            service: serializeService(deactivated),
          };
        }

        const deleted = await tx.service.delete({
          where: { id },
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true,
            active: true,
          },
        });

        return {
          action: "deleted" as const,
          service: serializeService(deleted),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!result) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to delete or deactivate service:", error);
    return NextResponse.json(
      { error: "Failed to delete or deactivate service" },
      { status: 500 }
    );
  }
}
