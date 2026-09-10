-- Inventario técnico por proyecto.
--
-- Viene del Excel "Inventario_Gestion_Agentes_Autonomos": la ficha del
-- proyecto (PROJECTS + el contact type de VOICE_AGENTS), los servidores de
-- aplicación, la telefonía SIP y las integraciones externas.
--
-- Tres decisiones que explican la forma de estas tablas:
--
-- 1. Casi todo es `text`. Un puerto llega como '5061/15019/15029' y una IP de
--    origen como seis rangos CIDR en varias líneas. Forzar `integer` o `inet`
--    obligaría a inventar una normalización que nadie ha decidido todavía, y
--    perdería justamente lo que hace útil el dato: lo que el partner escribió.
--
-- 2. Los owners del Excel no se guardan aquí. Ya son personas, y las personas
--    viven en `contacto`: se importan ahí con su rol. Dos sitios donde vive el
--    nombre de alguien es un sitio donde el nombre se queda viejo.
--
-- 3. Nada de esto guarda secretos. Los campos son de identificación (host,
--    puerto, usuario), no de acceso. La plataforma no cifra a nivel de
--    columna, así que una contraseña aquí sería una contraseña en claro.

create type tipo_contacto_agente as enum ('inbound', 'outbound', 'ambos');
create type estado_recurso as enum ('activo', 'inactivo', 'planeado');

-- ------------------------------------------------------------------- ficha

create table ficha_proyecto (
  id             uuid primary key references cliente(id) on delete cascade,
  codigo         text,           -- AI-002 en el inventario
  caso_uso       text,           -- Collections, Servicio al cliente...
  proceso        text,           -- qué hace el agente, en prosa
  contact_type   tipo_contacto_agente,
  ambiente       text,           -- PROD, DEV...
  pais           text,
  observaciones  text,
  actualizado_en timestamptz not null default now()
);

comment on table ficha_proyecto is
  'Identidad del proyecto en el inventario. Una fila por cliente.';

-- --------------------------------------------------- servidores de aplicación

create table servidor_app (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references cliente(id) on delete cascade,
  ambiente          text,
  server_name       text,
  app_origen        text,
  host_origen       text,
  ip_origen         text,
  tipo_comunicacion text,   -- unidireccional / bidireccional
  protocolo         text,   -- TCP / UDP / TLS
  puerto            text,
  destino           text,   -- IP o URL de destino
  app_destino       text,
  host_destino      text,
  cloud_provider    text,   -- AWS, Onpremise...
  servicio          text,   -- endpoints concretos que se consumen
  owner_tecnico     text,
  estado            estado_recurso not null default 'activo',
  notas             text,
  creado_en         timestamptz not null default now()
);

create index servidor_app_cliente_idx on servidor_app (cliente_id);

-- --------------------------------------------------------------- telefonía SIP

create table sip_trunk (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references cliente(id) on delete cascade,
  trunk_name       text,
  did              text,   -- número, o 'Outbound' cuando el proyecto es saliente
  vdn_desborde     text,
  sbc              text,
  tp_ip            text,
  agent_ip         text,
  puerto           text,
  transporte       text,   -- UDP / TLS / RTCP
  codec            text,   -- G.711 / G.729
  transfer_destino text,
  estado           estado_recurso not null default 'activo',
  notas            text,
  creado_en        timestamptz not null default now()
);

create index sip_trunk_cliente_idx on sip_trunk (cliente_id);

-- ------------------------------------------------------ integraciones externas

create table integracion_externa (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references cliente(id) on delete cascade,
  sistema       text not null,  -- SFTP, CRM del cliente, middleware...
  tipo          text,           -- REST API, SFTP, base de datos...
  usuario       text,
  metodo        text,           -- GET, POST...
  autenticacion text,           -- OAuth2, usuario/clave...
  puerto        text,
  ambiente      text,
  criticidad    text,
  owner         text,
  estado        estado_recurso not null default 'activo',
  notas         text,
  creado_en     timestamptz not null default now()
);

create index integracion_cliente_idx on integracion_externa (cliente_id);
