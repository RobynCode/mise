import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/uploads");

  const token = req.cookies.get("mise_session")?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-do-not-use-in-prod"),
      );
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (!authed && !isPublic) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authed && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)).*)"],
};
