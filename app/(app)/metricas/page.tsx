import Link from "next/link";
import { metricasDelDia, diasPendientes } from "@/lib/consultas/metricas";
import CapturaMetricas from "@/components/CapturaMetricas";
import BotonBorrar from "@/components/BotonBorrar";
import { borrarMetricaDia } from "@/app/acciones";
import { Seccion, Vacio } from "@/components/Seccion";
import { hoy } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

function desplazar(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function Metricas({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { fecha: pedida } = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(pedida ?? "") ? pedida! : hoy();

  const [clientes, pendientes] = await Promise.all([
    metricasDelDia(fecha),
    diasPendientes(14),
  ]);

  const registrados = clientes.filter((c) => c.fecha !== null);
  const esHoy = fecha === hoy();

  return (
    <>
      <div className="mb-6">
        <p className="eyebrow mb-1">{t("Registro diario")}</p>
        <h1 className="titulo-pagina">{t("Métricas")}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
          {t.fechaLarga(fecha)}
          {!esHoy && ` · ${t.relativo(fecha)}`}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Link href={`/metricas?fecha=${desplazar(fecha, -1)}`} className="boton-suave">
          {t("← Día anterior")}
        </Link>
        {!esHoy && (
          <>
            <Link href={`/metricas?fecha=${desplazar(fecha, 1)}`} className="boton-suave">{t("Día siguiente →")}</Link>
            <Link href="/metricas" className="text-sm" style={{ color: "var(--texto-2)" }}>{t("Ir a hoy")}</Link>
          </>
        )}
      </div>

      {clientes.length === 0 ? (
        <Vacio>
          {t("No hay clientes en fase producción. Los números se piden solo cuando un cliente llega a producción.")}
        </Vacio>
      ) : (
        <CapturaMetricas fecha={fecha} clientes={clientes} />
      )}

      {registrados.length > 0 && (
        <div className="mt-8">
          <Seccion titulo={t("Días ya registrados")} contador={registrados.length}>
            <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
              {registrados.map((c) => (
                <div
                  key={c.cliente_id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <span className="text-sm">{c.cliente_nombre}</span>
                  <span className="text-xs flex-1 text-right" style={{ color: "var(--texto-3)" }}>
                    {c.sin_actividad
                      ? t("Sin actividad")
                      : `${t.numero(c.llamadas_totales ?? 0)} ${t("llamadas")}`}
                  </span>
                  <form action={borrarMetricaDia} className="shrink-0">
                    <input type="hidden" name="cliente_id" value={c.cliente_id} />
                    <input type="hidden" name="fecha" value={fecha} />
                    <BotonBorrar
                      etiqueta={t("Borrar el día")}
                      confirmacion={t("Confirmar borrado")}
                    />
                  </form>
                </div>
              ))}
            </div>
          </Seccion>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mt-10">
          <Seccion titulo={t("Días incompletos")} contador={pendientes.length}>
            <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
              {pendientes.map((d) => (
                <Link
                  key={String(d.fecha)}
                  href={`/metricas?fecha=${String(d.fecha).slice(0, 10)}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--superficie-2)] transition-colors"
                  style={{ borderColor: "var(--borde)" }}
                >
                  <span className="text-sm">{t.fechaCorta(d.fecha)}</span>
                  <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                    {d.registrados} de {d.esperados} clientes
                  </span>
                </Link>
              ))}
            </div>
          </Seccion>
        </div>
      )}
    </>
  );
}
