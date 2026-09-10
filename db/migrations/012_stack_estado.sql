-- El stack de voz entra en la ficha del proyecto.
--
-- `stack_item` existe desde la primera migración y nunca se usó: era para
-- guardar qué STT, qué LLM y qué TTS lleva cada cliente. Ahora que esa
-- información se puede sacar de la plataforma de bots, la tabla empieza a
-- valer para algo.
--
-- Le falta una sola cosa para encajar con el resto del inventario: el mismo
-- `estado` que tienen servidores, trunks e integraciones. Sin él habría que
-- mirar `vigente_hasta` para saber si algo sigue en pie, que es una pregunta
-- distinta —cuándo dejó de usarse— y obliga a razonar con fechas para saber
-- lo que las otras tres tablas contestan de un vistazo.

alter table stack_item add column estado estado_recurso not null default 'activo';

comment on column stack_item.estado is
  'Si esta pieza del stack sigue en uso. Las fechas dicen desde y hasta cuándo.';
