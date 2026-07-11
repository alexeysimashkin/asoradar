import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await prisma.flightPosition.deleteMany({});
  await prisma.flightRoute.deleteMany({});
  await prisma.routePoint.deleteMany({});
  await prisma.flight.deleteMany({});
  return NextResponse.json({ ok: true, message: "Все рейсы удалены" });
}
