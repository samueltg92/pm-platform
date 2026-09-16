import type { Lado } from "./dominio";

/**
 * Une en una sola persona las filas que la misma persona tiene en varios
 * proyectos.
 *
 * La identidad es el **nombre**, no el correo. Parece al revés, pero el correo
 * de una misma persona cambia entre proyectos —Teleperformance usa `@tp.com` y
 * `@teleperformance.com`, y alguna ficha se copió con el buzón equivocado—,
 * mientras que el nombre es lo que uno teclea cuando busca a alguien. Agrupar
 * por correo partiría a esa persona en dos entradas justo cuando lo que se
 * quería era verla una sola vez.
 *
 * A cambio, cuando una persona tiene varios correos registrados se muestran
 * todos: la incoherencia queda a la vista en vez de resolverse a escondidas
 * eligiendo uno.
 */

/**
 * Lo que necesita `agruparContactos`, descrito aquí en vez de importado de las
 * consultas: así este módulo no arrastra nada de servidor y el componente que
 * pinta la lista puede compartir sus tipos.
 */
export type FilaContacto = {
  id: string;
  nombre: string;
  rol: string | null;
  lado: Lado;
  email: string | null;
  telefono?: string | null;
  cliente_id: string;
  cliente_nombre: string;
};

export type Aparicion = {
  /** El id de la fila `contacto`, que es por proyecto. */
  id: string;
  clienteId: string;
  clienteNombre: string;
  rol: string | null;
  email: string | null;
};

export type Persona = {
  clave: string;
  nombre: string;
  lados: Lado[];
  roles: string[];
  emails: string[];
  telefonos: string[];
  apariciones: Aparicion[];
};

/** Minúsculas, sin tildes y con los espacios colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ORDEN_LADO: Record<Lado, number> = { interno: 0, partner: 1, cliente: 2 };

export function agruparContactos(filas: FilaContacto[]): Persona[] {
  const porPersona = new Map<string, Persona>();

  for (const fila of filas) {
    const clave = normalizar(fila.nombre);
    if (!clave) continue;

    let persona = porPersona.get(clave);
    if (!persona) {
      persona = { clave, nombre: fila.nombre, lados: [], roles: [], emails: [], telefonos: [], apariciones: [] };
      porPersona.set(clave, persona);
    }

    if (!persona.lados.includes(fila.lado)) persona.lados.push(fila.lado);

    const rol = fila.rol?.trim();
    if (rol && !persona.roles.some((r) => normalizar(r) === normalizar(rol))) {
      persona.roles.push(rol);
    }

    const email = fila.email?.trim();
    if (email && !persona.emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      persona.emails.push(email);
    }

    // Mismo número escrito distinto ("+57 300…" y "300…") cuenta como uno si
    // coinciden los últimos 10 dígitos.
    const telefono = fila.telefono?.trim();
    if (telefono) {
      const cola = (x: string) => x.replace(/[^0-9]/g, "").slice(-10);
      if (!persona.telefonos.some((t) => cola(t) === cola(telefono))) persona.telefonos.push(telefono);
    }

    persona.apariciones.push({
      id: fila.id,
      clienteId: fila.cliente_id,
      clienteNombre: fila.cliente_nombre,
      rol: fila.rol,
      email: fila.email,
    });
  }

  for (const persona of porPersona.values()) {
    persona.lados.sort((a, b) => ORDEN_LADO[a] - ORDEN_LADO[b]);
    persona.apariciones.sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, "es"));
  }

  return [...porPersona.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
