import "server-only";
import { sql, uno } from "../db";
import { sqlAutoria, type Autoria } from "../autoria";
import type { CategoriaStack, EstadoRecurso, TipoContactoAgente } from "../dominio";

export type Ficha = {
  id: string;
  codigo: string | null;
  caso_uso: string | null;
  proceso: string | null;
  contact_type: TipoContactoAgente | null;
  ambiente: string | null;
  pais: string | null;
  observaciones: string | null;
} & Autoria;

export type Servidor = {
  id: string;
  cliente_id: string;
  ambiente: string | null;
  server_name: string | null;
  app_origen: string | null;
  host_origen: string | null;
  ip_origen: string | null;
  tipo_comunicacion: string | null;
  protocolo: string | null;
  puerto: string | null;
  destino: string | null;
  app_destino: string | null;
  host_destino: string | null;
  cloud_provider: string | null;
  servicio: string | null;
  owner_tecnico: string | null;
  estado: EstadoRecurso;
  notas: string | null;
} & Autoria;

export type Sip = {
  id: string;
  cliente_id: string;
  trunk_name: string | null;
  did: string | null;
  vdn_desborde: string | null;
  sbc: string | null;
  tp_ip: string | null;
  agent_ip: string | null;
  puerto: string | null;
  transporte: string | null;
  codec: string | null;
  transfer_destino: string | null;
  estado: EstadoRecurso;
  notas: string | null;
} & Autoria;

export type Integracion = {
  id: string;
  cliente_id: string;
  sistema: string;
  tipo: string | null;
  usuario: string | null;
  metodo: string | null;
  autenticacion: string | null;
  puerto: string | null;
  ambiente: string | null;
  criticidad: string | null;
  owner: string | null;
  estado: EstadoRecurso;
  notas: string | null;
} & Autoria;

export type Stack = {
  id: string;
  cliente_id: string;
  categoria: CategoriaStack;
  proveedor: string;
  modelo: string | null;
  version: string | null;
  notas: string | null;
  estado: EstadoRecurso;
} & Autoria;

export function fichaCliente(clienteId: string) {
  return uno<Ficha>(`select f.*, ${sqlAutoria("f")} from ficha_proyecto f where id = $1`, [clienteId]);
}

/**
 * Lo inactivo va al final: sigue estando —hace falta para entender un incidente
 * viejo— pero no debe competir por la atención con lo que está en pie.
 */
const ORDEN_ESTADO = `case estado when 'activo' then 0 when 'planeado' then 1 else 2 end`;

export function servidoresCliente(clienteId: string) {
  return sql<Servidor>(
    `select s.*, ${sqlAutoria("s")} from servidor_app s where cliente_id = $1
     order by ${ORDEN_ESTADO}, coalesce(server_name, app_origen, ''), creado_en`,
    [clienteId],
  );
}

export function sipCliente(clienteId: string) {
  return sql<Sip>(
    `select s.*, ${sqlAutoria("s")} from sip_trunk s where cliente_id = $1
     order by ${ORDEN_ESTADO}, coalesce(trunk_name, ''), creado_en`,
    [clienteId],
  );
}

export function integracionesCliente(clienteId: string) {
  return sql<Integracion>(
    `select s.*, ${sqlAutoria("s")} from integracion_externa s where cliente_id = $1
     order by ${ORDEN_ESTADO}, sistema, creado_en`,
    [clienteId],
  );
}

/**
 * El stack por categoría, en el orden en que se recorre una llamada:
 * entra audio (STT), se razona (LLM), se responde (TTS).
 */
export function stackCliente(clienteId: string) {
  return sql<Stack>(
    `select s.*, ${sqlAutoria("s")} from stack_item s where cliente_id = $1
     order by ${ORDEN_ESTADO},
       array_position(
         array['stt','llm','tts','vad','telefonia','sip','vector_db','infra']::categoria_stack[],
         categoria),
       proveedor`,
    [clienteId],
  );
}

/** Cuántas piezas de inventario tiene un cliente, para el contador de la pestaña. */
export async function conteoInventario(clienteId: string) {
  const fila = await uno<{ servidores: number; sip: number; integraciones: number; stack: number }>(
    `select
       (select count(*) from servidor_app where cliente_id = $1)::int as servidores,
       (select count(*) from sip_trunk where cliente_id = $1)::int as sip,
       (select count(*) from integracion_externa where cliente_id = $1)::int as integraciones,
       (select count(*) from stack_item where cliente_id = $1)::int as stack`,
    [clienteId],
  );
  return fila ?? { servidores: 0, sip: 0, integraciones: 0, stack: 0 };
}
