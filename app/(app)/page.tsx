import Link from "next/link";
import { hitosProximos } from "@/lib/consultas/hitos";
import { compromisosAbiertos } from "@/lib/consultas/compromisos";
import { clientesEnSilencio } from "@/lib/consultas/clientes";
import { eventosRecientes, eventosAbiertos, actualizacionesDe } from "@/lib/consultas/eventos";
import { adjuntosDe } from "@/lib/consultas/adjuntos";
import { Seccion, Vacio } from "@/components/Seccion";
import Pastilla from "@/components/Pastilla";
import EventoLinea from "@/components/EventoLinea";
import Icono from "@/components/Icono";
import { ETIQUETA_HITO, ETIQUETA_LADO } from "@/lib/dominio";
import { diasHasta } from "@/lib/fechas";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas, traducirAgrupado } from "@/lib/traduccion";

export const dynamic = "force-dynamic";

function colorPorUrgencia(dias: number | null) {
  if (dias === null) return "var(--texto-3)";
  if (dias < 0) return "var(--riesgo)";
  if (dias <= 3) return "var(--oportunidad)";
  return "var(--texto-3)";
}

/**
 * Cifra grande y etiqueta corta. Es la lectura de dos segundos: cuánto hay de
 * cada cosa antes de decidir dónde mirar.
 */
function Señal({
  valor,
  etiqueta,
  alerta = false,
}: {
  valor: number;
  etiqueta: string;
  alerta?: boolean;
}) {
  return (
    <div className="tarjeta px-3.5 py-2.5">
      <p
        className="num text-xl font-semibold leading-none"
        style={{ color: alerta && valor > 0 ? "var(--riesgo)" : "var(--texto)" }}
      >
        {valor}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
        {etiqueta}
      </p>
    </div>
  );
}

