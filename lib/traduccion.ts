import "server-only";
import { createHash } from "node:crypto";
import { pedirJson, proveedorActivo } from "./llm";
import { sql } from "./db";
import type { Idioma } from "./preferencias";

/**
 * Traducción del contenido que escribe el usuario.
 *
 * Funciona en dos tiempos, y separarlos es el arreglo:
 *
 * - **Al pintar una página** solo se lee la caché. Nunca se llama al modelo.
 *   Antes se traducía en el render, con varias llamadas en paralelo por
 *   página; el plan gratuito de Gemini respondía 429 a la tercera, el
 *   cortacircuitos pausaba toda la app un minuto y lo que no se había
 *   traducido en ese momento se quedaba en español hasta que alguien
 *   recargara justo en el momento bueno. Así quedó un proyecto traducido y
 *   el resto no.
 * - **En segundo plano** un proceso recorre todos los textos traducibles de la
 *   base, detecta los que faltan en la caché y los traduce en lotes pequeños,
 *   de uno en uno, respetando el límite del proveedor. Si algo falla, lo
 *   retoma en la siguiente vuelta en vez de olvidarlo.
 *
 * Un texto nuevo sale en español en la primera visita y en inglés en cuanto
 * pasa el proceso — segundos, no una recarga afortunada.
 */

const LOTE = 20;
const ESPERA_ENTRE_LOTES_MS = 4_500;

function hash(texto: string) {
  return createHash("sha256").update(texto).digest("hex").slice(0, 32);
}

// ------------------------------------------------------------------ lectura

/** Lo que haya en caché para esos textos. No llama al modelo. */
export async function traduccionesGuardadas(
  textos: string[],
  idioma: Idioma,
): Promise<Map<string, string>> {
  const salida = new Map<string, string>();
  if (idioma === "es") return salida;

  const unicos = [...new Set(textos.map((t) => t.trim()).filter(Boolean))];
  if (unicos.length === 0) return salida;

  const porHash = new Map(unicos.map((t) => [hash(t), t]));
  const filas = await sql<{ hash: string; texto: string }>(
    "select hash, texto from traduccion where idioma = $1 and hash = any($2::text[])",
    [idioma, [...porHash.keys()]],
  );
  for (const fila of filas) {
    const original = porHash.get(fila.hash);
    if (original) salida.set(original, fila.texto);
  }

  // Si falta algo, se despierta al proceso de fondo sin esperarlo.
  if (salida.size < unicos.length) avisarPendientes();
  return salida;
}

/** Traduce campos de prosa de una lista de filas, desde la caché. */
export async function traducirFilas<T extends Record<string, unknown>>(
  idioma: Idioma,
  filas: T[],
  campos: (keyof T)[],
): Promise<T[]> {
  if (idioma === "es" || filas.length === 0) return filas;

  const textos: string[] = [];
  for (const fila of filas) {
    for (const campo of campos) {
      const valor = fila[campo];
      if (typeof valor === "string" && valor.trim()) textos.push(valor);
    }
  }

  const mapa = await traduccionesGuardadas(textos, idioma);
  if (mapa.size === 0) return filas;

  return filas.map((fila) => {
    const copia = { ...fila } as T & { __es?: Record<string, string> };
    for (const campo of campos) {
      const valor = fila[campo];
      if (typeof valor === "string") {
        const traducido = mapa.get(valor.trim());
        if (traducido && traducido !== valor) {
          // El original viaja con la fila: los formularios lo leen con
          // `original()` para no guardar nunca la traducción como texto fuente.
          copia.__es = { ...copia.__es, [campo as string]: valor };
          copia[campo] = traducido as T[keyof T];
        }
      }
    }
    return copia;
  });
}

/** Una sola fila (la ficha, la línea base), con la misma regla. */
export async function traducirFila<T extends Record<string, unknown>>(
  idioma: Idioma,
  fila: T | null,
  campos: (keyof T)[],
): Promise<T | null> {
  if (!fila) return fila;
  const [traducida] = await traducirFilas(idioma, [fila], campos);
  return traducida;
}

/** Para colecciones agrupadas por id, como el hilo de cada evento. */
export async function traducirAgrupado<T extends Record<string, unknown>>(
  idioma: Idioma,
  grupos: Record<string, T[]>,
  campos: (keyof T)[],
): Promise<Record<string, T[]>> {
  if (idioma === "es") return grupos;

  const claves = Object.keys(grupos);
  const planas = claves.flatMap((clave) => grupos[clave]);
  if (planas.length === 0) return grupos;

  const traducidas = await traducirFilas(idioma, planas, campos);
  const salida: Record<string, T[]> = {};
  let i = 0;
  for (const clave of claves) {
    salida[clave] = grupos[clave].map(() => traducidas[i++]);
  }
  return salida;
}

// ---------------------------------------------------------- qué se traduce

/**
 * Todos los campos de prosa de la base. Un campo que no esté aquí no se
 * traduce nunca, así que añadir un texto nuevo a la app es añadir su línea.
 *
 * Quedan fuera a propósito los nombres propios (clientes, personas) y los
 * datos técnicos: hosts, IPs, puertos, trunks, modelos, correos.
 */
