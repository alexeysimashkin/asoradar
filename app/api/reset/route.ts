import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await prisma.flightPosition.deleteMany({});
  await prisma.flight.deleteMany({});
  return NextResponse.json({ ok: true });
}
