import { todosLosContactos } from "@/lib/consultas/contactos";
import { clientesSidebar } from "@/lib/consultas/clientes";
import { agruparContactos } from "@/lib/contactos";
import ListaContactos from "@/components/ListaContactos";
import { Vacio } from "@/components/Seccion";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas } from "@/lib/traduccion";
import { sesionActual } from "@/lib/auth";
export const dynamic = "force-dynamic";

/**
 * La agenda completa, con la etiqueta del proyecto o proyectos de cada uno.
 *
 * En la base un contacto pertenece a un cliente, así que la misma persona
 * existe una vez por proyecto. Aquí se juntan por nombre para poder responder
 * la pregunta que uno se hace de verdad: "¿quién era el PM de TP y en qué
 * proyectos está metido?".
 */
export default async function Contactos() {
  const idioma = await leerIdioma();
  const t = crearTraductor(idioma);

  const [filas, clientes] = await Promise.all([todosLosContactos(), clientesSidebar()]);
  const personas = agruparContactos(await traducirFilas(idioma, filas, ["rol"]));

  return (
    <>
      <div className="mb-5">
        <p className="eyebrow mb-1">{t("Agenda")}</p>
        <h1 className="titulo-pagina">{t("Contactos")}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
          {t("Todas las personas registradas, con los proyectos en los que están.")}
        </p>
      </div>

      {personas.length === 0 ? (
        <Vacio icono="equipo">
          {t("Todavía no hay contactos. Se añaden desde la ficha de cada cliente.")}
        </Vacio>
      ) : (
        <ListaContactos
          personas={personas}
          proyectos={clientes.map((c) => ({ id: c.id, nombre: c.nombre, fase: c.fase }))}
          enlazarProyectos={(await sesionActual())?.rol !== "contactos"}
        />
      )}
    </>
  );
}
