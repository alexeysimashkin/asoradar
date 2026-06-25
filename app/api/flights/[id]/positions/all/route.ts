import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить ВСЕ позиции рейса (для админа и страницы рейса)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const positions = await prisma.flightPosition.findMany({
    where: { flightId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(positions);
}
