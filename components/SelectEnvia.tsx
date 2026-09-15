"use client";

import { useAvisar } from "./Avisos";
import { useT } from "./Idioma";

/**
 * Select que envía su formulario al cambiar. Es el patrón de los desplegables
 * de estado de Jira: cambiar sin abrir nada ni buscar un botón de guardar.
 */
export default function SelectEnvia({
  name,
  defaultValue,
  opciones,
  ancho,
}: {
  name: string;
  defaultValue: string;
  opciones: { valor: string; etiqueta: string }[];
  ancho?: string;
}) {
  const avisar = useAvisar();
  const t = useT();

  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => {
        const etiqueta = opciones.find((o) => o.valor === e.currentTarget.value)?.etiqueta;
        e.currentTarget.form?.requestSubmit();
        if (etiqueta) avisar(t(etiqueta));
      }}
      className="text-xs rounded-md px-2 py-1 cursor-pointer"
      style={{
        background: "var(--superficie)",
        border: "1px solid var(--borde-fuerte)",
        color: "var(--texto)",
        width: ancho,
      }}
    >
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {t(o.etiqueta)}
        </option>
      ))}
    </select>
  );
}
