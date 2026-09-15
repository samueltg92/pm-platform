"use client";

import { createContext, useContext } from "react";
import { crearTraductor, type Traductor } from "@/lib/i18n";
import type { Idioma } from "@/lib/preferencias";

const Contexto = createContext<{ idioma: Idioma; t: Traductor }>({
  idioma: "es",
  t: crearTraductor("es"),
});

export function ProveedorIdioma({
  idioma,
  children,
}: {
  idioma: Idioma;
  children: React.ReactNode;
}) {
  return (
    <Contexto.Provider value={{ idioma, t: crearTraductor(idioma) }}>
      {children}
    </Contexto.Provider>
  );
}

/** Traductor para componentes cliente. En servidor se usa `crearTraductor`. */
export function useT() {
  return useContext(Contexto).t;
}

export function useIdioma() {
  return useContext(Contexto).idioma;
}
