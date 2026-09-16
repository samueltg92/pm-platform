import { Pool, types, type QueryResultRow } from "pg";

/**
 * Las columnas `date` se devuelven como texto 'YYYY-MM-DD', no como Date.
 *
 * Por defecto pg construye un Date a medianoche de la zona del proceso. En el
 * contenedor esa zona es UTC, así que el 7 de septiembre llegaba como
 * 2026-09-07T00:00:00Z y al formatearlo en America/Bogota retrocedía cinco
 * horas: se mostraba el 6. Una fecha sin hora no es un instante y no debe
 * pasar por una zona horaria.
 */
types.setTypeParser(types.builtins.DATE, (valor) => valor);

declare global {
  // eslint-disable-next-line no-var
  var __pmPool: Pool | undefined;
}

function crearPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL");
  }
  return new Pool({
    connectionString,
    // Easypanel expone Postgres por red interna sin TLS; en gestionados sí hace falta.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

/**
 * Perezoso a propósito: durante `next build` se cargan los módulos de las
 * páginas sin que exista DATABASE_URL, y crear el pool ahí rompería el build.
 */
export function obtenerPool(): Pool {
  if (!globalThis.__pmPool) globalThis.__pmPool = crearPool();
  return globalThis.__pmPool;
}

const ESCRITURA = /\b(insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i;

/**
 * El usuario de la petición en curso, leído de la cookie de sesión.
 *
 * Solo se usa para decirle a la base quién escribe: los triggers de autoría
 * (migración 014) lo guardan en `creado_por` y `editado_por`. Los permisos
 * no dependen de esto —los comprueban las acciones—, así que basta con que el
 * token sea auténtico. Fuera de una petición (Slack, procesos de fondo,
 * scripts) no hay cookie y la escritura queda sin autor, que es la verdad.
 */
async function usuarioEnCurso(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get("pm_sesion")?.value;
    if (!token) return null;
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET ?? ""),
    );
    return typeof payload.id === "string" ? payload.id : null;
  } catch {
    return null;
  }
}

async function marcarUsuario(ejecutar: (texto: string, params: unknown[]) => Promise<unknown>) {
  const usuario = await usuarioEnCurso();
  if (usuario) await ejecutar("select set_config('app.usuario', $1, true)", [usuario]);
}

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  // Las lecturas van directas. Las escrituras van en una transacción corta
  // para que `set_config(..., true)` quede ligado a ellas y no a la conexión,
  // que el pool reutiliza para otras peticiones.
  if (!ESCRITURA.test(text)) {
    return (await obtenerPool().query<T>(text, params)).rows;
  }
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("begin");
    await marcarUsuario((t, p) => cliente.query(t, p));
    const res = await cliente.query<T>(text, params);
    await cliente.query("commit");
    return res.rows;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function uno<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const filas = await sql<T>(text, params);
  return filas[0] ?? null;
}

/** Ejecuta varias sentencias dentro de una transacción. */
export async function enTransaccion<T>(fn: (q: typeof sql) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("begin");
    await marcarUsuario((t, p) => cliente.query(t, p));
    const consultar = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params: unknown[] = [],
    ) => (await cliente.query<R>(text, params)).rows;
    const resultado = await fn(consultar as typeof sql);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}
