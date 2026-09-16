import "server-only";
import { sql } from "../db";
import { sqlAutoria, type Autoria } from "../autoria";
import type { EstadoCompromiso, Lado } from "../dominio";

export type CompromisoFila = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  descripcion: string;
  responsable_id: string | null;
  responsable_nombre: string | null;
  lado: Lado;
  fecha_limite: string | null;
  estado: EstadoCompromiso;
  creado_en: string;
} & Autoria;

const SELECT_BASE = `
  select co.*, ${sqlAutoria("co")}, c.nombre as cliente_nombre, ct.nombre as responsable_nombre
  from compromiso co
  join cliente c on c.id = co.cliente_id
  left join contacto ct on ct.id = co.responsable_id
`;

export async function compromisosCliente(clienteId: string) {
  return sql<CompromisoFila>(
    `${SELECT_BASE}
     where co.cliente_id = $1
     order by
       case co.estado when 'pendiente' then 0 when 'vencido' then 0 else 1 end,
       co.fecha_limite nulls last`,
    [clienteId],
  );
}

/** Abiertos: vencidos primero, luego los que vencen dentro de la ventana. */
export async function compromisosAbiertos(dias = 7) {
  return sql<CompromisoFila>(
    `${SELECT_BASE}
     where co.estado = 'pendiente'
       and not c.archivado
       and (co.fecha_limite is null or co.fecha_limite <= current_date + $1::int)
     order by co.fecha_limite nulls last`,
    [dias],
  );
}

export async function todosLosCompromisos() {
  return sql<CompromisoFila>(
    `${SELECT_BASE}
     where not c.archivado
     order by
       case co.estado when 'pendiente' then 0 when 'vencido' then 0 else 1 end,
       co.fecha_limite nulls last`,
  );
}
