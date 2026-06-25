import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Обновить рейс
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // Проверка уникальности номера рейса (исключая текущий)
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
      flightNumber: body.flightNumber !== undefined ? body.flightNumber : undefined,
      aircraftTypeId: body.aircraftTypeId !== undefined ? body.aircraftTypeId : undefined,
      departureAirportId: body.departureAirportId !== undefined ? body.departureAirportId : undefined,
      arrivalAirportId: body.arrivalAirportId !== undefined ? body.arrivalAirportId : undefined,
      scheduledDeparture: body.scheduledDeparture ? new Date(body.scheduledDeparture) : undefined,
      scheduledArrival: body.scheduledArrival ? new Date(body.scheduledArrival) : undefined,
      status: body.status !== undefined ? body.status : undefined,
      isEmergency: body.isEmergency !== undefined ? body.isEmergency : undefined,
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
