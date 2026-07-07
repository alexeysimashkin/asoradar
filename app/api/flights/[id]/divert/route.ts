import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const flight = await prisma.flight.update({
    where: { id: params.id },
    data: {
      divertedToAirportId: body.airportId || null,
    },
    include: {
      divertedToAirport: { select: { iataCode: true, name: true, latitude: true, longitude: true } },
    },
  });

  return NextResponse.json(flight);
}
