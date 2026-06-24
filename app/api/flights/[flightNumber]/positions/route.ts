import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Long polling: получить новые позиции после указанного времени
export async function GET(
  req: NextRequest,
  { params }: { params: { flightNumber: string } }
) {
  const since = req.nextUrl.searchParams.get("since");

  if (!since) {
    return new NextResponse("Параметр since обязателен", { status: 400 });
  }

  const positions = await prisma.flightPosition.findMany({
    where: {
      flight: { flightNumber: params.flightNumber },
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
