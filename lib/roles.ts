/** Qué puede hacer cada rol. Sin dependencias, para poder usarlo en cliente. */

export const ROLES = ["admin", "editor", "lector", "contactos"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Administrador",
  editor: "Editor",
  lector: "Lector",
  contactos: "Solo contactos",
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  admin: "Todo, incluido invitar personas, borrar clientes y cambiar ajustes.",
  editor: "Registrar, editar y borrar registros. No puede invitar ni borrar clientes.",
  lector: "Solo ver. No puede modificar nada.",
  contactos: "Solo ve la agenda de contactos y en qué proyectos está cada persona. Nada más.",
};

/** Registrar, editar y borrar registros. */
export function puedeEditar(rol: Rol): boolean {
  return rol === "admin" || rol === "editor";
}

/** Invitar personas, borrar clientes y tocar la configuración. */
export function puedeAdministrar(rol: Rol): boolean {
  return rol === "admin";
}

/** Solo la agenda de contactos y los proyectos de cada persona. Lo aplica proxy.ts. */
export function soloContactos(rol: Rol): boolean {
  return rol === "contactos";
}
