"use client";

import { useT } from "./Idioma";
import type { Autoria as DatosAutoria } from "@/lib/autoria";

/**
 * Quién creó una cosa y, si alguien la cambió después, quién y cuándo.
 *
 * Va pegado al dato, no en un registro aparte: la pregunta "¿esto quién lo
 * puso?" se hace mirando el dato, y obligar a ir a otra pantalla a buscarlo es
 * la forma de que nadie lo mire. Si no se sabe el autor —lo anterior a que
 * existiera un segundo usuario, o lo que llega por Slack— no se muestra nada
 * en vez de atribuírselo a alguien.
 */
export default function Autoria({
  fila,
  antes = "",
  className = "",
}: {
  fila: DatosAutoria;
  /** Separador cuando va a continuación de otro texto, p. ej. " · ". */
  antes?: string;
  className?: string;
}) {
  const t = useT();
  const partes: string[] = [];

  if (fila.creado_por_nombre) partes.push(fila.creado_por_nombre);
  if (fila.editado_por_nombre) {
    const cuando = fila.editado_en ? ` · ${t.relativo(fila.editado_en)}` : "";
    partes.push(`${t("editado por")} ${fila.editado_por_nombre}${cuando}`);
  }
  if (partes.length === 0) return null;

  return (
    <span className={`text-xs ${className}`} style={{ color: "var(--texto-3)" }}>
      {antes}
      {partes.join(" · ")}
    </span>
  );
}
