import { sesionActual } from "@/lib/auth";
import { construirExport } from "@/lib/exportar";

export const dynamic = "force-dynamic";
// Armar el ZIP lee toda la base y comprime en memoria; con la cartera actual
// tarda un par de segundos, pero no queremos que lo corte el límite por
// defecto si algún día son cincuenta clientes con años de historia.
export const maxDuration = 120;

export async function GET() {
  // Exportar es leer, así que también vale para el rol lector. Lo que no vale
  // es hacerlo sin sesión: aquí sale todo de golpe.
  const sesion = await sesionActual();
  if (sesion?.rol === "contactos") return new Response("Sin acceso", { status: 403 });
  if (!sesion) {
    return new Response("No autorizado", { status: 401 });
  }

  const { nombre, zip } = await construirExport();

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      // El nombre lleva espacios y la fecha, así que va entre comillas; la
      // versión `filename*` es la que respetan los navegadores modernos.
      "Content-Disposition": `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Content-Length": String(zip.length),
      "Cache-Control": "no-store",
    },
  });
}
