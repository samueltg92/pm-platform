"use client";

import { useTransition } from "react";
import { cambiarIdioma, cambiarTema } from "@/app/acciones";
import Icono, { type NombreIcono } from "./Icono";
import { useT } from "./Idioma";
import type { Idioma, Tema } from "@/lib/preferencias";

/**
 * Idioma y tema en el menú lateral, siempre a mano.
 *
 * Estaban dentro de Perfil, detrás del nombre de la persona, que es donde
 * nadie busca cómo pasar la interfaz a inglés. Aquí ocupan una línea y se
 * cambian con un clic, sin guardar ni abrir nada.
 */
const TEMAS: { valor: Tema; icono: NombreIcono; etiqueta: string }[] = [
  { valor: "sistema", icono: "pantalla", etiqueta: "Según el sistema" },
  { valor: "claro", icono: "sol", etiqueta: "Claro" },
  { valor: "oscuro", icono: "luna", etiqueta: "Oscuro" },
];

const IDIOMAS: { valor: Idioma; etiqueta: string; nombre: string }[] = [
  { valor: "es", etiqueta: "ES", nombre: "Español" },
  { valor: "en", etiqueta: "EN", nombre: "English" },
];

function Segmento({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex rounded-md p-0.5"
      style={{ background: "var(--superficie)", border: "1px solid var(--borde)" }}
    >
      {children}
    </div>
  );
}

export default function SelectorPreferencias({ tema, idioma }: { tema: Tema; idioma: Idioma }) {
  const t = useT();
  const [pendiente, empezar] = useTransition();

  const enviar = (accion: (datos: FormData) => Promise<void>, campo: string, valor: string) => {
    const datos = new FormData();
    datos.set(campo, valor);
    empezar(() => accion(datos));
  };

  const estilo = (activo: boolean) => ({
    background: activo ? "var(--acento-suave)" : "transparent",
    color: activo ? "var(--acento)" : "var(--texto-3)",
    opacity: pendiente ? 0.6 : 1,
  });

  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-2">
      <Segmento>
        {IDIOMAS.map((i) => (
          <button
            key={i.valor}
            type="button"
            onClick={() => i.valor !== idioma && enviar(cambiarIdioma, "idioma", i.valor)}
            className="text-[11px] font-semibold px-2 py-0.5 rounded"
            style={estilo(i.valor === idioma)}
            title={i.nombre}
            aria-pressed={i.valor === idioma}
          >
            {i.etiqueta}
          </button>
        ))}
      </Segmento>

      <Segmento>
        {TEMAS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => opcion.valor !== tema && enviar(cambiarTema, "tema", opcion.valor)}
            className="px-1.5 py-1 rounded grid place-items-center"
            style={estilo(opcion.valor === tema)}
            title={t(opcion.etiqueta)}
            aria-label={t(opcion.etiqueta)}
            aria-pressed={opcion.valor === tema}
          >
            <Icono nombre={opcion.icono} tam={13} />
          </button>
        ))}
      </Segmento>
    </div>
  );
}
