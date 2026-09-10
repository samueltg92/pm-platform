import { redirect } from "next/navigation";

/**
 * Los contactos viven ahora dentro de la ficha del proyecto, junto al resto de
 * lo que define al cliente. La ruta se queda como redirección porque estaba
 * enlazada desde la agenda general y desde marcadores del navegador.
 */
export default async function ContactosCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clientes/${id}/info`);
}
