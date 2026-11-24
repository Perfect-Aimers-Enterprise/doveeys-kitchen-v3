import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN = /^\/admin\/(login|register|forgot-password|reset-password)$/;

// Fast edge gate: no session cookie means go to login and come back to the same page.
// Real session validation happens server-side in the protected layout and every API handler.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const target = pathname + search;
  if (!PUBLIC_ADMIN.test(pathname) && !req.cookies.has("dk_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url);
  }
  // Expose the requested path to server layouts so they can build an accurate return-to link.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", target);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/admin/:path*"] };
