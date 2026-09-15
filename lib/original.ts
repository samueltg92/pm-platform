/**
 * El texto tal como lo escribió el usuario, aunque la fila venga traducida.
 *
 * `traducirFilas` guarda en `__es` el valor original de cada campo que cambia.
 * Las vistas pintan la traducción; los formularios de edición tienen que leer
 * de aquí. Si un formulario se rellenara con la traducción, guardar en modo
 * inglés sobrescribiría el texto en español con su traducción — y la
 * siguiente traducción ya partiría de un texto que nadie escribió.
 *
 * Sin dependencias de servidor: lo usan también componentes de cliente.
 */
export function original<T extends object>(fila: T | null | undefined, campo: keyof T & string): string {
  if (!fila) return "";
  const es = (fila as { __es?: Record<string, unknown> }).__es;
  const valor = es && campo in es ? es[campo] : (fila as Record<string, unknown>)[campo];
  return typeof valor === "string" ? valor : "";
}
