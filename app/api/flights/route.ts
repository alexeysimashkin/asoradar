import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить все рейсы (с фильтром)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const flights = await prisma.flight.findMany({
    where: status ? { status } : {},
    include: {
      aircraftType: { select: { modelName: true } },
      departureAirport: { select: { iataCode: true, city: true } },
      arrivalAirport: { select: { iataCode: true, city: true } },
    },
    orderBy: { scheduledDeparture: "desc" },
  });

  return NextResponse.json(flights);
}

// Создать рейс
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Проверка уникальности номера рейса
  const existing = await prisma.flight.findUnique({
    where: { flightNumber: body.flightNumber },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Рейс с таким номером уже существует" },
      { status: 400 }
    );
  }

  const flight = await prisma.flight.create({
    data: {
      flightNumber: body.flightNumber,
      aircraftTypeId: body.aircraftTypeId,
      departureAirportId: body.departureAirportId,
      arrivalAirportId: body.arrivalAirportId,
      scheduledDeparture: new Date(body.scheduledDeparture),
      scheduledArrival: new Date(body.scheduledArrival),
    },
  });

  return NextResponse.json(flight, { status: 201 });
}
