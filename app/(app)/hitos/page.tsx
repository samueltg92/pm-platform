import Link from "next/link";
import { todosLosHitos } from "@/lib/consultas/hitos";
import { cambiarEstadoHito } from "@/app/acciones";
import Pastilla from "@/components/Pastilla";
import SelectEnvia from "@/components/SelectEnvia";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_HITO, ESTADOS_HITO, ETIQUETA_ESTADO_HITO } from "@/lib/dominio";
import { diasHasta } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas } from "@/lib/traduccion";
export const dynamic = "force-dynamic";

const OPCIONES = ESTADOS_HITO.map((e) => ({ valor: e, etiqueta: ETIQUETA_ESTADO_HITO[e] }));

export default async function Hitos() {
  const t = crearTraductor(await leerIdioma());
  const hitosOriginales = await todosLosHitos();
  const hitos = await traducirFilas(await leerIdioma(), hitosOriginales, [
    "titulo",
    "notas",
  ]);
  const abiertos = hitos.filter((h) => h.estado === "pendiente" || h.estado === "en_curso");
  const cerrados = hitos.filter((h) => h.estado !== "pendiente" && h.estado !== "en_curso");
  const movidos = hitos.filter((h) => h.veces_movido > 0);
  const media =
    movidos.length > 0
      ? movidos.reduce((s, h) => s + h.veces_movido, 0) / movidos.length
      : 0;

  return (
    <>
      <div className="mb-5">
        <p className="eyebrow mb-1">{t("Fechas comprometidas")}</p>
        <h1 className="titulo-pagina">{t("Hitos")}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
          {abiertos.length} {abiertos.length === 1 ? t("abierto") : t("abiertos")}
          {movidos.length > 0 &&
            ` · ${movidos.length} ${t("con fecha movida")}, ${t.numero(media, 1)} ${t("veces de media")}`}
        </p>
      </div>

      {abiertos.length === 0 ? (
        <Vacio icono="calendario">{t("No hay hitos abiertos.")}</Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {abiertos.map((h) => {
            const dias = diasHasta(h.fecha_objetivo);
            const urgente = dias !== null && dias <= 3;
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--superficie-2)] transition-colors"
                style={{ borderColor: "var(--borde)" }}
              >
                <Link
                  href={`/clientes/${h.cliente_id}/hitos`}
                  className="text-xs shrink-0 w-32 truncate"
                  style={{ color: "var(--texto-3)" }}
                >
                  {h.cliente_nombre}
                </Link>

                <span className="text-sm flex-1 min-w-0 truncate">{h.titulo}</span>

                <Pastilla>{t(ETIQUETA_HITO[h.tipo])}</Pastilla>

                {h.veces_movido > 0 && (
                  <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                    {h.veces_movido}×
                  </Pastilla>
                )}

                <span
                  className="text-xs shrink-0 w-28 text-right"
                  style={{ color: urgente ? "var(--riesgo)" : "var(--texto-3)" }}
                  title={t.fechaCorta(h.fecha_objetivo)}
                >
                  {t.fechaCorta(h.fecha_objetivo)} · {t.relativo(h.fecha_objetivo)}
                </span>

                <form action={cambiarEstadoHito} className="shrink-0">
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="cliente_id" value={h.cliente_id} />
                  <SelectEnvia name="estado" defaultValue={h.estado} opciones={OPCIONES} />
                </form>
              </div>
            );
          })}
        </div>
      )}

      {cerrados.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--texto-3)" }}>
            {cerrados.length} {cerrados.length === 1 ? t("cerrado") : t("cerrados")}
          </summary>
          <div className="tarjeta divide-y mt-2" style={{ borderColor: "var(--borde)" }}>
            {cerrados.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
                style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
              >
                <span className="text-xs shrink-0 w-32 truncate" style={{ color: "var(--texto-3)" }}>
                  {h.cliente_nombre}
                </span>
                <span className="line-through flex-1 min-w-0 truncate">{h.titulo}</span>
                <form action={cambiarEstadoHito} className="shrink-0">
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="cliente_id" value={h.cliente_id} />
                  <SelectEnvia name="estado" defaultValue={h.estado} opciones={OPCIONES} />
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
