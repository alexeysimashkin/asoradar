import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const flight = await prisma.flight.findUnique({
    where: { id: params.id },
    include: {
      aircraftType: { select: { modelName: true, sizeCategory: true } },
      departureAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      arrivalAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      divertedToAirport: {
        select: { iataCode: true, name: true, latitude: true, longitude: true },
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

  if (!flight) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  return NextResponse.json(flight);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

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
      actualDeparture: body.actualDeparture ? new Date(body.actualDeparture) : body.actualDeparture === null ? null : undefined,
      actualArrival: body.actualArrival ? new Date(body.actualArrival) : body.actualArrival === null ? null : undefined,
      status: body.status !== undefined ? body.status : undefined,
      isEmergency: body.isEmergency !== undefined ? body.isEmergency : undefined,
    },
  });

  return NextResponse.json(flight);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.flight.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
