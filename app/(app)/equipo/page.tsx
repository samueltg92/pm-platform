import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { listarEquipo, invitacionesPendientes } from "@/lib/consultas/equipo";
import { cambiarRol, cambiarAcceso, revocarInvitacion } from "@/app/acciones";
import { ROLES, ETIQUETA_ROL, DESCRIPCION_ROL, puedeAdministrar } from "@/lib/roles";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import FormularioInvitacion from "@/components/FormularioInvitacion";
import SelectEnvia from "@/components/SelectEnvia";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
export const dynamic = "force-dynamic";

export default async function Equipo() {
  const t = crearTraductor(await leerIdioma());
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (!puedeAdministrar(sesion.rol)) redirect("/");

  const [miembros, invitaciones] = await Promise.all([
    listarEquipo(),
    invitacionesPendientes(),
  ]);

  const opciones = ROLES.map((r) => ({ valor: r, etiqueta: t(ETIQUETA_ROL[r]) }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-1">{t("Acceso")}</p>
        <h1 className="titulo-pagina">{t("Equipo")}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
          {miembros.length} {miembros.length === 1 ? t("persona") : t("personas")}
        </p>
      </div>

      <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
        {miembros.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderColor: "var(--borde)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{m.nombre}</span>
                {m.id === sesion.id && <Pastilla>{t("tú")}</Pastilla>}
                {!m.activo && (
                  <Pastilla fondo="var(--riesgo-suave)" texto="var(--riesgo)">
                    {t("sin acceso")}
                  </Pastilla>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                {m.email}
              </p>
            </div>

            {m.id === sesion.id ? (
              <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                {t(ETIQUETA_ROL[m.rol])}
              </span>
            ) : (
              <>
                <form action={cambiarRol} className="shrink-0">
                  <input type="hidden" name="id" value={m.id} />
                  <SelectEnvia name="rol" defaultValue={m.rol} opciones={opciones} />
                </form>
                <form action={cambiarAcceso} className="shrink-0">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="activo" value={m.activo ? "0" : "1"} />
                  <button
                    type="submit"
                    className="text-xs"
                    style={{ color: "var(--texto-3)" }}
                  >
                    {m.activo ? t("Quitar acceso") : t("Dar acceso")}
                  </button>
                </form>
              </>
            )}
          </div>
        ))}
      </div>

      <FormularioInvitacion />

      <section>
        <h2 className="text-sm font-semibold mb-2">{t("Invitaciones pendientes")}</h2>
        {invitaciones.length === 0 ? (
          <Vacio>{t("Ninguna.")}</Vacio>
        ) : (
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {invitaciones.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderColor: "var(--borde)" }}
              >
                <span className="text-sm flex-1 min-w-0 truncate">{i.email}</span>
                <Pastilla>{t(ETIQUETA_ROL[i.rol])}</Pastilla>
                <span
                  className="text-xs shrink-0"
                  style={{ color: i.caducada ? "var(--riesgo)" : "var(--texto-3)" }}
                >
                  {i.caducada ? t("caducada") : `${t("caduca")} ${t.relativo(i.expira_en)}`}
                </span>
                <form action={revocarInvitacion} className="shrink-0">
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" className="text-xs" style={{ color: "var(--texto-3)" }}>
                    {t("Revocar")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">{t("Qué puede hacer cada rol")}</h2>
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {ROLES.map((r) => (
            <div key={r} className="px-4 py-3" style={{ borderColor: "var(--borde)" }}>
              <p className="text-sm font-medium">{t(ETIQUETA_ROL[r])}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--texto-2)" }}>
                {t(DESCRIPCION_ROL[r])}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
