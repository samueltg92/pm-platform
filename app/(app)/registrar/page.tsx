import Link from "next/link";
import { clientesSidebar } from "@/lib/consultas/clientes";
import FormularioEvento from "@/components/FormularioEvento";
import Modal from "@/components/Modal";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { hoy } from "@/lib/fechas";
import { ETIQUETA_FASE } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export default async function Registrar() {
  const t = crearTraductor(await leerIdioma());
  const clientes = await clientesSidebar();

  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-1">{t("Captura rápida")}</p>
      <h1 className="titulo-pagina mb-1">{t("Registrar")}</h1>
      <p className="text-sm mb-5" style={{ color: "var(--texto-2)" }}>
        {t("Lo que acabas de saber, sin tener que buscar el cliente primero.")}
      </p>

      {clientes.length === 0 ? (
        <div className="tarjeta p-6 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--texto-2)" }}>
            {t("Todavía no hay clientes. Crea el primero para poder registrar algo.")}
          </p>
          <Link href="/clientes/nuevo" className="boton">
            {t("Nuevo cliente")}
          </Link>
        </div>
      ) : (
        <FormularioEvento
          hoy={hoy()}
          redirigir
          clientes={clientes.map((c) => ({
            id: c.id,
            nombre: `${c.nombre} · ${t(ETIQUETA_FASE[c.fase])}`,
          }))}
        />
      )}
    </div>
  );
}
