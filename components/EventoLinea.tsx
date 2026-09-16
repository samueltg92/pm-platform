import Pastilla from "./Pastilla";
import BotonBorrar from "./BotonBorrar";
import Autoria from "./Autoria";
import { original } from "@/lib/original";
import Icono from "./Icono";
import {
  actualizarEvento,
  subirAdjunto,
  borrarAdjunto,
  activarSeguimiento,
  editarEvento,
  borrarEvento,
  borrarActualizacion,
} from "@/app/acciones";
import { LIMITE_BYTES, MAX_ARCHIVOS_POR_SUBIDA, tamanoLegible } from "@/lib/adjuntos";
import {
  ETIQUETA_EVENTO,
  ETIQUETA_SEGUIMIENTO,
  ESTADOS_SEGUIMIENTO,
  TIPOS_EVENTO_MANUAL,
  SEVERIDADES,
  ETIQUETA_SEVERIDAD,
  colorEvento,
  colorSeguimiento,
} from "@/lib/dominio";
import { aISO } from "@/lib/fechas";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import type { EventoFila, Actualizacion } from "@/lib/consultas/eventos";
import type { AdjuntoFila } from "@/lib/consultas/adjuntos";

/**
 * Una entrada del registro.
 *
 * La marca sobre la espina codifica dos cosas de un vistazo: la forma dice si
 * el asunto sigue vivo, está cerrado o simplemente ocurrió; el color, de qué
 * clase es. Se lee sin tener que leer.
 */
