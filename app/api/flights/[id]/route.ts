import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить рейс (по ID или по номеру рейса — определяется автоматически)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const param = params.id;

  // Пробуем найти по ID (если это cuid)
  let flight = await prisma.flight.findUnique({
    where: { id: param },
    include: {
      aircraftType: { select: { modelName: true, sizeCategory: true } },
      departureAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      arrivalAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      positions: {
        orderBy: { createdAt: "asc" },
        select: {
          latitude: true,
          longitude: true,
          altitude: true,
          speed: true,
          heading: true,
          createdAt: true,
        },
      },
    },
  });

  // Если не нашли по ID, пробуем по flightNumber
  if (!flight) {
    flight = await prisma.flight.findUnique({
      where: { flightNumber: param },
      include: {
        aircraftType: { select: { modelName: true, sizeCategory: true } },
        departureAirport: {
          select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
        },
        arrivalAirport: {
          select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
        },
        positions: {
          orderBy: { createdAt: "asc" },
          select: {
            latitude: true,
            longitude: true,
            altitude: true,
            speed: true,
            heading: true,
            createdAt: true,
          },
        },
      },
    });
  }

  if (!flight) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  return NextResponse.json(flight);
}

// Обновить рейс
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // Проверяем, что рейс существует (по ID)
  const existing = await prisma.flight.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  // Проверка уникальности номера рейса
  if (body.flightNumber) {
    const duplicate = await prisma.flight.findFirst({
      where: {
        flightNumber: body.flightNumber,
        id: { not: params.id },
      },
    });

    if (duplicate) {
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
