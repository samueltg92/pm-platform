import {
  guardarObjetivoMes,
  guardarMetricaMes,
  borrarMetricaMes,
  guardarLineaBase,
  borrarLineaBase,
} from "@/app/acciones";
import BotonBorrar from "./BotonBorrar";
import type { LineaBase } from "@/lib/consultas/lineaBase";
import type { ResumenMes } from "@/lib/consultas/metricas";
import { aISO } from "@/lib/fechas";
import { mmss } from "@/lib/aht";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";

/**
 * Una comparación tiene tres partes: lo esperado, lo real y qué tan lejos está.
 * `mejorSiBaja` invierte el color, porque en el AHT quedarse corto es bueno.
 */
function Fila({
  concepto,
  esperado,
  real,
  desvio,
  mejorSiBaja = false,
}: {
  concepto: string;
  esperado: string;
  real: string;
  desvio: number | null;
  mejorSiBaja?: boolean;
}) {
  const bueno = desvio === null ? null : mejorSiBaja ? desvio <= 0 : desvio >= 0;
  const color =
    desvio === null || Math.abs(desvio) < 5
      ? "var(--texto-3)"
      : bueno
        ? "var(--acento)"
        : "var(--riesgo)";

  return (
    <tr>
      <td>{concepto}</td>
      <td className="derecha num" style={{ color: "var(--texto-2)" }}>
        {esperado}
      </td>
      <td className="text-right px-3 py-2.5 font-medium">{real}</td>
      <td className="derecha num" style={{ color }}>
        {desvio === null ? "—" : `${desvio > 0 ? "+" : ""}${desvio.toFixed(0)}%`}
      </td>
    </tr>
  );
}

export default async function LineaBaseCard({
  clienteId,
  base,
  mes,
}: {
  clienteId: string;
  base: LineaBase | null;
  mes: ResumenMes | null;
}) {
  const t = crearTraductor(await leerIdioma());
  const llamadasReales = mes?.llamadas ? Number(mes.llamadas) : null;
  const ahtRealSeg = mes?.duracion_promedio ? Number(mes.duracion_promedio) * 60 : null;
  const contencionReal = mes?.contencion_promedio ? Number(mes.contencion_promedio) : null;

  const desvio = (real: number | null, esperado: number | null) =>
    real === null || esperado === null || esperado === 0
      ? null
      : ((real - esperado) / esperado) * 100;

  const hayComparacion =
    base !== null &&
    (base.volumen_mensual_promedio !== null ||
      base.aht_promedio_seg !== null ||
      base.meta_contencion_pct !== null);

  return (
    <div className="mb-6">
      {hayComparacion && (
        <div className="tarjeta overflow-x-auto mb-3">
          <table className="tabla" style={{ minWidth: "30rem" }}>
            <thead>
              <tr>
                <th >{t("Mes en curso vs línea base")}</th>
                <th className="derecha">{t("Esperado")}</th>
                <th className="derecha">{t("Real")}</th>
                <th className="derecha">{t("Desvío")}</th>
              </tr>
            </thead>
            <tbody>
              {base.volumen_mensual_promedio !== null && (
                <Fila
                  concepto={t("Volumen mensual")}
                  esperado={t.numero(base.volumen_mensual_promedio)}
                  real={t.numero(llamadasReales)}
                  desvio={desvio(llamadasReales, base.volumen_mensual_promedio)}
                />
              )}
              {base.aht_promedio_seg !== null && (
                <Fila
                  concepto="AHT"
                  esperado={mmss(base.aht_promedio_seg)}
                  real={mmss(ahtRealSeg === null ? null : Math.round(ahtRealSeg))}
                  desvio={desvio(ahtRealSeg, base.aht_promedio_seg)}
                  mejorSiBaja
                />
              )}
              {base.meta_contencion_pct !== null && (
                <Fila
                  concepto={t("Contención")}
                  esperado={`${Number(base.meta_contencion_pct).toFixed(0)}%`}
                  real={contencionReal === null ? "—" : `${contencionReal.toFixed(0)}%`}
                  desvio={desvio(contencionReal, Number(base.meta_contencion_pct))}
                />
              )}
            </tbody>
          </table>

          {(base.concurrencia_promedio !== null || base.concurrencia_maxima !== null) && (
            <p
              className="px-4 py-2.5 text-xs"
              style={{ color: "var(--texto-3)", borderTop: "1px solid var(--borde)" }}
            >
              {t("Concurrencia esperada:")}{" "}
              {base.concurrencia_promedio !== null && `${base.concurrencia_promedio} ${t("media")}`}
              {base.concurrencia_promedio !== null && base.concurrencia_maxima !== null && " · "}
              {base.concurrencia_maxima !== null && `${base.concurrencia_maxima} ${t("máxima")}`}
              {base.entregado_por && ` · ${t("según")} ${base.entregado_por}`}
              {base.fecha_entrega && ` (${aISO(base.fecha_entrega)})`}
            </p>
          )}
        </div>
      )}

      <details className="tarjeta" open={!base}>
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >{t("Línea base del partner")}</summary>

        <form action={guardarLineaBase} className="px-4 pb-4 pt-1 space-y-3">
          <input type="hidden" name="cliente_id" value={clienteId} />

          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            {t("Los supuestos que entrega TP antes de salir a producción. Es contra esto que se compara la realidad después.")}
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="etiqueta">{t("Volumen mensual")}</label>
              <input
                name="volumen_mensual_promedio"
                inputMode="numeric"
                className="campo"
                defaultValue={base?.volumen_mensual_promedio ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("AHT promedio")}</label>
              <input
                name="aht_promedio_seg"
                className="campo"
                placeholder="5:10 o 310"
                defaultValue={base?.aht_promedio_seg ? mmss(base.aht_promedio_seg) : ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("Meta de contención %")}</label>
              <input
                name="meta_contencion_pct"
                inputMode="decimal"
                className="campo"
                defaultValue={base?.meta_contencion_pct ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("Concurrencia media")}</label>
              <input
                name="concurrencia_promedio"
                inputMode="numeric"
                className="campo"
                defaultValue={base?.concurrencia_promedio ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("Concurrencia máxima")}</label>
              <input
                name="concurrencia_maxima"
                inputMode="numeric"
                className="campo"
                defaultValue={base?.concurrencia_maxima ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("Fecha de entrega")}</label>
              <input
                type="date"
                name="fecha_entrega"
                className="campo"
                defaultValue={base?.fecha_entrega ? aISO(base.fecha_entrega) : ""}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="etiqueta">{t("Quién lo entregó")}</label>
              <input
                name="entregado_por"
                className="campo"
                placeholder="Jessika Rodríguez"
                defaultValue={base?.entregado_por ?? ""}
              />
            </div>
            <div>
              <label className="etiqueta">{t("Horario operativo")}</label>
              <input
                name="horario_operativo"
                className="campo"
                placeholder="L-V 7:00–19:00"
                defaultValue={base?.horario_operativo ?? ""}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="etiqueta">{t("Notas")}</label>
              <textarea
                name="notas"
                rows={2}
                className="campo"
                defaultValue={base?.notas ?? ""}
              />
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            {t("Cambiar un valor que ya existía deja un evento en el timeline.")}
          </p>

          <button type="submit" className="boton">{t("Guardar línea base")}</button>
        </form>

        {base && (
          <div className="px-4 pb-4">
            <form action={borrarLineaBase}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <BotonBorrar
                etiqueta={t("Borrar la línea base")}
                confirmacion={t("Confirmar borrado")}
              />
            </form>
          </div>
        )}
      </details>
    </div>
  );
}
