import { notFound } from "next/navigation";
import { obtenerCliente, listarPartners } from "@/lib/consultas/clientes";
import { actualizarCliente, archivarCliente, borrarCliente } from "@/app/acciones";
import BotonBorrar from "@/components/BotonBorrar";
import { sql } from "@/lib/db";
import {
  FASES,
  ESTADOS_CLIENTE,
  ETIQUETA_FASE,
  ETIQUETA_ESTADO_CLIENTE,
} from "@/lib/dominio";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

export default async function AjustesCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const [cliente, partners] = await Promise.all([obtenerCliente(id), listarPartners()]);
  if (!cliente) notFound();

  const [conteo] = await sql<{
    eventos: number;
    hitos: number;
    compromisos: number;
    metricas: number;
    adjuntos: number;
  }>(
    `select
       (select count(*) from evento where cliente_id = $1)::int as eventos,
       (select count(*) from hito where cliente_id = $1)::int as hitos,
       (select count(*) from compromiso where cliente_id = $1)::int as compromisos,
       (select count(*) from metrica_dia where cliente_id = $1)::int as metricas,
       (select count(*) from adjunto a join evento e on e.id = a.evento_id
         where e.cliente_id = $1)::int as adjuntos`,
    [id],
  );

  return (
    <div className="max-w-2xl space-y-4">
      <form action={actualizarCliente} className="tarjeta p-5 space-y-4">
        <input type="hidden" name="id" value={cliente.id} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="etiqueta">{t("Nombre legal")}</label>
            <input name="nombre" required defaultValue={cliente.nombre} className="campo" />
          </div>
          <div>
            <label className="etiqueta">{t("Partner")}</label>
            <select name="partner_id" className="campo" defaultValue={cliente.partner_id ?? ""}>
              <option value="">{t("Sin partner")}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">{t("Fase")}</label>
            <select name="fase" className="campo" defaultValue={cliente.fase}>
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {t(ETIQUETA_FASE[f])}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">{t("Estado")}</label>
            <select name="estado" className="campo" defaultValue={cliente.estado}>
              {ESTADOS_CLIENTE.map((e) => (
                <option key={e} value={e}>
                  {t(ETIQUETA_ESTADO_CLIENTE[e])}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">{t("Responsable interno")}</label>
            <input
              name="owner_interno"
              defaultValue={cliente.owner_interno ?? ""}
              className="campo"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">{t("Descripción")}</label>
            <textarea
              name="descripcion"
              rows={3}
              defaultValue={cliente.descripcion ?? ""}
              className="campo"
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--texto-3)" }}>
          {t("Cambiar la fase deja un evento en el timeline automáticamente.")} {t("Alta:")}{" "}
          {t.fechaLarga(cliente.fecha_alta)}.
        </p>

        <button type="submit" className="boton">{t("Guardar")}</button>
      </form>

      <form action={archivarCliente} className="tarjeta p-5">
        <input type="hidden" name="id" value={cliente.id} />
        <input type="hidden" name="archivar" value={cliente.archivado ? "0" : "1"} />
        <h2 className="text-sm font-semibold mb-1">
          {cliente.archivado ? t("Reactivar cliente") : t("Archivar cliente")}
        </h2>
        <p className="text-xs mb-3" style={{ color: "var(--texto-3)" }}>
          {cliente.archivado
            ? t("Vuelve a aparecer en las listas y en el sidebar.")
            : t("Desaparece de las listas y del sidebar. No se borra nada y se puede reactivar.")}
        </p>
        <button type="submit" className="boton-suave">
          {cliente.archivado ? t("Reactivar") : t("Archivar")}
        </button>
      </form>

      <details className="tarjeta">
        <summary
          className="px-5 py-4 text-sm cursor-pointer select-none"
          style={{ color: "var(--riesgo)" }}
        >
          {t("Borrar definitivamente este cliente")}
        </summary>

        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm" style={{ color: "var(--texto-2)" }}>
            {t("Se borra también, y no hay vuelta atrás:")}
          </p>
          <ul className="text-sm space-y-0.5" style={{ color: "var(--texto-2)" }}>
            {(
              [
                [conteo.eventos, "registro", "registros", t("y sus actualizaciones")],
                [conteo.adjuntos, "archivo adjunto", "archivos adjuntos", ""],
                [conteo.hitos, "hito", "hitos", t("y su historial de fechas")],
                [conteo.compromisos, "compromiso", "compromisos", ""],
                [conteo.metricas, "día de métricas", "días de métricas", ""],
              ] as [number, string, string, string][]
            ).map(([n, singular, plural, cola]) => (
              <li key={singular}>
                · {n} {t(n === 1 ? singular : plural)} {cola}
              </li>
            ))}
          </ul>
          <p className="text-sm" style={{ color: "var(--texto-2)" }}>
            {t("Si solo quieres dejar de verlo, archívalo: no se pierde nada.")}
          </p>

          <form action={borrarCliente} className="space-y-2">
            <input type="hidden" name="id" value={cliente.id} />
            <div>
              <label className="etiqueta">
                {t("Escribe el nombre exacto para confirmar")}
              </label>
              <input
                name="confirmacion"
                required
                className="campo"
                placeholder={cliente.nombre}
              />
            </div>
            <BotonBorrar
              etiqueta={t("Borrar definitivamente")}
              confirmacion={t("Confirmar borrado")}
            />
          </form>
        </div>
      </details>
    </div>
  );
}
