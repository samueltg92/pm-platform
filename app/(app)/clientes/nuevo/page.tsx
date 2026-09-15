import Link from "next/link";
import { listarPartners } from "@/lib/consultas/clientes";
import { crearCliente } from "@/app/acciones";
import { FASES, ESTADOS_CLIENTE, ETIQUETA_FASE, ETIQUETA_ESTADO_CLIENTE } from "@/lib/dominio";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

export default async function NuevoCliente() {
  const t = crearTraductor(await leerIdioma());
  const partners = await listarPartners();

  return (
    <div className="max-w-xl">
      <Link href="/clientes" className="text-sm" style={{ color: "var(--texto-2)" }}>
        ← {t("Clientes")}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mt-3 mb-6">{t("Nuevo cliente")}</h1>

      <form action={crearCliente} className="tarjeta p-5 space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">{t("Nombre legal")}</label>
          <input id="nombre" name="nombre" required className="campo" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="etiqueta" htmlFor="partner_id">{t("Partner")}</label>
            <select id="partner_id" name="partner_id" className="campo" defaultValue={partners[0]?.id ?? ""}>
              <option value="">{t("Sin partner")}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiqueta" htmlFor="fase">{t("Fase")}</label>
            <select id="fase" name="fase" className="campo" defaultValue="descubrimiento">
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {t(ETIQUETA_FASE[f])}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="etiqueta" htmlFor="estado">{t("Estado")}</label>
            <select id="estado" name="estado" className="campo" defaultValue="activo">
              {ESTADOS_CLIENTE.map((e) => (
                <option key={e} value={e}>
                  {t(ETIQUETA_ESTADO_CLIENTE[e])}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etiqueta" htmlFor="owner_interno">{t("Responsable interno")}</label>
            <input id="owner_interno" name="owner_interno" className="campo" />
          </div>
        </div>

        <div>
          <label className="etiqueta" htmlFor="descripcion">{t("Descripción")}</label>
          <textarea id="descripcion" name="descripcion" rows={3} className="campo" />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="boton">{t("Crear")}</button>
          <Link href="/clientes" className="boton-suave">{t("Cancelar")}</Link>
        </div>
      </form>
    </div>
  );
}