export default async function EventoLinea({
  evento,
  actualizaciones = [],
  adjuntos = [],
  mostrarCliente = false,
  compacto = false,
}: {
  evento: EventoFila;
  actualizaciones?: Actualizacion[];
  adjuntos?: AdjuntoFila[];
  mostrarCliente?: boolean;
  /** En listas, deja solo la acción que se usa ahí: actualizar y cerrar. */
  compacto?: boolean;
}) {
  const t = crearTraductor(await leerIdioma());

  const color = colorEvento(evento.tipo);
  const estado = evento.estado_seguimiento;
  const seguible = estado !== null;
  const cerrado = estado === "resuelto" || estado === "descartado";
  const vivo = !seguible ? "no" : cerrado ? "cerrado" : "si";

  const colorMarca = cerrado
    ? "var(--texto-3)"
    : seguible
      ? colorSeguimiento(estado).texto
      : color.texto;

  return (
    <article className="espina px-4 py-3">
      <span className="marcador" data-vivo={vivo} style={{ color: colorMarca }}>
        <i />
      </span>

      <header className="flex items-baseline gap-2 flex-wrap">
        <time className="num text-xs" style={{ color: "var(--texto-3)" }}>
          {t.fechaCorta(evento.fecha_evento)}
        </time>

        <Pastilla fondo={color.fondo} texto={color.texto}>
          {t(ETIQUETA_EVENTO[evento.tipo])}
        </Pastilla>

        {seguible && (
          <Pastilla
            fondo={colorSeguimiento(estado).fondo}
            texto={colorSeguimiento(estado).texto}
          >
            {t(ETIQUETA_SEGUIMIENTO[estado])}
          </Pastilla>
        )}

        {evento.severidad === "alta" && !cerrado && (
          <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
            <Icono nombre="alerta" tam={10} />
            {t("Alta")}
          </Pastilla>
        )}

        {evento.origen !== "app" && <Pastilla>{evento.origen}</Pastilla>}

        <Autoria fila={evento} />

        {mostrarCliente && (
          <span className="text-xs" style={{ color: "var(--texto-3)" }}>
            {evento.cliente_nombre}
          </span>
        )}
      </header>

      <h3
        className="text-sm font-medium mt-1"
        style={cerrado ? { color: "var(--texto-2)" } : undefined}
      >
        {evento.titulo}
      </h3>

      {evento.cuerpo && (
        <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--texto-2)" }}>
          {evento.cuerpo}
        </p>
      )}

      {adjuntos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {adjuntos.map((a) => (
            <li key={a.id} className="flex items-center">
              <a
                href={`/api/adjuntos/${a.id}`}
                className="pastilla hover:underline"
                style={{
                  background: "var(--superficie-2)",
                  color: "var(--texto-2)",
                  border: "1px solid var(--borde)",
                  padding: "0.15rem 0.45rem",
                }}
              >
                <Icono nombre="descargar" tam={11} />
                {a.nombre}
                <span className="num" style={{ color: "var(--texto-3)" }}>
                  {tamanoLegible(a.tamano_bytes)}
                </span>
              </a>
              <form action={borrarAdjunto}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="cliente_id" value={evento.cliente_id} />
                <button
                  type="submit"
                  className="px-1"
                  style={{ color: "var(--texto-3)" }}
                  title={t("Quitar adjunto")}
                >
                  <Icono nombre="cerrar" tam={11} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="barra-acciones">
        {!seguible && (
          <form action={activarSeguimiento}>
            <input type="hidden" name="evento_id" value={evento.id} />
            <input type="hidden" name="cliente_id" value={evento.cliente_id} />
            <button
              type="submit"
              className="accion-boton"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--texto-2)",
                border: "1px solid var(--borde)",
                borderRadius: "var(--r-control)",
                padding: "0.2rem 0.5rem",
                cursor: "pointer",
              }}
              title={t("Pasa a asuntos abiertos hasta que lo cierres")}
            >
              <Icono nombre="alerta" tam={12} />
              {t("Hacer seguimiento")}
            </button>
          </form>
        )}

        {/* El hilo nunca se abre solo: en una lista, un hilo desplegado por
            entrada convierte cinco asuntos en una pantalla entera y se pierde
            lo único que importa, que es poder barrerlos de un vistazo. */}
        {seguible && (
          <details className="accion">
            <summary>
              <Icono nombre="hilo" tam={12} />
              {actualizaciones.length === 0
                ? t("Actualizar")
                : `${actualizaciones.length} ${
                    actualizaciones.length === 1 ? t("actualización") : t("actualizaciones")
                  }`}
            </summary>

            <div>
              {actualizaciones.length > 0 && (
                <ol className="space-y-2.5 mb-3">
                  {actualizaciones.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <time className="num text-xs" style={{ color: "var(--texto-3)" }}>
                            {t.relativo(a.creado_en)}
                          </time>
                          {a.estado_nuevo && (
                            <Pastilla
                              fondo={colorSeguimiento(a.estado_nuevo).fondo}
                              texto={colorSeguimiento(a.estado_nuevo).texto}
                            >
                              {a.estado_anterior
                                ? `${t(ETIQUETA_SEGUIMIENTO[a.estado_anterior])} → ${t(
                                    ETIQUETA_SEGUIMIENTO[a.estado_nuevo],
                                  )}`
                                : t(ETIQUETA_SEGUIMIENTO[a.estado_nuevo])}
                            </Pastilla>
                          )}
                        </div>
                        <p
                          className="text-sm whitespace-pre-wrap"
                          style={{ color: "var(--texto-2)" }}
                        >
                          {a.creado_por_nombre && (
                            <strong className="font-medium" style={{ color: "var(--texto)" }}>
                              {a.creado_por_nombre}:{" "}
                            </strong>
                          )}
                          {a.cuerpo}
                        </p>
                      </div>
                      <form action={borrarActualizacion} className="shrink-0">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="cliente_id" value={evento.cliente_id} />
                        <button
                          type="submit"
                          style={{ color: "var(--texto-3)" }}
                          title={t("Borrar")}
                        >
                          <Icono nombre="cerrar" tam={12} />
                        </button>
                      </form>
                    </li>
                  ))}
                </ol>
              )}

              <form action={actualizarEvento} className="space-y-2">
                <input type="hidden" name="evento_id" value={evento.id} />
                <input type="hidden" name="cliente_id" value={evento.cliente_id} />
                <textarea
                  name="cuerpo"
                  required
                  rows={2}
                  className="campo"
                  placeholder={t("Qué pasó con esto")}
                />
                <div className="flex items-center gap-2">
                  <select
                    name="estado_nuevo"
                    className="campo"
                    style={{ width: "auto" }}
                    defaultValue=""
                  >
                    <option value="">{t("Sin cambiar el estado")}</option>
                    {ESTADOS_SEGUIMIENTO.filter((e) => e !== estado).map((e) => (
                      <option key={e} value={e}>
                        {t("Marcar como")} {t(ETIQUETA_SEGUIMIENTO[e]).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="boton">
                    {t("Añadir")}
                  </button>
                </div>
              </form>
            </div>
          </details>
        )}

        {!compacto && (
        <details className="accion">
          <summary>
            <Icono nombre="adjuntar" tam={12} />
            {t("Adjuntar archivo")}
          </summary>
          <div>
            <form action={subirAdjunto} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="evento_id" value={evento.id} />
              <input type="hidden" name="cliente_id" value={evento.cliente_id} />
              <input
                type="file"
                name="archivos"
                multiple
                required
                className="text-xs"
                style={{ color: "var(--texto-2)" }}
              />
              <button type="submit" className="boton-suave">
                {t("Subir")}
              </button>
              <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t("hasta")} {MAX_ARCHIVOS_POR_SUBIDA}, {tamanoLegible(LIMITE_BYTES)}{" "}
                {t("cada uno")}
              </span>
            </form>
          </div>
        </details>
        )}

        {!compacto && (
        <details className="accion accion-peligro">
          <summary>
            <Icono nombre="editar" tam={12} />
            {t("Editar")}
          </summary>

          <div>
            <form action={editarEvento} className="space-y-2">
              <input type="hidden" name="id" value={evento.id} />
              <input type="hidden" name="cliente_id" value={evento.cliente_id} />
              <input name="titulo" required defaultValue={original(evento, "titulo")} className="campo" />
              <textarea
                name="cuerpo"
                rows={2}
                defaultValue={original(evento, "cuerpo")}
                className="campo"
              />
              <div className="grid sm:grid-cols-[1fr_9rem_8rem_auto] gap-2 items-end">
                <div>
                  <label className="etiqueta">{t("Tipo")}</label>
                  <select name="tipo" className="campo" defaultValue={evento.tipo}>
                    {TIPOS_EVENTO_MANUAL.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {t(ETIQUETA_EVENTO[opcion])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">{t("Fecha")}</label>
                  <input
                    type="date"
                    name="fecha_evento"
                    defaultValue={aISO(evento.fecha_evento)}
                    className="campo"
                  />
                </div>
                <div>
                  <label className="etiqueta">{t("Severidad")}</label>
                  <select name="severidad" className="campo" defaultValue={evento.severidad}>
                    {SEVERIDADES.map((sev) => (
                      <option key={sev} value={sev}>
                        {t(ETIQUETA_SEVERIDAD[sev])}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="boton">
                  {t("Guardar")}
                </button>
              </div>
            </form>

            <form
              action={borrarEvento}
              className="mt-4 pt-3"
              style={{ borderTop: "1px solid var(--borde)" }}
            >
              <input type="hidden" name="id" value={evento.id} />
              <input type="hidden" name="cliente_id" value={evento.cliente_id} />
              <BotonBorrar
                etiqueta={t("Borrar este registro")}
                confirmacion={t("Confirmar borrado")}
              />
            </form>
          </div>
        </details>
        )}
      </div>
    </article>
  );
}
