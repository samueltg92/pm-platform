-- Teléfono de contacto.
--
-- Se guarda como texto y tal como se escribió —"+57 300 123 4567"—, no como
-- número: un número pierde el `+` del indicativo y los ceros iniciales, y
-- reformatearlo a E.164 estricto lo haría ilegible en la ficha.
--
-- La restricción replica la validación de la acción: el `+` solo puede ir al
-- principio, se admiten los separadores que la gente usa de verdad (espacios,
-- guiones, puntos, paréntesis) y el total de dígitos va de 7 a 15, que es el
-- máximo de E.164. Así un valor imposible no entra aunque alguien escriba
-- directamente en la base.

alter table contacto add column telefono text;

alter table contacto add constraint contacto_telefono_formato check (
  telefono is null
  or (
    telefono ~ '^\+?[0-9 ().-]+$'
    and length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15
  )
);
