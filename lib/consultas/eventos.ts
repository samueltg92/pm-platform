import "server-only";
import { sql } from "../db";
import { sqlAutoria, type Autoria } from "../autoria";
import type { EstadoSeguimiento, Severidad, TipoEvento } from "../dominio";

export type EventoFila = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  tipo: TipoEvento;
  titulo: string;
  cuerpo: string | null;
  fecha_evento: string;
  severidad: Severidad;
  estado_seguimiento: EstadoSeguimiento | null;
  origen: "app" | "slack" | "llm";
  creado_en: string;
  actualizaciones: number;
  ultima_actualizacion: string | null;
} & Autoria;

export type Actualizacion = {
  id: string;
  evento_id: string;
  cuerpo: string;
  estado_anterior: EstadoSeguimiento | null;
  estado_nuevo: EstadoSeguimiento | null;
  origen: "app" | "slack" | "llm";
  creado_en: string;
} & Autoria;

const SELECT_BASE = `
  select e.*, c.nombre as cliente_nombre, ${sqlAutoria("e")},
         coalesce(a.total, 0)::int as actualizaciones,
         a.ultima as ultima_actualizacion
  from evento e
  join cliente c on c.id = e.cliente_id
  left join lateral (
    select count(*) as total, max(creado_en) as ultima
    from evento_actualizacion where evento_id = e.id
  ) a on true
`;

export async function timelineCliente(clienteId: string, limite = 100) {
  return sql<EventoFila>(
    `${SELECT_BASE}
     where e.cliente_id = $1
     order by e.fecha_evento desc, e.creado_en desc
     limit $2`,
    [clienteId, limite],
  );
}

export async function eventosRecientes(limite = 20) {
  return sql<EventoFila>(
    `${SELECT_BASE}
     order by e.fecha_evento desc, e.creado_en desc
     limit $1`,
    [limite],
  );
}

/** Incidencias, bloqueos, riesgos y cambios de scope todavía sin cerrar. */
export async function eventosAbiertos() {
  return sql<EventoFila>(
    `${SELECT_BASE}
     where e.estado_seguimiento in ('abierto', 'en_curso')
       and not c.archivado
     order by
       array_position(array['alta','media','info']::severidad_evento[], e.severidad),
       e.fecha_evento`,
  );
}

/** Actualizaciones de varios eventos a la vez, agrupadas por evento. */
export async function actualizacionesDe(
  eventoIds: string[],
): Promise<Record<string, Actualizacion[]>> {
  if (eventoIds.length === 0) return {};

  const filas = await sql<Actualizacion>(
    `select a.*, ${sqlAutoria("a")} from evento_actualizacion a
     where evento_id = any($1::uuid[])
     order by creado_en`,
    [eventoIds],
  );

  const porEvento: Record<string, Actualizacion[]> = {};
  for (const fila of filas) {
    (porEvento[fila.evento_id] ??= []).push(fila);
  }
  return porEvento;
}
