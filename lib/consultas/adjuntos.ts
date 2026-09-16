import "server-only";
import { sql, uno } from "../db";
import { sqlAutoria, type Autoria } from "../autoria";

export type AdjuntoFila = {
  id: string;
  evento_id: string;
  nombre: string;
  tipo_mime: string;
  tamano_bytes: string;
  creado_en: string;
} & Autoria;

/** Metadatos de los adjuntos de varios eventos. Nunca trae el contenido. */
export async function adjuntosDe(
  eventoIds: string[],
): Promise<Record<string, AdjuntoFila[]>> {
  if (eventoIds.length === 0) return {};

  const filas = await sql<AdjuntoFila>(
    `select ad.id, ad.evento_id, ad.nombre, ad.tipo_mime, ad.tamano_bytes, ad.creado_en, ${sqlAutoria("ad")}
     from adjunto ad
     where evento_id = any($1::uuid[])
     order by creado_en`,
    [eventoIds],
  );

  const porEvento: Record<string, AdjuntoFila[]> = {};
  for (const fila of filas) {
    (porEvento[fila.evento_id] ??= []).push(fila);
  }
  return porEvento;
}

/** El contenido, solo en la ruta de descarga. */
export async function contenidoAdjunto(id: string) {
  return uno<{ nombre: string; contenido: Buffer; tamano_bytes: string }>(
    "select nombre, contenido, tamano_bytes from adjunto where id = $1",
    [id],
  );
}
