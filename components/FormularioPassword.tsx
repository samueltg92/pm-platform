"use client";

import { useRef, useState } from "react";
import { cambiarPassword } from "@/app/acciones";

import { useT } from "@/components/Idioma";
export default function FormularioPassword() {
  const t = useT();
  const formulario = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [guardando, setGuardando] = useState(false);

  return (
    <form
      ref={formulario}
      action={async (datos) => {
        setGuardando(true);
        setError(null);
        setHecho(false);
        try {
          await cambiarPassword(datos);
          formulario.current?.reset();
          setHecho(true);
        } catch (e) {
          setError(e instanceof Error ? t(e.message) : t("No se pudo cambiar"));
        } finally {
          setGuardando(false);
        }
      }}
      className="tarjeta p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold">{t("Cambiar contraseña")}</h2>

      <div>
        <label className="etiqueta" htmlFor="actual">{t("Contraseña actual")}</label>
        <input
          id="actual"
          name="actual"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
        />
      </div>

      <div>
        <label className="etiqueta" htmlFor="nueva">{t("Contraseña nueva")}</label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="campo"
        />
        <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>{t("Mínimo 10 caracteres.")}</p>
      </div>

      <div>
        <label className="etiqueta" htmlFor="repetir">{t("Repetir la nueva")}</label>
        <input
          id="repetir"
          name="repetir"
          type="password"
          required
          autoComplete="new-password"
          className="campo"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {error}
        </p>
      )}
      {hecho && (
        <p className="text-sm" style={{ color: "var(--acento)" }}>{t("Contraseña cambiada. Tu sesión actual sigue abierta.")}</p>
      )}

      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? t("Cambiando…") : t("Cambiar contraseña")}
      </button>
    </form>
  );
}
