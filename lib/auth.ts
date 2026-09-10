import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { uno } from "./db";
import { puedeEditar, puedeAdministrar, type Rol } from "./roles";

const COOKIE = "pm_sesion";
const DURACION_DIAS = 30;

function clave() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("SESSION_SECRET debe existir y tener al menos 32 caracteres");
  }
  return new TextEncoder().encode(secreto);
}

export type Sesion = { id: string; email: string; nombre: string; rol: Rol };

export async function verificarCredenciales(
  email: string,
  password: string,
): Promise<Sesion | null> {
  const usuario = await uno<{
    id: string;
    email: string;
    nombre: string;
    password_hash: string;
    rol: Rol;
    activo: boolean;
  }>(
    "select id, email, nombre, password_hash, rol, activo from usuario where email = $1",
    [email.trim().toLowerCase()],
  );

  if (!usuario) {
    // Coste constante para no filtrar qué emails existen.
    await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
    return null;
  }

  const correcta = await bcrypt.compare(password, usuario.password_hash);
  if (!correcta || !usuario.activo) return null;

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

export async function crearSesion(sesion: Sesion) {
  const token = await new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(clave());

  const tarro = await cookies();
  tarro.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_DIAS * 24 * 60 * 60,
  });
}

export async function cerrarSesion() {
  const tarro = await cookies();
  tarro.delete(COOKIE);
}

export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const tarro = await cookies();
  const token = tarro.get(COOKIE)?.value;
  if (!token) return null;

  let id: string;
  let emitido: number;
  try {
    const { payload } = await jwtVerify(token, clave());
    id = String(payload.id);
    emitido = Number(payload.iat ?? 0);
  } catch {
    return null;
  }

  // El rol y el alta se consultan en cada petición en vez de confiar en el
  // token: quitarle permisos a alguien debe notarse al momento, no cuando
  // caduque su sesión dentro de treinta días. `cache` evita repetir la
  // consulta dentro de un mismo render.
  const usuario = await uno<{
    id: string;
    email: string;
    nombre: string;
    rol: Rol;
    activo: boolean;
    sesiones_desde: Date | null;
  }>(
    "select id, email, nombre, rol, activo, sesiones_desde from usuario where id = $1",
    [id],
  );

  if (!usuario || !usuario.activo) return null;

  // Restablecer la contraseña sella la fecha y tumba las sesiones anteriores.
  //
  // `iat` va en segundos enteros, así que la marca se trunca al segundo antes
  // de comparar. Sin truncar, un reset a las 10.500s invalidaría el token que
  // él mismo acaba de emitir (iat 10) y dejaría fuera a quien acaba de entrar.
  if (usuario.sesiones_desde) {
    const desde = Math.floor(usuario.sesiones_desde.getTime() / 1000);
    if (emitido < desde) return null;
  }

  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
});

/** Para las acciones de escritura. Lanza si quien llama no tiene permiso. */
export async function exigirEditor(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) throw new Error("Sesión no válida");
  if (!puedeEditar(sesion.rol)) {
    throw new Error("Tu rol es de solo lectura: no puedes modificar nada.");
  }
  return sesion;
}

/** Para invitar, borrar clientes y tocar configuración. */
export async function exigirAdmin(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) throw new Error("Sesión no válida");
  if (!puedeAdministrar(sesion.rol)) {
    throw new Error("Solo un administrador puede hacer esto.");
  }
  return sesion;
}
