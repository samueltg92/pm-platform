import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { obtenerPool } from "@/lib/db";

const PUBLICAS = ["/login", "/api/slack", "/invitacion", "/olvide", "/restablecer"];

/**
 * Lo único que puede ver el rol "contactos": la agenda y su perfil (para
 * cambiar la contraseña). Todo lo demás de la app está fuera de su alcance.
 */
const RUTAS_CONTACTOS = ["/contactos", "/perfil"];

function alLogin(request: NextRequest, pathname: string) {
  const destino = new URL("/login", request.url);
  if (pathname !== "/") destino.searchParams.set("volver", pathname);
  return NextResponse.redirect(destino);
}

/**
 * Autenticación y límites de rol en cada petición.
 *
 * Esto corre en Node (así lo fija Next 16 para `proxy`), así que puede
 * consultar el usuario real en la base. No basta con el layout: al navegar
 * dentro de la app, Next pide la página nueva sin volver a ejecutar el layout,
 * y un control que solo viviera allí se saltaría. Tampoco basta con el rol que
 * lleva el token: si a alguien se le cambia el rol, su token viejo seguiría
 * diciendo el anterior hasta caducar.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("pm_sesion")?.value;
  if (!token) return alLogin(request, pathname);

  let id: string;
  let emitido: number;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET ?? ""),
    );
    id = String(payload.id);
    emitido = Number(payload.iat ?? 0);
  } catch {
    return alLogin(request, pathname);
  }

  const { rows } = await obtenerPool().query<{
    rol: string;
    activo: boolean;
    sesiones_desde: Date | null;
  }>("select rol, activo, sesiones_desde from usuario where id = $1", [id]);
  const usuario = rows[0];

  // Cuenta desactivada, borrada, o sesión anterior a un cambio de contraseña.
  if (
    !usuario ||
    !usuario.activo ||
    (usuario.sesiones_desde && emitido < Math.floor(usuario.sesiones_desde.getTime() / 1000))
  ) {
    return alLogin(request, pathname);
  }

  if (usuario.rol === "contactos") {
    const permitida = RUTAS_CONTACTOS.some(
      (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
    );
    if (!permitida) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/contactos", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
