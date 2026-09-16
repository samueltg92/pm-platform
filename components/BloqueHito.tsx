import Pastilla from "./Pastilla";
import Icono from "./Icono";
import Autoria from "./Autoria";
import { original } from "@/lib/original";
import { moverFechaHito, cambiarEstadoHito, editarHito, borrarHito } from "@/app/acciones";
import BotonBorrar from "./BotonBorrar";
import { ETIQUETA_HITO, ETIQUETA_ESTADO_HITO, ESTADOS_HITO, TIPOS_HITO } from "@/lib/dominio";
import { diasHasta, aISO } from "@/lib/fechas";
import type { HitoFila, CambioFecha } from "@/lib/consultas/hitos";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export default async function BloqueHito({
  hito,
  historial,
}: {
  hito: HitoFila;
  historial: CambioFecha[];
}) {
  const t = crearTraductor(await leerIdioma());
  const abierto = hito.estado === "pendiente" || hito.estado === "en_curso";
  const dias = diasHasta(hito.fecha_objetivo);
  const urgente = abierto && dias !== null && dias <= 3;

  return (
    <div className="tarjeta">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${abierto ? "" : "line-through"}`}>
              {hito.titulo}
            </span>
            <Pastilla>{t(ETIQUETA_HITO[hito.tipo])}</Pastilla>
            {!abierto && <Pastilla>{t(ETIQUETA_ESTADO_HITO[hito.estado])}</Pastilla>}
            {hito.veces_movido > 0 && (
              <Pastilla fondo="var(--oportunidad-suave)" texto="var(--oportunidad)">
                <Icono nombre="calendario" tam={10} />
                {hito.veces_movido}×
              </Pastilla>
            )}
          </div>
          {hito.notas && (
            <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
              {hito.notas}
            </p>
          )}
          <Autoria fila={hito} className="block mt-1" />
        </div>

        <div className="text-right shrink-0">
          <time className="num text-sm font-medium block">{t.fechaCorta(hito.fecha_objetivo)}</time>
          {abierto && (
            <div
              className="text-xs"
              style={{ color: urgente ? "var(--riesgo)" : "var(--texto-3)" }}
            >
              {t.relativo(hito.fecha_objetivo)}
            </div>
          )}
        </div>
      </div>

      <div
        className="px-4 py-2 flex flex-wrap items-start gap-2"
        style={{ borderTop: "1px solid var(--borde)" }}
      >
        <details className="accion">
          <summary>
            <Icono nombre="calendario" tam={12} />
            {t("Mover fecha")}
            {historial.length > 0 && ` · ${historial.length}`}
          </summary>

          <form action={moverFechaHito} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={hito.id} />
            <input type="hidden" name="cliente_id" value={hito.cliente_id} />
            <div className="grid sm:grid-cols-[10rem_1fr_auto] gap-2 items-end">
              <div>
                <label className="etiqueta">{t("Nueva fecha")}</label>
                <input
                  type="date"
                  name="fecha_nueva"
                  required
                  defaultValue={aISO(hito.fecha_objetivo)}
                  className="campo"
                />
              </div>
              <div>
                <label className="etiqueta">{t("Motivo")}</label>
                <input
                  name="motivo"
                  required
                  className="campo"
                  placeholder={t("Falta aprobación del cliente")}
                />
              </div>
              <button type="submit" className="boton">{t("Mover")}</button>
            </div>
          </form>

          {historial.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {historial.map((c) => (
                <li key={c.id} className="text-xs" style={{ color: "var(--texto-3)" }}>
                  {c.creado_por_nombre && (
                    <strong className="font-medium" style={{ color: "var(--texto-2)" }}>
                      {c.creado_por_nombre}:{" "}
                    </strong>
                  )}
                  {t.fechaCorta(c.fecha_anterior)} → {t.fechaCorta(c.fecha_nueva)} ·{" "}
                  <span style={{ color: "var(--texto-2)" }}>{c.motivo}</span>
                </li>
              ))}
            </ul>
          )}
        </details>

        <details className="accion accion-peligro">
          <summary>
            <Icono nombre="editar" tam={12} />
            {t("Editar")}
          </summary>

          <form action={editarHito} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={hito.id} />
            <input type="hidden" name="cliente_id" value={hito.cliente_id} />
            <div className="grid sm:grid-cols-[1fr_11rem_auto] gap-2 items-end">
              <div>
                <label className="etiqueta">{t("Título")}</label>
                <input name="titulo" required defaultValue={original(hito, "titulo")} className="campo" />
              </div>
              <div>
                <label className="etiqueta">{t("Tipo")}</label>
                <select name="tipo" className="campo" defaultValue={hito.tipo}>
                  {TIPOS_HITO.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {t(ETIQUETA_HITO[opcion])}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="boton">
                {t("Guardar")}
              </button>
            </div>
            <div>
              <label className="etiqueta">{t("Notas")}</label>
              <input name="notas" defaultValue={original(hito, "notas")} className="campo" />
            </div>
          </form>

          <p className="text-xs mt-2" style={{ color: "var(--texto-3)" }}>
            {t("La fecha se cambia desde “Mover fecha”, que pide un motivo.")}
          </p>

          <form
            action={borrarHito}
            className="mt-4 pt-3"
            style={{ borderTop: "1px solid var(--borde)" }}
          >
            <input type="hidden" name="id" value={hito.id} />
            <input type="hidden" name="cliente_id" value={hito.cliente_id} />
            <BotonBorrar
              etiqueta={t("Borrar este hito")}
              confirmacion={t("Confirmar borrado")}
            />
          </form>
        </details>

        <form action={cambiarEstadoHito} className="flex items-center gap-1.5 shrink-0 ml-auto">
          <input type="hidden" name="id" value={hito.id} />
          <input type="hidden" name="cliente_id" value={hito.cliente_id} />
          <select
            name="estado"
            defaultValue={hito.estado}
            className="text-xs rounded-md px-2 py-1"
            style={{
              background: "var(--superficie)",
              border: "1px solid var(--borde-fuerte)",
              color: "var(--texto)",
            }}
          >
            {ESTADOS_HITO.map((e) => (
              <option key={e} value={e}>
                {t(ETIQUETA_ESTADO_HITO[e])}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs" style={{ color: "var(--texto-2)" }}>{t("Aplicar")}</button>
        </form>
      </div>
    </div>
  );
}