export default async function Hoy() {
  const t = crearTraductor(await leerIdioma());

  const [hitos, compromisos, silencio, eventos, abiertos] = await Promise.all([
    hitosProximos(30),
    compromisosAbiertos(7),
    clientesEnSilencio(14),
    eventosRecientes(8),
    eventosAbiertos(),
  ]);

  const idsAbiertos = abiertos.map((e) => e.id);
  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(idsAbiertos),
    adjuntosDe(idsAbiertos),
  ]);

  const idioma = await leerIdioma();
  const [abiertosT, hitosT, compromisosT, eventosT, actualizacionesT] = await Promise.all([
    traducirFilas(idioma, abiertos, ["titulo", "cuerpo"]),
    traducirFilas(idioma, hitos, ["titulo", "notas"]),
    traducirFilas(idioma, compromisos, ["descripcion"]),
    traducirFilas(idioma, eventos, ["titulo", "cuerpo"]),
    traducirAgrupado(idioma, actualizaciones, ["cuerpo"]),
  ]);

  const vencidos = compromisosT.filter(
    (c) => c.fecha_limite && (diasHasta(c.fecha_limite) ?? 0) < 0,
  );
  const urgentes = hitosT.filter((h) => (diasHasta(h.fecha_objetivo) ?? 99) <= 7);

  return (
    <>
      <header className="mb-5">
        <p className="eyebrow mb-1">{t("Panorama")}</p>
        <h1 className="titulo-pagina">{t("Hoy")}</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-7">
        <Señal valor={abiertosT.length} etiqueta={t("Asuntos abiertos")} alerta />
        <Señal valor={urgentes.length} etiqueta={t("Hitos en 7 días")} alerta />
        <Señal valor={vencidos.length} etiqueta={t("Compromisos vencidos")} alerta />
        <Señal valor={silencio.length} etiqueta={t("Clientes sin novedad")} />
      </div>

      {/* Dos columnas en pantallas anchas: lo que exige leer despacio a la
          izquierda, y a la derecha lo que se comprueba de un vistazo. Apiladas
          ocupaban cuatro pantallas de scroll. */}
      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-x-6 items-start">
        <div>
          <Seccion titulo={t("Asuntos abiertos")} contador={abiertosT.length}>
            {abiertosT.length === 0 ? (
              <Vacio icono="check">
                {t("Nada abierto. Ninguna incidencia, bloqueo ni riesgo sin cerrar.")}
              </Vacio>
            ) : (
              <div className="tarjeta py-1">
                {abiertosT.map((e) => (
                  <EventoLinea
                    key={e.id}
                    evento={e}
                    actualizaciones={actualizacionesT[e.id] ?? []}
                    adjuntos={adjuntos[e.id] ?? []}
                    mostrarCliente
                    compacto
                  />
                ))}
              </div>
            )}
          </Seccion>
        </div>

        <div>
          <Seccion
            titulo={t("Hitos próximos")}
            contador={hitosT.length}
            accion={
              <Link href="/hitos" className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t("Ver todos")}
              </Link>
            }
          >
            {hitosT.length === 0 ? (
              <Vacio icono="calendario">{t("Sin hitos en los próximos 30 días.")}</Vacio>
            ) : (
              <ul className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
                {hitosT.slice(0, 6).map((h) => (
                  <li key={h.id} style={{ borderColor: "var(--borde)" }}>
                    <Link
                      href={`/clientes/${h.cliente_id}/hitos`}
                      className="flex items-baseline gap-2 px-3.5 py-2.5 hover:bg-[var(--superficie-2)]"
                    >
                      <time
                        className="num text-xs shrink-0 whitespace-nowrap"
                        style={{
                          color: colorPorUrgencia(diasHasta(h.fecha_objetivo)),
                          minWidth: "4.25rem",
                        }}
                      >
                        {t.fechaCorta(h.fecha_objetivo)}
                      </time>
                      <span className="text-sm flex-1 min-w-0 truncate">{h.titulo}</span>
                      {h.veces_movido > 0 && (
                        <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                          {h.veces_movido}×
                        </Pastilla>
                      )}
                    </Link>
                    <p
                      className="px-3.5 pb-2 text-xs -mt-1"
                      style={{ color: "var(--texto-3)" }}
                    >
                      {h.cliente_nombre} · {t(ETIQUETA_HITO[h.tipo])}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion
            titulo={t("Compromisos")}
            contador={compromisosT.length}
            accion={
              <Link href="/compromisos" className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t("Ver todos")}
              </Link>
            }
          >
            {compromisosT.length === 0 ? (
              <Vacio icono="check">{t("Nada pendiente esta semana.")}</Vacio>
            ) : (
              <ul className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
                {compromisosT.slice(0, 6).map((c) => {
                  const dias = diasHasta(c.fecha_limite);
                  return (
                    <li key={c.id} style={{ borderColor: "var(--borde)" }}>
                      <Link
                        href={`/clientes/${c.cliente_id}/compromisos`}
                        className="block px-3.5 py-2.5 hover:bg-[var(--superficie-2)]"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm flex-1 min-w-0 truncate">
                            {c.descripcion}
                          </span>
                          <span
                            className="num text-xs shrink-0"
                            style={{ color: colorPorUrgencia(dias) }}
                          >
                            {c.fecha_limite ? t.relativo(c.fecha_limite) : "—"}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                          {c.cliente_nombre} · {t(ETIQUETA_LADO[c.lado])}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Seccion>

          {silencio.length > 0 && (
            <Seccion titulo={t("Clientes sin novedad")} contador={silencio.length}>
              <ul className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
                {silencio.map((c) => (
                  <li key={c.id} style={{ borderColor: "var(--borde)" }}>
                    <Link
                      href={`/clientes/${c.id}/timeline`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-[var(--superficie-2)]"
                    >
                      <span className="text-sm truncate">{c.nombre}</span>
                      <span
                        className="num text-xs shrink-0"
                        style={{ color: "var(--texto-3)" }}
                      >
                        {c.ultimo_evento ? t.relativo(c.ultimo_evento) : t("sin registros")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}
        </div>
      </div>

      <details className="mt-2">
        <summary
          className="text-xs cursor-pointer select-none inline-flex items-center gap-1.5"
          style={{ color: "var(--texto-3)" }}
        >
          <Icono nombre="hilo" tam={12} />
          {t("Últimos registros")}
        </summary>
        <div className="tarjeta py-1 mt-2">
          {eventosT.map((e) => (
            <EventoLinea key={e.id} evento={e} mostrarCliente compacto />
          ))}
        </div>
      </details>
    </>
  );
}
