/**
 * Quién creó y quién editó una fila. Las columnas las rellena un trigger en la
 * base (migración 014); las consultas añaden los nombres con `sqlAutoria`.
 *
 * Sin dependencias de servidor: los tipos los comparten las vistas de cliente.
 */
export type Autoria = {
  creado_por_nombre?: string | null;
  editado_por_nombre?: string | null;
  editado_en?: string | Date | null;
};

/** Columnas de autoría con nombres, para añadir a un `select` sobre `alias`. */
export function sqlAutoria(alias: string): string {
  return `(select nombre from usuario where id = ${alias}.creado_por) as creado_por_nombre,
          (select nombre from usuario where id = ${alias}.editado_por) as editado_por_nombre,
          ${alias}.editado_en`;
}
