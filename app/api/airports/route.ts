import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить все аэропорты
export async function GET() {
  const airports = await prisma.airport.findMany({
    orderBy: { city: "asc" },
  });
  return NextResponse.json(airports);
}

// Создать аэропорт (только админ, проверка позже)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const airport = await prisma.airport.create({
    data: {
      icaoCode: body.icaoCode,
      iataCode: body.iataCode,
      name: body.name,
      city: body.city,
      country: body.country,
      latitude: body.latitude,
      longitude: body.longitude,
    },
  });
  return NextResponse.json(airport, { status: 201 });
}
