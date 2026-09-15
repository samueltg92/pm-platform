import { hitosCliente, historialFechas } from "@/lib/consultas/hitos";
import BloqueHito from "@/components/BloqueHito";
import { Vacio } from "@/components/Seccion";
import { crearHito } from "@/app/acciones";
import { TIPOS_HITO, ETIQUETA_HITO } from "@/lib/dominio";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas, traducirAgrupado } from "@/lib/traduccion";
import Modal, { FormularioModal } from "@/components/Modal";
export const dynamic = "force-dynamic";

export default async function HitosCliente({ params }: { params: Promise<{ id: string }> }) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const hitos = await traducirFilas(await leerIdioma(), await hitosCliente(id), ["titulo", "notas"]);

  const historialesOriginales = Object.fromEntries(
    await Promise.all(
      hitos
        .filter((h) => h.veces_movido > 0)
        .map(async (h) => [h.id, await historialFechas(h.id)] as const),
    ),
  );
  const historiales = await traducirAgrupado(await leerIdioma(), historialesOriginales, ["motivo"]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="titulo-seccion">{t("Hitos")}</h2>
        <Modal
          etiqueta={t("Añadir hito")}
          titulo={t("Añadir hito")}
          descripcion={t("Una fecha comprometida del proyecto.")}
          variante="principal"
        >
          <FormularioModal accion={crearHito} confirmacion={t("Hito añadido")}>
          <input type="hidden" name="cliente_id" value={id} />
          <div className="grid sm:grid-cols-[1fr_11rem_9rem] gap-3">
            <div>
              <label className="etiqueta">{t("Título")}</label>
              <input name="titulo" required className="campo" placeholder={t("Salida a producción")} />
            </div>
            <div>
              <label className="etiqueta">{t("Tipo")}</label>
              <select name="tipo" className="campo" defaultValue="go_live">
                {TIPOS_HITO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {t(ETIQUETA_HITO[tipo])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">{t("Fecha")}</label>
              <input type="date" name="fecha_objetivo" required className="campo" />
            </div>
          </div>
          <div>
            <label className="etiqueta">{t("Notas")}</label>
            <input name="notas" className="campo" />
          </div>
          <button type="submit" className="boton">{t("Añadir hito")}</button>
        </FormularioModal>
        </Modal>
      </div>


      {hitos.length === 0 ? (
        <Vacio icono="calendario">
          {t("Sin hitos. Añade la fecha de salida para que aparezca en Hoy y te avise.")}
        </Vacio>
      ) : (
        <div className="space-y-2">
          {hitos.map((h) => (
            <BloqueHito key={h.id} hito={h} historial={historiales[h.id] ?? []} />
          ))}
        </div>
      )}
    </>
  );
}
