import Modal, { FormularioModal } from "./Modal";
import BotonBorrar from "./BotonBorrar";
import Pastilla from "./Pastilla";
import { Vacio } from "./Seccion";
import type { Traductor } from "@/lib/i18n";
import { original } from "@/lib/original";
import {
  ESTADOS_RECURSO,
  ETIQUETA_ESTADO_RECURSO,
  colorRecurso,
  type EstadoRecurso,
} from "@/lib/dominio";

/**
 * Las tres tablas del inventario —servidores, SIP e integraciones— se ven y se
 * editan igual: una lista de fichas con pares etiqueta/valor y un modal con los
 * mismos campos. Se declara qué campos tiene cada una y de ahí salen las dos
 * cosas, así que añadir un campo es una línea y no puede quedar en el
 * formulario pero no en la vista.
 */
export type CampoInventario = {
  nombre: string;
  etiqueta: string;
  /** Columnas que ocupa, de 3. */
  ancho?: 1 | 2 | 3;
  multilinea?: boolean;
  placeholder?: string;
  requerido?: boolean;
  /** Cuando el valor es de un juego cerrado, se elige en vez de escribirse. */
  opciones?: { valor: string; etiqueta: string }[];
};

export type ItemInventario = {
  id: string;
  estado: EstadoRecurso;
  [clave: string]: unknown;
};

function valor(item: ItemInventario, nombre: string): string {
  const v = item[nombre];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Un valor del inventario suele venir con saltos de línea —seis rangos de IP,
 * dos endpoints— y son significativos: se respetan en vez de aplanarlos.
 */
function Dato({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  return (
    <div className="min-w-0">
      <dt className="etiqueta" style={{ marginBottom: "0.1rem" }}>
        {etiqueta}
      </dt>
      <dd
        className="text-xs num"
        style={{ color: "var(--texto)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      >
        {texto}
      </dd>
    </div>
  );
}

function anchoClase(ancho?: 1 | 2 | 3) {
  if (ancho === 3) return "sm:col-span-3";
  if (ancho === 2) return "sm:col-span-2";
  return undefined;
}

function Campos({
  campos,
  item,
  t,
}: {
  campos: CampoInventario[];
  item?: ItemInventario;
  t: Traductor;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {campos.map((c) => (
        <div key={c.nombre} className={anchoClase(c.ancho)}>
          <label className="etiqueta">{t(c.etiqueta)}</label>
          {c.opciones ? (
            <select
              name={c.nombre}
              className="campo"
              required={c.requerido}
              defaultValue={item ? original(item, c.nombre) : ""}
            >
              {!c.requerido && <option value="">—</option>}
              {c.opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {t(o.etiqueta)}
                </option>
              ))}
            </select>
          ) : c.multilinea ? (
            <textarea
              name={c.nombre}
              rows={2}
              className="campo"
              placeholder={c.placeholder}
              defaultValue={item ? original(item, c.nombre) : ""}
            />
          ) : (
            <input
              name={c.nombre}
              className="campo"
              required={c.requerido}
              placeholder={c.placeholder}
              defaultValue={item ? original(item, c.nombre) : ""}
            />
          )}
        </div>
      ))}
      <div>
        <label className="etiqueta">{t("Estado")}</label>
        <select name="estado" className="campo" defaultValue={item?.estado ?? "activo"}>
          {ESTADOS_RECURSO.map((e) => (
            <option key={e} value={e}>
              {t(ETIQUETA_ESTADO_RECURSO[e])}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Inventario({
  titulo,
  descripcion,
  etiquetaAlta,
  vacio,
  campos,
  titular,
  items,
  clienteId,
  guardar,
  borrar,
  puedeEditar,
  t,
}: {
  titulo: string;
  descripcion?: string;
  etiquetaAlta: string;
  vacio: string;
  campos: CampoInventario[];
  /** Qué campos hacen de título de la ficha, en orden de preferencia. */
  titular: string[];
  items: ItemInventario[];
  clienteId: string;
  guardar: (datos: FormData) => Promise<void>;
  borrar: (datos: FormData) => Promise<void>;
  puedeEditar: boolean;
  t: Traductor;
}) {
  const nombreDe = (item: ItemInventario) =>
    titular.map((n) => valor(item, n)).find(Boolean) ?? t("Sin nombre");

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h2 className="titulo-seccion flex items-baseline gap-2">
          {t(titulo)}
          {items.length > 0 && (
            <span className="num text-xs" style={{ color: "var(--texto-3)" }}>
              {items.length}
            </span>
          )}
        </h2>
        {puedeEditar && (
          <Modal
            etiqueta={t(etiquetaAlta)}
            titulo={t(etiquetaAlta)}
            descripcion={descripcion ? t(descripcion) : undefined}
          >
            <FormularioModal accion={guardar} confirmacion={t("Guardado")}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <Campos campos={campos} t={t} />
              <button type="submit" className="boton">
                {t("Guardar")}
              </button>
            </FormularioModal>
          </Modal>
        )}
      </div>

      {items.length === 0 ? (
        <Vacio icono="vacio">{t(vacio)}</Vacio>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const color = colorRecurso(item.estado);
            const llenos = campos.filter((c) => valor(item, c.nombre) !== "");
            return (
              <div key={item.id} className="tarjeta px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-medium">{nombreDe(item)}</span>
                  <Pastilla fondo={color.fondo} texto={color.texto}>
                    {t(ETIQUETA_ESTADO_RECURSO[item.estado])}
                  </Pastilla>
                  <span className="flex-1" />
                  {puedeEditar && (
                    <>
                      <Modal etiqueta={t("Editar")} titulo={nombreDe(item)} icono="editar">
                        <FormularioModal accion={guardar} confirmacion={t("Guardado")}>
                          <input type="hidden" name="cliente_id" value={clienteId} />
                          <input type="hidden" name="id" value={item.id} />
                          <Campos campos={campos} item={item} t={t} />
                          <button type="submit" className="boton">
                            {t("Guardar")}
                          </button>
                        </FormularioModal>
                      </Modal>
                      <form action={borrar}>
                        <input type="hidden" name="cliente_id" value={clienteId} />
                        <input type="hidden" name="id" value={item.id} />
                        <BotonBorrar
                          etiqueta={t("Borrar")}
                          confirmacion={t("Confirmar borrado")}
                        />
                      </form>
                    </>
                  )}
                </div>

                {llenos.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--texto-3)" }}>
                    {t("Sin detalle registrado.")}
                  </p>
                ) : (
                  <dl className="grid sm:grid-cols-3 gap-x-4 gap-y-2.5">
                    {llenos.map((c) => (
                      <div key={c.nombre} className={anchoClase(c.ancho)}>
                        <Dato
                          etiqueta={t(c.etiqueta)}
                          texto={
                            c.opciones
                              ? t(
                                  c.opciones.find((o) => o.valor === valor(item, c.nombre))
                                    ?.etiqueta ?? valor(item, c.nombre),
                                )
                              : valor(item, c.nombre)
                          }
                        />
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
