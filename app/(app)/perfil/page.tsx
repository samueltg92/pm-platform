import { sesionActual } from "@/lib/auth";
import FormularioPassword from "@/components/FormularioPassword";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

export default async function Perfil() {
  const t = crearTraductor(await leerIdioma());
  const sesion = await sesionActual();

  return (
    <div className="max-w-md">
      <h1 className="titulo-pagina mb-1">{t("Cuenta")}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--texto-2)" }}>
        {sesion?.nombre} · {sesion?.email}
      </p>

      <div className="space-y-4">
        <a
          href="/diagnostico"
          className="boton-suave inline-flex"
          style={{ textDecoration: "none" }}
        >
          {t("Diagnóstico de integraciones")}
        </a>
        <FormularioPassword />
      </div>
    </div>
  );
}
