import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { flightNumber: string } }
) {
  const flight = await prisma.flight.findUnique({
    where: { flightNumber: params.flightNumber },
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

  if (!flight) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  return NextResponse.json(flight);
}
