-- Quién creó y quién editó cada cosa.
--
-- La autoría se registra en la base y no en cada acción de la app. Hay más de
-- cuarenta sentencias que escriben —acciones, Slack, métricas, el guardado
-- genérico del inventario— y pasar el usuario a mano por todas es la forma
-- segura de dejar huecos; también en las que se escriban mañana.
--
-- La app solo le dice a Postgres quién es el usuario de la petición, con
-- `set_config('app.usuario', <id>, true)` dentro de la transacción de la
-- escritura (lib/db.ts). Un trigger por tabla hace el resto:
--
-- - al insertar, `creado_por` = ese usuario;
-- - al actualizar, `editado_por` y `editado_en` se renuevan **solo si cambió
--   algún dato**. Tocar únicamente las columnas de autoría, o reescribir una
--   fila con los mismos valores, no cuenta como edición.
--
-- Lo que entra sin usuario —Slack, procesos de fondo— queda con autor nulo, y
-- la interfaz no se lo atribuye a nadie.

create or replace function registrar_autoria() returns trigger
language plpgsql as $$
declare
  usuario uuid := nullif(current_setting('app.usuario', true), '')::uuid;
  ignorar text[] := array['creado_por', 'editado_por', 'editado_en', 'actualizado_en'];
begin
  if tg_op = 'INSERT' then
    if new.creado_por is null then
      new.creado_por := usuario;
    end if;
  elsif (to_jsonb(new) - ignorar) is distinct from (to_jsonb(old) - ignorar) then
    new.editado_por := usuario;
    new.editado_en := now();
  end if;
  return new;
end;
$$;

do $$
declare
  tabla text;
  primero uuid;
  corte timestamptz;
  tablas text[] := array[
    'cliente', 'contacto', 'evento', 'evento_actualizacion', 'hito',
    'hito_cambio_fecha', 'compromiso', 'adjunto', 'metrica_dia', 'metrica_mes',
    'objetivo_mes', 'linea_base', 'ficha_proyecto', 'servidor_app', 'sip_trunk',
    'integracion_externa', 'stack_item'
  ];
begin
  -- El histórico: mientras hubo un solo usuario, todo lo que no vino de Slack
  -- lo creó esa persona. Después ya no hay forma de saberlo y se deja nulo.
  select id into primero from usuario order by creado_en limit 1;
  select creado_en into corte from usuario order by creado_en offset 1 limit 1;

  foreach tabla in array tablas loop
    execute format(
      'alter table %I
         add column creado_por uuid references usuario(id) on delete set null,
         add column editado_por uuid references usuario(id) on delete set null,
         add column editado_en timestamptz', tabla);

    if primero is not null and exists (
      select 1 from information_schema.columns
      where table_name = tabla and column_name = 'creado_en'
    ) then
      if exists (
        select 1 from information_schema.columns
        where table_name = tabla and column_name = 'origen'
      ) then
        execute format(
          'update %I set creado_por = $1
            where creado_por is null and origen::text <> ''slack''
              and ($2::timestamptz is null or creado_en < $2)', tabla)
          using primero, corte;
      else
        execute format(
          'update %I set creado_por = $1
            where creado_por is null and ($2::timestamptz is null or creado_en < $2)', tabla)
          using primero, corte;
      end if;
    end if;

    -- El trigger se crea después del relleno, para que rellenar no cuente
    -- como una edición.
    execute format(
      'create trigger %I before insert or update on %I
         for each row execute function registrar_autoria()',
      tabla || '_autoria', tabla);
  end loop;
end;
$$;
