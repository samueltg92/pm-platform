import { guardarObjetivoMes, guardarMetricaMes, borrarMetricaMes } from "@/app/acciones";
import Modal, { FormularioModal } from "./Modal";
import BotonBorrar from "./BotonBorrar";
import { Vacio } from "./Seccion";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { aISO, inicioMes } from "@/lib/fechas";
import type { ResumenMes, ObjetivoMes, MetricaMes } from "@/lib/consultas/metricas";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(periodo: string) {
  const [anio, mes] = aISO(periodo).split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}


function delta(actual: string | null, previo: string | null) {
  if (actual === null || previo === null) return null;
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return null;
  return ((a - p) / p) * 100;
}

/** Un delta pequeño es ruido: por debajo del 5% se muestra en gris. */
function Delta({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const color =
    Math.abs(valor) < 5
      ? "var(--texto-3)"
      : valor > 0
        ? "var(--acento)"
        : "var(--riesgo)";
  return (
    <span className="num text-xs ml-1" style={{ color }}>
      {valor > 0 ? "+" : ""}
      {valor.toFixed(0)}%
    </span>
  );
}

export default async function ResumenMetricas({
  clienteId,
  resumen,
  objetivos,
  meses,
}: {
  clienteId: string;
  resumen: ResumenMes[];
  objetivos: ObjetivoMes[];
  meses: MetricaMes[];
}) {
  const t = crearTraductor(await leerIdioma());
  const num = (valor: string | null, decimales = 0) => t.numero(valor, decimales);
  const periodoActual = inicioMes();
  const objetivoActual = objetivos.find((o) => aISO(o.periodo) === periodoActual);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="titulo-seccion">{t("Métricas mensuales")}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Modal
            etiqueta={t("Objetivo del mes")}
            titulo={t("Objetivo del mes")}
            descripcion={`${t("Lo vendido al cliente para")} ${nombreMes(periodoActual)}.`}
            icono="check"
          >
            <FormularioModal accion={guardarObjetivoMes} confirmacion={t("Objetivo guardado")}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <input type="hidden" name="periodo" value={periodoActual} />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="etiqueta">{t("Llamadas comprometidas")}</label>
                  <input
                    name="llamadas_comprometidas"
                    inputMode="numeric"
                    className="campo"
                    defaultValue={objetivoActual?.llamadas_comprometidas ?? ""}
                  />
                </div>
                <div>
                  <label className="etiqueta">{t("Minutos comprometidos")}</label>
                  <input
                    name="minutos_comprometidos"
                    inputMode="decimal"
                    className="campo"
                    defaultValue={objetivoActual?.minutos_comprometidos ?? ""}
                  />
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t("Dejar ambos vacíos borra el objetivo.")}
              </p>
              <button type="submit" className="boton">
                {t("Guardar objetivo")}
              </button>
            </FormularioModal>
          </Modal>

          <Modal
            etiqueta={t("Cargar un mes")}
            titulo={t("Cargar un mes completo")}
            descripcion={t("Para meses de los que tienes el total pero no el día a día.")}
            icono="calendario"
          >
            <FormularioModal accion={guardarMetricaMes} confirmacion={t("Mes guardado")}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="etiqueta">{t("Mes")}</label>
                  <input type="month" name="periodo" required className="campo" />
                </div>
                <div>
                  <label className="etiqueta">{t("Llamadas")}</label>
                  <input name="llamadas_totales" inputMode="numeric" className="campo" />
                </div>
                <div>
                  <label className="etiqueta">{t("Minutos")}</label>
                  <input name="duracion_total_min" inputMode="decimal" className="campo" />
                </div>
                <div>
                  <label className="etiqueta">{t("Contención %")}</label>
                  <input name="contencion_pct" inputMode="decimal" className="campo" />
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t("Un mes cargado aquí manda sobre la suma de sus días.")}
              </p>
              <button type="submit" className="boton">
                {t("Guardar mes")}
              </button>
            </FormularioModal>
          </Modal>
        </div>
      </div>

      {resumen.length === 0 ? (
        <Vacio icono="calendario">
          {t("Sin métricas registradas. Se capturan en la pantalla de Métricas.")}
        </Vacio>
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="tabla" style={{ minWidth: "34rem" }}>
            <thead>
              <tr>
                <th>{t("Mes")}</th>
                <th className="derecha">{t("Llamadas")}</th>
                <th className="derecha">{t("Minutos")}</th>
                <th className="derecha">{t("Media")}</th>
                <th className="derecha">{t("Contención")}</th>
                <th className="derecha">{t("Objetivo")}</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((mes, i) => {
                const previo = resumen[i + 1];
                const cumplimiento =
                  mes.llamadas_comprometidas && Number(mes.llamadas_comprometidas) > 0
                    ? (Number(mes.llamadas) / Number(mes.llamadas_comprometidas)) * 100
                    : null;
                return (
                  <tr key={String(mes.periodo)}>
                    <td>
                      {nombreMes(String(mes.periodo))}
                      <span
                        className="num text-xs ml-1.5"
                        style={{ color: "var(--texto-3)" }}
                        title={
                          mes.fuente === "mes"
                            ? t("Total del mes cargado a mano")
                            : t("Sumado de los días registrados")
                        }
                      >
                        {mes.fuente === "mes" ? t("mensual") : `${mes.dias_con_actividad}d`}
                      </span>
                    </td>
                    <td className="derecha num whitespace-nowrap">
                      {num(mes.llamadas)}
                      <Delta valor={delta(mes.llamadas, previo?.llamadas ?? null)} />
                    </td>
                    <td className="derecha num whitespace-nowrap">
                      {num(mes.minutos)}
                      <Delta valor={delta(mes.minutos, previo?.minutos ?? null)} />
                    </td>
                    <td className="derecha num">{num(mes.duracion_promedio, 1)}</td>
                    <td className="derecha num">
                      {mes.contencion_promedio === null
                        ? "—"
                        : `${num(mes.contencion_promedio, 1)}%`}
                    </td>
                    <td className="derecha num">
                      {cumplimiento === null ? "—" : `${cumplimiento.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meses.length > 0 && (
        <div className="mt-3">
          <p className="eyebrow mb-1.5">{t("Meses cargados a mano")}</p>
          <ul className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {meses.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                style={{ borderColor: "var(--borde)" }}
              >
                <span>
                  {nombreMes(String(m.periodo))}
                  <span className="num ml-2" style={{ color: "var(--texto-2)" }}>
                    {num(m.llamadas_totales === null ? null : String(m.llamadas_totales))}
                  </span>
                  <span className="ml-1" style={{ color: "var(--texto-3)" }}>
                    {t("llamadas")}
                  </span>
                </span>
                <form action={borrarMetricaMes}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="cliente_id" value={clienteId} />
                  <BotonBorrar etiqueta={t("Quitar")} confirmacion={t("Confirmar")} />
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
