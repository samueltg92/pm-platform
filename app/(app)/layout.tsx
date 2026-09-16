import { redirect } from "next/navigation";
import { sesionActual, cerrarSesion } from "@/lib/auth";
import { clientesSidebar } from "@/lib/consultas/clientes";
import Shell from "@/components/Shell";
import { ProveedorIdioma } from "@/components/Idioma";
import { ProveedorAvisos } from "@/components/Avisos";
import { puedeAdministrar, puedeEditar, soloContactos } from "@/lib/roles";
import { hoy } from "@/lib/fechas";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma, leerTema } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = crearTraductor(await leerIdioma());
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");

  const clientes = await clientesSidebar();
  const idioma = await leerIdioma();
  const tema = await leerTema();

  async function salir() {
    "use server";
    await cerrarSesion();
    redirect("/login");
  }

  return (
    <ProveedorIdioma idioma={idioma}>
    <ProveedorAvisos>
    <Shell
      clientes={clientes}
      usuario={sesion.nombre}
      hoy={hoy()}
      tema={tema}
      idioma={idioma}
      esAdmin={puedeAdministrar(sesion.rol)}
      puedeRegistrar={puedeEditar(sesion.rol)}
      soloContactos={soloContactos(sesion.rol)}
      salir={
        <form action={salir}>
          <button type="submit" className="text-xs" style={{ color: "var(--texto-3)" }}>{t("Salir")}</button>
        </form>
      }
    >
      {children}
    </Shell>
    </ProveedorAvisos>
    </ProveedorIdioma>
  );
}
