import "server-only";
import { sql } from "../db";
import type { Lado } from "../dominio";

export type ContactoFila = {
  id: string;
  nombre: string;
  rol: string | null;
  lado: Lado;
  email: string | null;
  telefono: string | null;
  notas: string | null;
};

export async function contactosCliente(clienteId: string) {
  return sql<ContactoFila>(
    `select id, nombre, rol, lado, email, telefono, notas
     from contacto where cliente_id = $1
     order by array_position(array['interno','partner','cliente']::lado_contacto[], lado), nombre`,
    [clienteId],
  );
}

export type ContactoConCliente = ContactoFila & {
  cliente_id: string;
  cliente_nombre: string;
  cliente_fase: import("../dominio").Fase;
};

/**
 * Todos los contactos de todos los clientes activos, sin agrupar.
 *
 * La misma persona aparece una vez por proyecto, porque en la base un contacto
 * pertenece a un cliente. Agruparlos en personas es cosa de `agruparContactos`.
 */
export async function todosLosContactos() {
  return sql<ContactoConCliente>(
    `select ct.id, ct.nombre, ct.rol, ct.lado, ct.email, ct.telefono, ct.notas,
            cl.id as cliente_id, cl.nombre as cliente_nombre, cl.fase as cliente_fase
     from contacto ct
     join cliente cl on cl.id = ct.cliente_id
     where not cl.archivado
     order by lower(ct.nombre), lower(cl.nombre)`,
  );
}
