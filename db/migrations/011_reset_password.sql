-- Recuperación de contraseña desde el login.
--
-- Hasta ahora, quedarse fuera solo se arreglaba entrando a la consola del
-- contenedor a correr la semilla. Eso deja al único administrador sin salida.
--
-- El token se guarda **hasheado**, igual que en `invitacion`: con acceso a la
-- base no se puede reconstruir un enlace pendiente, solo comprobar uno que ya
-- se tiene. Y dura una hora, no siete días como una invitación: una invitación
-- se espera en la bandeja unos días, un reset se usa en cuanto llega, y cada
-- minuto de más es un minuto en que el enlace sirve si alguien lee el correo.

create table reset_password (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  token_hash text not null unique,
  creada_en  timestamptz not null default now(),
  expira_en  timestamptz not null,
  usada_en   timestamptz
);

-- Para el límite de peticiones y para invalidar las anteriores al emitir una
-- nueva: las dos preguntan por los tokens vivos de un usuario.
create index reset_password_vivos_idx on reset_password (usuario_id, creada_en desc)
  where usada_en is null;

comment on table reset_password is
  'Tokens de recuperación de contraseña. El token en claro solo existe en el correo.';

-- Restablecer la contraseña debe cerrar las sesiones que ya estaban abiertas.
--
-- Las sesiones son JWT firmados, así que no hay nada que borrar en el
-- servidor. En vez de eso se marca desde cuándo son válidas: un token emitido
-- antes de esta fecha se rechaza. Si alguien entró a tu cuenta y por eso
-- cambias la clave, su sesión se cae en la siguiente petición en vez de
-- durarle treinta días.
alter table usuario add column sesiones_desde timestamptz;
