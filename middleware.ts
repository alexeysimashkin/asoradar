import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (req.nextUrl.pathname.startsWith("/admin") && 
      req.nextUrl.pathname !== "/admin/login" && 
      token !== "asoradar-admin-2024") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
