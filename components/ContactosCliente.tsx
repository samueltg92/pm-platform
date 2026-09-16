import { crearContacto, borrarContacto, editarContacto, reutilizarContactos } from "@/app/acciones";
import SelectorContactos, { type PersonaDisponible } from "./SelectorContactos";
import BotonBorrar from "./BotonBorrar";
import Autoria from "./Autoria";
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
    <div className="grid sm:grid-cols-2 gap-3">
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
      <div>
        <label className="etiqueta">{t("Teléfono")}</label>
        <input
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="campo"
          placeholder="+57 300 123 4567"
          pattern="\+?[0-9 \(\)\.\-]{7,24}"
          title={t("Con indicativo de país, por ejemplo +57 300 123 4567")}
          defaultValue={contacto?.telefono ?? ""}
        />
      </div>
    </div>
  );
}

export default function ContactosCliente({
  clienteId,
  contactos,
  puedeEditar,
  disponibles = [],
  t,
}: {
  clienteId: string;
  contactos: ContactoFila[];
  /** Personas de otros proyectos que aún no están en este. */
  disponibles?: PersonaDisponible[];
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
          <div className="flex items-center gap-2">
          {disponibles.length > 0 && (
            <Modal
              etiqueta={t("Añadir existentes")}
              titulo={t("Añadir personas de otros proyectos")}
              descripcion={t("Se copian sus datos a este proyecto. Luego puedes ajustar el rol aquí.")}
            >
              <FormularioModal accion={reutilizarContactos} confirmacion={t("Contactos añadidos")}>
                <input type="hidden" name="cliente_id" value={clienteId} />
                <SelectorContactos personas={disponibles} />
              </FormularioModal>
            </Modal>
          )}
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
          </div>
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
                  {[c.rol, c.email].filter(Boolean).join(" · ") || (c.telefono ? null : "—")}
                  <Autoria fila={c} antes={c.rol || c.email || c.telefono ? " · " : ""} />
                  {c.telefono && (
                    <>
                      {(c.rol || c.email) && " · "}
                      <a href={`tel:${c.telefono.replace(/[^0-9+]/g, "")}`} className="hover:underline num">
                        {c.telefono}
                      </a>
                    </>
                  )}
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
