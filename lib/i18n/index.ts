import { EN } from "./en";
import type { Idioma } from "../preferencias";
import { fechaCorta, fechaLarga, textoRelativo } from "../fechas";

/**
 * El traductor es una función —`t("Guardar")`— que además sabe formatear en
 * el idioma activo lo que no son palabras sueltas: fechas, fechas relativas y
 * números. Así toda pantalla que ya tiene `t` a mano formatea bien sin tener
 * que averiguar el idioma por su cuenta.
 */
export type Traductor = ((texto: string) => string) & {
  idioma: Idioma;
  locale: string;
  fechaCorta: (valor: Date | string | null | undefined) => string;
  fechaLarga: (valor: Date | string | null | undefined) => string;
  relativo: (valor: Date | string | null | undefined) => string;
  numero: (valor: number | string | null | undefined, decimales?: number) => string;
};

/**
 * En español es la identidad; en inglés cae al original cuando falta una
 * entrada: mejor una palabra en español que un hueco en la interfaz.
 */
export function crearTraductor(idioma: Idioma): Traductor {
  const base = idioma === "es" ? (texto: string) => texto : (texto: string) => EN[texto] ?? texto;
  const locale = idioma === "en" ? "en-US" : "es-CO";

  return Object.assign(base, {
    idioma,
    locale,
    fechaCorta: (v: Date | string | null | undefined) => fechaCorta(v, idioma),
    fechaLarga: (v: Date | string | null | undefined) => fechaLarga(v, idioma),
    relativo: (v: Date | string | null | undefined) => textoRelativo(v, idioma),
    numero: (v: number | string | null | undefined, decimales = 0) => {
      if (v === null || v === undefined || v === "") return "—";
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      return n.toLocaleString(locale, {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });
    },
  });
}
