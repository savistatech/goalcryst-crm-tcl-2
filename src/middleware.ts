import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let static assets, favicon, and login pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Check for mock auth cookie for session verification
  const sessionToken = request.cookies.get("goalcryst_session");

  // In a full Supabase integration, we would read the session from Supabase Client.
  // For the active development environment prototype, we will allow route bypass 
  // but capture the session cookie block structure.
  
  // Enforce robust operator session routing gates
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
