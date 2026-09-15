export const ZONA = process.env.TZ_APP ?? "America/Bogota";

/** Fecha de hoy en la zona horaria de la app, como 'YYYY-MM-DD'. */
export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Convierte lo que devuelve pg (Date o string) a 'YYYY-MM-DD'. */
export function aISO(valor: Date | string | null | undefined): string {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(valor);
}

type IdiomaFecha = "es" | "en";

const LOCALE: Record<IdiomaFecha, string> = { es: "es-CO", en: "en-US" };

const FORMATOS = Object.fromEntries(
  (Object.keys(LOCALE) as IdiomaFecha[]).map((idioma) => [
    idioma,
    {
      corto: new Intl.DateTimeFormat(LOCALE[idioma], { timeZone: ZONA, day: "numeric", month: "short" }),
      largo: new Intl.DateTimeFormat(LOCALE[idioma], {
        timeZone: ZONA,
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  ]),
) as Record<IdiomaFecha, { corto: Intl.DateTimeFormat; largo: Intl.DateTimeFormat }>;

function comoFecha(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  // 'YYYY-MM-DD' se interpreta como UTC medianoche; suficiente para mostrar.
  return new Date(`${valor.slice(0, 10)}T12:00:00Z`);
}

/**
 * El idioma es opcional y por defecto español: Slack, el ZIP y los correos
 * siguen en español aunque la persona tenga la interfaz en inglés. En la
 * interfaz se usan a través de `t.fechaCorta`, que ya lleva el idioma puesto.
 */
export function fechaCorta(valor: Date | string | null | undefined, idioma: IdiomaFecha = "es"): string {
  if (!valor) return "—";
  return FORMATOS[idioma].corto.format(comoFecha(valor));
}

export function fechaLarga(valor: Date | string | null | undefined, idioma: IdiomaFecha = "es"): string {
  if (!valor) return "—";
  return FORMATOS[idioma].largo.format(comoFecha(valor));
}

/** Días que faltan (positivo) o que han pasado (negativo) hasta una fecha. */
export function diasHasta(valor: Date | string | null | undefined): number | null {
  if (!valor) return null;
  const objetivo = new Date(`${aISO(valor)}T00:00:00Z`).getTime();
  const referencia = new Date(`${hoy()}T00:00:00Z`).getTime();
  return Math.round((objetivo - referencia) / 86_400_000);
}

/** "en 3 días", "hoy", "hace 5 días" — o "in 3 days", "today", "5 days ago". */
export function textoRelativo(valor: Date | string | null | undefined, idioma: IdiomaFecha = "es"): string {
  const dias = diasHasta(valor);
  if (dias === null) return "—";
  const n = Math.abs(dias);
  if (idioma === "en") {
    if (dias === 0) return "today";
    if (dias === 1) return "tomorrow";
    if (dias === -1) return "yesterday";
    return dias > 0 ? `in ${n} days` : `${n} days ago`;
  }
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${n} días` : `hace ${n} días`;
}

/** Primer día del mes de una fecha, como 'YYYY-MM-01'. */
export function inicioMes(valor: Date | string = hoy()): string {
  return `${aISO(valor).slice(0, 7)}-01`;
}
