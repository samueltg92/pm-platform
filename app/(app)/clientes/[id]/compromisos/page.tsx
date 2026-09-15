import { compromisosCliente } from "@/lib/consultas/compromisos";
import { contactosCliente } from "@/lib/consultas/contactos";
import {
  crearCompromiso,
  cambiarEstadoCompromiso,
  editarCompromiso,
  borrarCompromiso,
} from "@/app/acciones";
import BotonBorrar from "@/components/BotonBorrar";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { LADOS, ETIQUETA_LADO } from "@/lib/dominio";
import { diasHasta, aISO } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas } from "@/lib/traduccion";
import { original } from "@/lib/original";
import Modal, { FormularioModal } from "@/components/Modal";
export const dynamic = "force-dynamic";

export default async function CompromisosCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const [originales, contactos] = await Promise.all([
    compromisosCliente(id),
    contactosCliente(id),
  ]);
  const compromisos = await traducirFilas(await leerIdioma(), originales, ["descripcion"]);

  const abiertos = compromisos.filter((c) => c.estado === "pendiente");
  const cerrados = compromisos.filter((c) => c.estado !== "pendiente");

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="titulo-seccion">{t("Compromisos")}</h2>
        <Modal
          etiqueta={t("Añadir compromiso")}
          titulo={t("Añadir compromiso")}
          descripcion={t("Algo que alguien queda en hacer, con fecha.")}
          variante="principal"
        >
          <FormularioModal accion={crearCompromiso} confirmacion={t("Compromiso añadido")}>
          <input type="hidden" name="cliente_id" value={id} />
          <div>
            <label className="etiqueta">{t("Qué se comprometió")}</label>
            <input
              name="descripcion"
              required
              className="campo"
              placeholder={t("Enviar el postmortem del incidente")}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="etiqueta">{t("Lado")}</label>
              <select name="lado" className="campo" defaultValue="interno">
                {LADOS.map((l) => (
                  <option key={l} value={l}>
                    {t(ETIQUETA_LADO[l])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">{t("Responsable")}</label>
              <select name="responsable_id" className="campo" defaultValue="">
                <option value="">{t("Sin asignar")}</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">{t("Fecha límite")}</label>
              <input type="date" name="fecha_limite" className="campo" />
            </div>
          </div>
          <button type="submit" className="boton">{t("Añadir compromiso")}</button>
        </FormularioModal>
        </Modal>
      </div>


      {abiertos.length === 0 ? (
        <Vacio icono="check">
          {t("Sin compromisos abiertos. Añade uno cuando alguien quede en hacer algo.")}
        </Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {abiertos.map((c) => {
            const dias = diasHasta(c.fecha_limite);
            const vencido = dias !== null && dias < 0;
            return (
              <div key={c.id} className="px-4 py-3" style={{ borderColor: "var(--borde)" }}>
                <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{c.descripcion}</span>
                    <Pastilla>{t(ETIQUETA_LADO[c.lado])}</Pastilla>
                    {vencido && (
                      <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">{t("vencido")}</Pastilla>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                    {c.responsable_nombre ?? t("sin responsable")}
                    {c.fecha_limite ? ` · ${t.relativo(c.fecha_limite)}` : ""}
                  </p>
                </div>
                <form action={cambiarEstadoCompromiso} className="shrink-0">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={id} />
                  <input type="hidden" name="estado" value="cumplido" />
                  <button type="submit" className="boton-suave text-xs">{t("Cumplido")}</button>
                </form>
                </div>

                <details className="mt-2">
                  <summary
                    className="text-xs cursor-pointer select-none"
                    style={{ color: "var(--texto-3)" }}
                  >
                    {t("Editar")}
                  </summary>

                  <form action={editarCompromiso} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="cliente_id" value={id} />
                    <input
                      name="descripcion"
                      required
                      defaultValue={original(c, "descripcion")}
                      className="campo"
                    />
                    <div className="grid sm:grid-cols-[8rem_1fr_10rem_auto] gap-2 items-end">
                      <div>
                        <label className="etiqueta">{t("Lado")}</label>
                        <select name="lado" className="campo" defaultValue={c.lado}>
                          {LADOS.map((l) => (
                            <option key={l} value={l}>
                              {t(ETIQUETA_LADO[l])}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="etiqueta">{t("Responsable")}</label>
                        <select
                          name="responsable_id"
                          className="campo"
                          defaultValue={c.responsable_id ?? ""}
                        >
                          <option value="">{t("Sin asignar")}</option>
                          {contactos.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="etiqueta">{t("Fecha límite")}</label>
                        <input
                          type="date"
                          name="fecha_limite"
                          defaultValue={c.fecha_limite ? aISO(c.fecha_limite) : ""}
                          className="campo"
                        />
                      </div>
                      <button type="submit" className="boton">
                        {t("Guardar")}
                      </button>
                    </div>
                  </form>

                  <form action={borrarCompromiso} className="mt-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="cliente_id" value={id} />
                    <BotonBorrar
                      etiqueta={t("Borrar este compromiso")}
                      confirmacion={t("Confirmar borrado")}
                    />
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      )}

      {cerrados.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--texto-3)" }}>
            {cerrados.length} {cerrados.length === 1 ? t("cerrado") : t("cerrados")}
          </summary>
          <div className="tarjeta divide-y mt-2" style={{ borderColor: "var(--borde)" }}>
            {cerrados.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2.5 text-sm flex items-center justify-between gap-3"
                style={{ borderColor: "var(--borde)", color: "var(--texto-2)" }}
              >
                <span className="line-through">{c.descripcion}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--texto-3)" }}>
                  {c.estado}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
