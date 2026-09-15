import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/consultas/clientes";
import { sql } from "@/lib/db";
import Pastilla from "@/components/Pastilla";
import Pestanas from "@/components/Pestanas";
import { ETIQUETA_FASE, ETIQUETA_ESTADO_CLIENTE, colorFase } from "@/lib/dominio";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

type Contadores = {
  eventos: number;
  abiertos: number;
  hitos: number;
  compromisos: number;
  contactos: number;
  inventario: number;
};

export default async function ClienteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const [conteo] = await sql<Contadores>(
    `select
       (select count(*) from evento where cliente_id = $1)::int as eventos,
       (select count(*) from evento where cliente_id = $1
          and estado_seguimiento in ('abierto','en_curso'))::int as abiertos,
       (select count(*) from hito where cliente_id = $1
          and estado in ('pendiente','en_curso'))::int as hitos,
       (select count(*) from compromiso where cliente_id = $1
          and estado = 'pendiente')::int as compromisos,
       (select count(*) from contacto where cliente_id = $1)::int as contactos,
       (
         (select count(*) from servidor_app where cliente_id = $1)
         + (select count(*) from sip_trunk where cliente_id = $1)
         + (select count(*) from integracion_externa where cliente_id = $1)
         + (select count(*) from contacto where cliente_id = $1)
       )::int as inventario`,
    [id],
  );

  const base = `/clientes/${id}`;
  const color = colorFase(cliente.fase);

  return (
    <>
      <div className="text-xs mb-2" style={{ color: "var(--texto-3)" }}>
        <Link href="/clientes" className="hover:underline">{t("Clientes")}</Link>
        {cliente.partner_nombre && ` · ${cliente.partner_nombre}`}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="titulo-pagina truncate">
              {cliente.nombre}
            </h1>
            <Pastilla fondo={color.fondo} texto={color.texto}>
              {t(ETIQUETA_FASE[cliente.fase])}
            </Pastilla>
            {cliente.estado !== "activo" && (
              <Pastilla>{t(ETIQUETA_ESTADO_CLIENTE[cliente.estado])}</Pastilla>
            )}
            {conteo.abiertos > 0 && (
              <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                {conteo.abiertos} {conteo.abiertos === 1 ? t("abierto") : t("abiertos")}
              </Pastilla>
            )}
          </div>
          {cliente.owner_interno && (
            <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
              {cliente.owner_interno}
            </p>
          )}
        </div>
      </div>

      <Pestanas
        pestanas={[
          { href: base, etiqueta: t("Resumen") },
          { href: `${base}/timeline`, etiqueta: t("Timeline"), contador: conteo.eventos },
          { href: `${base}/metricas`, etiqueta: t("Métricas") },
          { href: `${base}/hitos`, etiqueta: t("Hitos"), contador: conteo.hitos },
          {
            href: `${base}/compromisos`,
            etiqueta: t("Compromisos"),
            contador: conteo.compromisos,
          },
          {
            href: `${base}/info`,
            etiqueta: t("Información"),
            contador: conteo.inventario,
          },
          { href: `${base}/ajustes`, etiqueta: t("Ajustes") },
        ]}
      />

      <div className="pt-6">{children}</div>
    </>
  );
}