const FUENTES = [
  "select titulo from evento",
  "select cuerpo from evento",
  "select cuerpo from evento_actualizacion",
  "select titulo from hito",
  "select notas from hito",
  "select motivo from hito_cambio_fecha",
  "select descripcion from compromiso",
  "select descripcion from cliente",
  "select caso_uso from ficha_proyecto",
  "select proceso from ficha_proyecto",
  "select observaciones from ficha_proyecto",
  "select rol from contacto",
  "select notas from contacto",
  "select notas from linea_base",
  "select horario_operativo from linea_base",
  "select notas from metrica_dia",
  "select notas from metrica_mes",
  "select notas from stack_item",
  "select notas from servidor_app",
  "select tipo_comunicacion from servidor_app",
  "select notas from sip_trunk",
  "select notas from integracion_externa",
  "select criticidad from integracion_externa",
];

/** Textos traducibles que todavía no tienen traducción guardada. */
export async function textosPendientes(idioma: Idioma = "en"): Promise<string[]> {
  const union = FUENTES.map((q) => `(${q.replace(/^select (\w+)/, "select $1::text as t")})`).join(
    " union ",
  );
  const filas = await sql<{ t: string }>(
    `select distinct trim(t) as t from (${union}) x where t is not null and trim(t) <> ''`,
  );
  const textos = filas.map((f) => f.t);
  if (textos.length === 0) return [];

  const guardados = new Set(
    (
      await sql<{ hash: string }>(
        "select hash from traduccion where idioma = $1 and hash = any($2::text[])",
        [idioma, textos.map(hash)],
      )
    ).map((f) => f.hash),
  );
  return textos.filter((t) => !guardados.has(hash(t)));
}

// ------------------------------------------------------------ proceso de fondo

async function pedirTraduccion(textos: string[], idioma: Idioma): Promise<string[]> {
  const respuesta = await pedirJson(
    "Traduces notas internas de un product manager de una empresa de agentes de voz. " +
      "Recibes un array JSON de strings y devuelves EXCLUSIVAMENTE un array JSON de strings " +
      "del mismo tamaño y en el mismo orden. Conservas tal cual nombres propios, nombres de " +
      "cliente, siglas técnicas (SIP, STT, TTS, LLM, AHT, SLA, IVR, DID, SBC, VDN, API), " +
      "hosts, IPs, correos, identificadores y cifras. Si un texto ya está en el idioma de " +
      "destino, lo devuelves igual. Sin explicaciones.",
    `Traduce al ${idioma === "en" ? "inglés" : "español"}:\n${JSON.stringify(textos)}`,
  );

  const json = respuesta.slice(respuesta.indexOf("["), respuesta.lastIndexOf("]") + 1);
  const analizado: unknown = JSON.parse(json);
  if (!Array.isArray(analizado) || analizado.some((x) => typeof x !== "string")) {
    throw new Error("El modelo no devolvió un array de strings");
  }
  return analizado as string[];
}

async function guardar(originales: string[], traducidos: string[], idioma: Idioma) {
  await sql(
    `insert into traduccion (hash, idioma, texto_origen, texto)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])
     on conflict (hash, idioma) do nothing`,
    [originales.map(hash), originales.map(() => idioma), originales, traducidos],
  );
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ocupado = false;

/**
 * Traduce todo lo pendiente. Un lote que devuelve un número distinto de
 * textos se reintenta de uno en uno, en vez de descartarse como antes.
 * Un error del proveedor corta la vuelta: el resto espera a la siguiente.
 */
export async function rellenarPendientes(
  idioma: Idioma = "en",
): Promise<{ pendientes: number; traducidos: number; error?: string }> {
  if (proveedorActivo() === "ninguno") return { pendientes: 0, traducidos: 0 };
  if (ocupado) return { pendientes: 0, traducidos: 0 };
  ocupado = true;

  let traducidos = 0;
  let pendientes = 0;
  try {
    const textos = await textosPendientes(idioma);
    pendientes = textos.length;

    for (let i = 0; i < textos.length; i += LOTE) {
      const lote = textos.slice(i, i + LOTE);
      const resultado = await pedirTraduccion(lote, idioma);

      if (resultado.length === lote.length) {
        await guardar(lote, resultado, idioma);
        traducidos += lote.length;
      } else {
        for (const texto of lote) {
          const [uno] = await pedirTraduccion([texto], idioma);
          if (uno) {
            await guardar([texto], [uno], idioma);
            traducidos++;
          }
          await dormir(ESPERA_ENTRE_LOTES_MS);
        }
      }
      if (i + LOTE < textos.length) await dormir(ESPERA_ENTRE_LOTES_MS);
    }
    return { pendientes, traducidos };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`[traducción] vuelta cortada tras ${traducidos}/${pendientes}:`, mensaje);
    return { pendientes, traducidos, error: mensaje };
  } finally {
    ocupado = false;
  }
}

let avisoProgramado: ReturnType<typeof setTimeout> | null = null;

/** Despierta al proceso pronto, agrupando los avisos de una misma página. */
export function avisarPendientes() {
  if (avisoProgramado || proveedorActivo() === "ninguno") return;
  avisoProgramado = setTimeout(() => {
    avisoProgramado = null;
    void rellenarPendientes();
  }, 1_500);
}

let arrancado = false;

/** Una vuelta al arrancar y otra cada minuto. Idempotente. */
export function arrancarTraductor() {
  if (arrancado) return;
  arrancado = true;
  setInterval(() => void rellenarPendientes(), 60_000);
  setTimeout(() => void rellenarPendientes(), 5_000);
}
