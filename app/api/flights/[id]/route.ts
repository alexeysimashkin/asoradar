import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Обновить рейс
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // Проверка уникальности (исключая текущий рейс)
  if (body.flightNumber) {
    const existing = await prisma.flight.findFirst({
      where: {
        flightNumber: body.flightNumber,
        id: { not: params.id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Рейс с таким номером уже существует" },
        { status: 400 }
      );
    }
  }

  const flight = await prisma.flight.update({
    where: { id: params.id },
    data: {
      flightNumber: body.flightNumber,
      aircraftTypeId: body.aircraftTypeId,
      departureAirportId: body.departureAirportId,
      arrivalAirportId: body.arrivalAirportId,
      scheduledDeparture: body.scheduledDeparture
        ? new Date(body.scheduledDeparture)
        : undefined,
      scheduledArrival: body.scheduledArrival
        ? new Date(body.scheduledArrival)
        : undefined,
      status: body.status,
    },
  });

  return NextResponse.json(flight);
}

// Удалить рейс
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.flight.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
