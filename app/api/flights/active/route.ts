import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Временно возвращаем ВСЕ рейсы, чтобы найти проблему
  const flights = await prisma.flight.findMany({
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
