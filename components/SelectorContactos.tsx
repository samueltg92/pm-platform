"use client";

import { useMemo, useState } from "react";
import { useT } from "./Idioma";
import { normalizar } from "@/lib/contactos";

export type PersonaDisponible = {
  /** Un `contacto.id` de esa persona; el servidor junta el resto por nombre. */
  id: string;
  nombre: string;
  rol: string | null;
  email: string | null;
  telefono: string | null;
  proyectos: string[];
};

/**
 * Elegir varias personas que ya existen en otros proyectos.
 *
 * Casillas con buscador y no un desplegable múltiple nativo: esos obligan a
 * mantener Ctrl pulsado, y un clic sin él borra toda la selección.
 */
export default function SelectorContactos({ personas }: { personas: PersonaDisponible[] }) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const visibles = useMemo(() => {
    const buscado = normalizar(texto);
    if (!buscado) return personas;
    return personas.filter((p) =>
      normalizar([p.nombre, p.rol, p.email, p.telefono, ...p.proyectos].filter(Boolean).join(" ")).includes(
        buscado,
      ),
    );
  }, [personas, texto]);

  const alternar = (id: string) =>
    setMarcados((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <div className="space-y-3">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t("Buscar persona")}
        className="campo"
        autoFocus
      />

      <div
        className="rounded-md divide-y overflow-y-auto"
        style={{ border: "1px solid var(--borde)", borderColor: "var(--borde)", maxHeight: "18rem" }}
      >
        {visibles.length === 0 ? (
          <p className="px-3 py-4 text-sm text-center" style={{ color: "var(--texto-3)" }}>
            {t("Nadie coincide con eso.")}
          </p>
        ) : (
          visibles.map((p) => {
            const activo = marcados.has(p.id);
            return (
              <label
                key={p.id}
                className="flex items-start gap-3 px-3 py-2 cursor-pointer"
                style={{
                  borderColor: "var(--borde)",
                  background: activo ? "var(--acento-suave)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  name="contacto_id"
                  value={p.id}
                  checked={activo}
                  onChange={() => alternar(p.id)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="text-sm font-medium block">{p.nombre}</span>
                  <span className="text-xs block" style={{ color: "var(--texto-3)" }}>
                    {[p.rol, p.email, p.telefono].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="text-xs block" style={{ color: "var(--texto-3)" }}>
                    {p.proyectos.join(" · ")}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      <button type="submit" className="boton" disabled={marcados.size === 0}>
        {marcados.size === 0
          ? t("Añadir seleccionados")
          : `${t("Añadir seleccionados")} (${marcados.size})`}
      </button>
    </div>
  );
}
