import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Обновить аэропорт
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const airport = await prisma.airport.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(airport);
}

// Удалить аэропорт
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.airport.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
