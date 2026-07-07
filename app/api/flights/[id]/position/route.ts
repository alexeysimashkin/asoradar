import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const since = req.nextUrl.searchParams.get("since");

  if (!since) {
    return new NextResponse("Параметр since обязателен", { status: 400 });
  }

  const positions = await prisma.flightPosition.findMany({
    where: {
      flightId: params.id,
      createdAt: { gt: new Date(since) },
    },
    orderBy: { createdAt: "asc" },
    select: {
      latitude: true,
      longitude: true,
      altitude: true,
      speed: true,
      heading: true,
      createdAt: true,
    },
  });

  return NextResponse.json(positions);
}
