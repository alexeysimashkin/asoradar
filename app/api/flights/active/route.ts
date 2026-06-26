import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const flights = await prisma.flight.findMany({
    where: {
      status: { in: ["active", "scheduled"] },
      positions: { some: {} }, // только рейсы, у которых есть хотя бы одна точка
    },
    include: {
      departureAirport: { select: { iataCode: true, city: true } },
      arrivalAirport: { select: { iataCode: true, city: true } },
      positions: {
        orderBy: { createdAt: "asc" },
        select: { latitude: true, longitude: true, altitude: true, heading: true, speed: true },
      },
    },
  });

  return NextResponse.json(flights);
}
