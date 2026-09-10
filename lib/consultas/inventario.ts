import "server-only";
import { sql, uno } from "../db";
import type { EstadoRecurso, TipoContactoAgente } from "../dominio";

export type Ficha = {
  id: string;
  codigo: string | null;
  caso_uso: string | null;
  proceso: string | null;
  contact_type: TipoContactoAgente | null;
  ambiente: string | null;
  pais: string | null;
  observaciones: string | null;
};

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
};

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
};

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
};

export function fichaCliente(clienteId: string) {
  return uno<Ficha>("select * from ficha_proyecto where id = $1", [clienteId]);
}

/**
 * Lo inactivo va al final: sigue estando —hace falta para entender un incidente
 * viejo— pero no debe competir por la atención con lo que está en pie.
 */
const ORDEN_ESTADO = `case estado when 'activo' then 0 when 'planeado' then 1 else 2 end`;

export function servidoresCliente(clienteId: string) {
  return sql<Servidor>(
    `select * from servidor_app where cliente_id = $1
     order by ${ORDEN_ESTADO}, coalesce(server_name, app_origen, ''), creado_en`,
    [clienteId],
  );
}

export function sipCliente(clienteId: string) {
  return sql<Sip>(
    `select * from sip_trunk where cliente_id = $1
     order by ${ORDEN_ESTADO}, coalesce(trunk_name, ''), creado_en`,
    [clienteId],
  );
}

export function integracionesCliente(clienteId: string) {
  return sql<Integracion>(
    `select * from integracion_externa where cliente_id = $1
     order by ${ORDEN_ESTADO}, sistema, creado_en`,
    [clienteId],
  );
}

/** Cuántas piezas de inventario tiene un cliente, para el contador de la pestaña. */
export async function conteoInventario(clienteId: string) {
  const fila = await uno<{ servidores: number; sip: number; integraciones: number }>(
    `select
       (select count(*) from servidor_app where cliente_id = $1)::int as servidores,
       (select count(*) from sip_trunk where cliente_id = $1)::int as sip,
       (select count(*) from integracion_externa where cliente_id = $1)::int as integraciones`,
    [clienteId],
  );
  return fila ?? { servidores: 0, sip: 0, integraciones: 0 };
}
