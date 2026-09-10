"use client";

import { useActionState } from "react";
import { solicitarReset, type ResultadoReset } from "@/app/acciones";

/**
 * Pedir el enlace de recuperación.
 *
 * Los textos llegan ya traducidos desde el servidor: esta pantalla vive fuera
 * del layout de la app, que es donde se monta el proveedor de idioma, igual
 * que el login.
 */
export default function FormularioOlvide({
  textos,
}: {
  textos: {
    email: string;
    enviar: string;
    enviando: string;
    volver: string;
  };
}) {
  const [estado, enviar, pendiente] = useActionState<ResultadoReset, FormData>(
    solicitarReset,
    null,
  );

  // Una vez enviado no se ofrece reenviar: el botón invita a insistir, y cada
  // insistencia manda otro correo y gasta el límite por hora.
  if (estado?.ok) {
    return (
      <div className="tarjeta p-6">
        <p className="text-sm" style={{ color: "var(--texto)" }}>
          {estado.mensaje}
        </p>
        <a
          href="/login"
          className="boton-suave w-full justify-center mt-4"
          style={{ display: "inline-flex" }}
        >
          {textos.volver}
        </a>
      </div>
    );
  }

  return (
    <form action={enviar} className="tarjeta p-6 space-y-4">
      <div>
        <label className="etiqueta" htmlFor="email">
          {textos.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          className="campo"
        />
      </div>

      {estado?.ok === false && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {estado.mensaje}
        </p>
      )}

      <button type="submit" className="boton w-full justify-center" disabled={pendiente}>
        {pendiente ? textos.enviando : textos.enviar}
      </button>

      <a
        href="/login"
        className="text-xs block text-center"
        style={{ color: "var(--texto-3)" }}
      >
        {textos.volver}
      </a>
    </form>
  );
}
