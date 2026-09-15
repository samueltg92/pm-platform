import { crearContacto, borrarContacto, editarContacto } from "@/app/acciones";
import BotonBorrar from "./BotonBorrar";
import Pastilla from "./Pastilla";
import { Vacio } from "./Seccion";
import Modal, { FormularioModal } from "./Modal";
import { LADOS, ETIQUETA_LADO } from "@/lib/dominio";
import type { ContactoFila } from "@/lib/consultas/contactos";
import type { Traductor } from "@/lib/i18n";
import { original } from "@/lib/original";

/**
 * Los contactos de un proyecto, dentro de su ficha.
 *
 * Estaban en una pestaña propia, pero saber quién aprueba y quién bloquea es
 * parte de la definición del proyecto, igual que su caso de uso o sus trunks:
 * se consultan cuando ya se está mirando el resto, no por separado. La agenda
 * general de /contactos sigue existiendo para la pregunta contraria — en qué
 * proyectos está esta persona.
 */
function CamposContacto({ contacto, t }: { contacto?: ContactoFila; t: Traductor }) {
  return (
    <div className="grid sm:grid-cols-4 gap-3">
      <div>
        <label className="etiqueta">{t("Nombre")}</label>
        <input name="nombre" required className="campo" defaultValue={contacto?.nombre ?? ""} />
      </div>
      <div>
        <label className="etiqueta">{t("Rol")}</label>
        <input
          name="rol"
          className="campo"
          placeholder={t("Aprueba el guion")}
          defaultValue={original(contacto, "rol")}
        />
      </div>
      <div>
        <label className="etiqueta">{t("Lado")}</label>
        <select name="lado" className="campo" defaultValue={contacto?.lado ?? "cliente"}>
          {LADOS.map((l) => (
            <option key={l} value={l}>
              {t(ETIQUETA_LADO[l])}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiqueta">{t("Email")}</label>
        <input name="email" type="email" className="campo" defaultValue={contacto?.email ?? ""} />
      </div>
    </div>
  );
}

export default function ContactosCliente({
  clienteId,
  contactos,
  puedeEditar,
  t,
}: {
  clienteId: string;
  contactos: ContactoFila[];
  puedeEditar: boolean;
  t: Traductor;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h2 className="titulo-seccion flex items-baseline gap-2">
          {t("Contactos")}
          {contactos.length > 0 && (
            <span className="num text-xs" style={{ color: "var(--texto-3)" }}>
              {contactos.length}
            </span>
          )}
        </h2>
        {puedeEditar && (
          <Modal
            etiqueta={t("Añadir contacto")}
            titulo={t("Añadir contacto")}
            descripcion={t("Quién aprueba, quién bloquea, quién decide.")}
          >
            <FormularioModal accion={crearContacto} confirmacion={t("Contacto añadido")}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <CamposContacto t={t} />
              <button type="submit" className="boton">
                {t("Añadir contacto")}
              </button>
            </FormularioModal>
          </Modal>
        )}
      </div>

      {contactos.length === 0 ? (
        <Vacio icono="equipo">
          {t("Sin contactos. Sirven para asignar responsables a los compromisos.")}
        </Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {contactos.map((c) => (
            <div
              key={c.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderColor: "var(--borde)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.nombre}</span>
                  <Pastilla>{t(ETIQUETA_LADO[c.lado])}</Pastilla>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                  {[c.rol, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>

              {puedeEditar && (
                <div className="flex items-center gap-2 shrink-0">
                  <Modal etiqueta={t("Editar")} titulo={c.nombre} icono="editar">
                    <FormularioModal accion={editarContacto} confirmacion={t("Guardado")}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="cliente_id" value={clienteId} />
                      <CamposContacto contacto={c} t={t} />
                      <button type="submit" className="boton">
                        {t("Guardar")}
                      </button>
                    </FormularioModal>
                  </Modal>
                  <form action={borrarContacto}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="cliente_id" value={clienteId} />
                    <BotonBorrar etiqueta={t("Quitar")} confirmacion={t("Confirmar borrado")} />
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
