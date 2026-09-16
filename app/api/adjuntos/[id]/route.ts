import { sesionActual } from "@/lib/auth";
import { contenidoAdjunto } from "@/lib/consultas/adjuntos";
import { TIPO_DESCARGA, nombreSeguro } from "@/lib/adjuntos";

export const dynamic = "force-dynamic";

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const quien = await sesionActual();
  if (quien?.rol === "contactos") return new Response("Sin acceso", { status: 403 });
  if (!quien) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Identificador inválido", { status: 400 });
  }

  const adjunto = await contenidoAdjunto(id);
  if (!adjunto) return new Response("No encontrado", { status: 404 });

  const nombre = nombreSeguro(adjunto.nombre);

  // Siempre como descarga y con tipo opaco: así un adjunto HTML o SVG nunca se
  // ejecuta en el dominio de la app.
  return new Response(new Uint8Array(adjunto.contenido), {
    headers: {
      "Content-Type": TIPO_DESCARGA,
      "Content-Length": String(adjunto.tamano_bytes),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
