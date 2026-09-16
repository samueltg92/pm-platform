-- Rol "contactos": solo ve la agenda general y en qué proyectos está cada
-- persona. Ni clientes, ni timeline, ni métricas, ni descargas.
--
-- El límite no vive aquí sino en proxy.ts, que consulta el rol real en cada
-- petición. Esta migración solo añade el valor al enum.

alter type rol_usuario add value if not exists 'contactos';
