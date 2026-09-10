import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLICAS = ["/login", "/api/slack", "/invitacion", "/olvide", "/restablecer"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("pm_sesion")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET ?? ""));
      return NextResponse.next();
    } catch {
      // token inválido o caducado: cae al redirect
    }
  }

  const destino = new URL("/login", request.url);
  if (pathname !== "/") destino.searchParams.set("volver", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
