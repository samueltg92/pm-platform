import { sesionActual } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export type Resultado = {
  clase: "cliente" | "evento" | "hito" | "compromiso";
  id: string;
  titulo: string;
  contexto: string;
  url: string;
};

export async function GET(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion) return new Response("No autorizado", { status: 401 });
  if (sesion.rol === "contactos") return new Response("Sin acceso", { status: 403 });

  const consulta = new URL(peticion.url).searchParams.get("q")?.trim() ?? "";
  if (consulta.length < 2) return Response.json({ resultados: [] });

  const patron = `%${consulta}%`;

  // Una sola ida a la base. `unaccent` no está instalado, así que la búsqueda
  // es insensible a mayúsculas pero no a tildes: suficiente para un buscador
  // de salto rápido, y sin depender de una extensión.
  const filas = await sql<{
    clase: Resultado["clase"];
    id: string;
    titulo: string;
    contexto: string;
    cliente_id: string;
    orden: number;
  }>(
    `
    (select 'cliente' as clase, c.id, c.nombre as titulo,
            c.fase::text as contexto, c.id as cliente_id, 0 as orden
     from cliente c
     where not c.archivado and c.nombre ilike $1
     limit 6)
    union all
    (select 'evento', e.id, e.titulo,
            c.nombre || ' · ' || e.tipo::text, c.id, 1
     from evento e join cliente c on c.id = e.cliente_id
     where e.titulo ilike $1 or e.cuerpo ilike $1
     order by e.fecha_evento desc
     limit 8)
    union all
    (select 'hito', h.id, h.titulo,
            c.nombre || ' · ' || h.fecha_objetivo::text, c.id, 2
     from hito h join cliente c on c.id = h.cliente_id
     where h.titulo ilike $1
     limit 5)
    union all
    (select 'compromiso', co.id, co.descripcion,
            c.nombre || ' · ' || co.estado::text, c.id, 3
     from compromiso co join cliente c on c.id = co.cliente_id
     where co.descripcion ilike $1
     limit 5)
    order by orden
    `,
    [patron],
  );

  const ruta: Record<Resultado["clase"], string> = {
    cliente: "",
    evento: "/timeline",
    hito: "/hitos",
    compromiso: "/compromisos",
  };

  return Response.json({
    resultados: filas.map((f) => ({
      clase: f.clase,
      id: f.id,
      titulo: f.titulo,
      contexto: f.contexto,
      url: `/clientes/${f.cliente_id}${ruta[f.clase]}`,
    })),
  });
}
