import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const aircraft = await prisma.aircraftType.findMany({
    orderBy: { modelName: "asc" },
  });
  return NextResponse.json(aircraft);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const aircraft = await prisma.aircraftType.create({
    data: {
      modelName: body.modelName,
      sizeCategory: body.sizeCategory || "medium",
    },
  });
  return NextResponse.json(aircraft, { status: 201 });
}
