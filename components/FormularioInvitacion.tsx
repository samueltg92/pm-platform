"use client";

import { useActionState, useState } from "react";
import { crearInvitacion, type ResultadoInvitacion } from "@/app/acciones";
import { useT } from "@/components/Idioma";
import { ROLES, ETIQUETA_ROL, DESCRIPCION_ROL } from "@/lib/roles";

export default function FormularioInvitacion() {
  const t = useT();
  const [estado, enviar, pendiente] = useActionState<ResultadoInvitacion, FormData>(
    crearInvitacion,
    null,
  );
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="tarjeta p-5">
      <h2 className="text-sm font-semibold mb-3">{t("Invitar a alguien")}</h2>

      <form action={enviar} className="space-y-3">
        <div className="grid sm:grid-cols-[1fr_1fr_10rem] gap-3">
          <div>
            <label className="etiqueta">{t("Email")}</label>
            <input name="email" type="email" required className="campo" />
          </div>
          <div>
            <label className="etiqueta">{t("Nombre")}</label>
            <input name="nombre" className="campo" />
          </div>
          <div>
            <label className="etiqueta">{t("Rol")}</label>
            <select name="rol" className="campo" defaultValue="editor">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(ETIQUETA_ROL[r])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="boton" disabled={pendiente}>
          {pendiente ? t("Creando…") : t("Crear invitación")}
        </button>
      </form>

      {estado?.ok === false && (
        <p className="text-sm mt-3" style={{ color: "var(--riesgo)" }}>
          {t(estado.error)}
        </p>
      )}

      {estado?.ok && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{ background: "var(--acento-suave)", border: "1px solid var(--borde)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--acento)" }}>
            {t("Invitación para")} {estado.email}
          </p>
          <p className="text-xs mt-1 mb-2" style={{ color: "var(--texto-2)" }}>
            {t("Cópialo y mándaselo. Este enlace no se vuelve a mostrar y caduca en 7 días.")}
          </p>
          <div className="flex gap-2">
            <input readOnly value={estado.enlace} className="campo font-mono text-xs" />
            <button
              type="button"
              className="boton shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(estado.enlace);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? t("Copiado") : t("Copiar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
