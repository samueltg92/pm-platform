import Link from "next/link";
import { listarClientes } from "@/lib/consultas/clientes";
import Pastilla from "@/components/Pastilla";
import BotonExportar from "@/components/BotonExportar";
import { Vacio } from "@/components/Seccion";
import { ETIQUETA_FASE, FASES, colorFase, type Fase } from "@/lib/dominio";
import { diasHasta } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas } from "@/lib/traduccion";
export const dynamic = "force-dynamic";

function Delta({ actual, previo }: { actual: string | null; previo: string | null }) {
  if (actual === null || previo === null) return null;
  const a = Number(actual);
  const p = Number(previo);
  if (!Number.isFinite(a) || !Number.isFinite(p) || p === 0) return null;
  const d = ((a - p) / p) * 100;
  const color =
    Math.abs(d) < 5 ? "var(--texto-3)" : d > 0 ? "var(--acento)" : "var(--riesgo)";
  return (
    <span className="text-xs ml-1" style={{ color }}>
      {d > 0 ? "+" : ""}
      {d.toFixed(0)}%
    </span>
  );
}

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const idioma = await leerIdioma();
  const t = crearTraductor(idioma);
  const { fase } = await searchParams;
  const faseFiltro = FASES.includes(fase as Fase) ? (fase as Fase) : undefined;
  const clientes = await traducirFilas(idioma, await listarClientes({ fase: faseFiltro }), [
    "proximo_hito_titulo",
  ]);

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="eyebrow mb-1">{t("Cartera")}</p>
          <h1 className="titulo-pagina">{t("Clientes")}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
            {clientes.length} {clientes.length === 1 ? t("activo") : t("activos")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BotonExportar />
          <Link href="/clientes/nuevo" className="boton">{t("Nuevo cliente")}</Link>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <Link
          href="/clientes"
          className="pastilla"
          style={{
            background: !faseFiltro ? "var(--acento-suave)" : "var(--superficie)",
            color: !faseFiltro ? "var(--acento)" : "var(--texto-2)",
            border: "1px solid var(--borde)",
          }}
        >{t("Todas")}</Link>
        {FASES.map((f) => (
          <Link
            key={f}
            href={`/clientes?fase=${f}`}
            className="pastilla"
            style={{
              background: faseFiltro === f ? "var(--acento-suave)" : "var(--superficie)",
              color: faseFiltro === f ? "var(--acento)" : "var(--texto-2)",
              border: "1px solid var(--borde)",
            }}
          >
            {t(ETIQUETA_FASE[f])}
          </Link>
        ))}
      </div>

      {clientes.length === 0 ? (
        <Vacio>
          {faseFiltro
            ? `${t("No hay clientes en fase")} ${t(ETIQUETA_FASE[faseFiltro])}.`
            : t("No hay clientes todavía.")}
        </Vacio>
      ) : (
        <div className="tarjeta overflow-x-auto">
          <table className="tabla" style={{ minWidth: "48rem" }}>
            <thead>
              <tr>
                <th>{t("Cliente")}</th>
                <th>{t("Fase")}</th>
                <th className="derecha">{t("Llamadas mes")}</th>
                <th>{t("Próximo hito")}</th>
                <th className="derecha">{t("Abiertos")}</th>
                <th className="derecha">{t("Último registro")}</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const color = colorFase(c.fase);
                const diasHito = diasHasta(c.proximo_hito_fecha);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`} className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: color.punto }}
                        />
                        <span className="font-medium hover:underline">{c.nombre}</span>
                      </Link>
                    </td>
                    <td>
                      <Pastilla fondo={color.fondo} texto={color.texto}>
                        {t(ETIQUETA_FASE[c.fase])}
                      </Pastilla>
                    </td>
                    <td className="derecha num whitespace-nowrap">
                      {t.numero(c.llamadas_mes)}
                      <Delta actual={c.llamadas_mes} previo={c.llamadas_mes_previo} />
                    </td>
                    <td>
                      {c.proximo_hito_fecha ? (
                        <span
                          style={{
                            color:
                              diasHito !== null && diasHito <= 3
                                ? "var(--riesgo)"
                                : "var(--texto-2)",
                          }}
                        >
                          <span className="num">{t.fechaCorta(c.proximo_hito_fecha)}</span>
                          <span className="text-xs ml-1.5" style={{ color: "var(--texto-3)" }}>
                            {c.proximo_hito_titulo}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--texto-3)" }}>—</span>
                      )}
                    </td>
                    <td className="derecha">
                      {c.abiertos > 0 ? (
                        <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                          {c.abiertos}
                        </Pastilla>
                      ) : (
                        <span style={{ color: "var(--texto-3)" }}>—</span>
                      )}
                    </td>
                    <td className="derecha num text-xs whitespace-nowrap" style={{ color: "var(--texto-3)" }}>
                      {c.ultimo_evento ? t.relativo(c.ultimo_evento) : t("sin registros")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
