import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Получить полные данные рейса для админа (без позиций)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const flight = await prisma.flight.findUnique({
    where: { id: params.id },
  });

  if (!flight) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  return NextResponse.json(flight);
}
