import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const flights = await prisma.flight.findMany({
    where: { status: "active" },
    include: {
      departureAirport: { select: { iataCode: true, city: true } },
      arrivalAirport: { select: { iataCode: true, city: true } },
      positions: {
        orderBy: { createdAt: "asc" },
        select: { latitude: true, longitude: true, altitude: true, heading: true },
      },
    },
  });
  return NextResponse.json(flights);
}
