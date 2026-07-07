import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const flight = await prisma.flight.findUnique({
    where: { id: params.id },
    include: {
      departureAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      arrivalAirport: {
        select: { name: true, iataCode: true, city: true, latitude: true, longitude: true },
      },
      divertedToAirport: {
        select: { iataCode: true, name: true, latitude: true, longitude: true },
      },
    },
  });

  if (!flight) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  return NextResponse.json(flight);
}
