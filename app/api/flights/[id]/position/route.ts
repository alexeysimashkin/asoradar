import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const position = await prisma.flightPosition.create({
      data: {
        flightId: params.id,
        latitude: body.latitude,
        longitude: body.longitude,
        altitude: body.altitude || 0,
        speed: body.speed || 0,
        heading: body.heading || 0,
      },
    });

    await prisma.flight.update({
      where: { id: params.id },
      data: { status: "active" },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error: any) {
    console.error("POSITION ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
