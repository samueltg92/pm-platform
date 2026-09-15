import { createHash } from "node:crypto";
import { uno } from "@/lib/db";
import { aceptarInvitacion } from "@/app/acciones";
import { ETIQUETA_ROL, DESCRIPCION_ROL, type Rol } from "@/lib/roles";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";

export const dynamic = "force-dynamic";

export default async function Invitacion({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { token } = await params;
  const hash = createHash("sha256").update(token).digest("hex");

  const invitacion = await uno<{ email: string; nombre: string | null; rol: Rol }>(
    `select email, nombre, rol from invitacion
     where token_hash = $1 and usada_en is null and expira_en > now()`,
    [hash],
  );

  if (!invitacion) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="tarjeta p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">{t("Invitación no válida")}</h1>
          <p className="text-sm" style={{ color: "var(--texto-2)" }}>
            {t("El enlace ya se usó, caducó o fue revocado. Pídele otro a quien te invitó.")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">PM Platform</h1>
          <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
            {t("Te invitaron como")} <strong>{t(ETIQUETA_ROL[invitacion.rol])}</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
            {t(DESCRIPCION_ROL[invitacion.rol])}
          </p>
        </div>

        <form action={aceptarInvitacion} className="tarjeta p-6 space-y-4">
          <input type="hidden" name="token" value={token} />

          <div>
            <label className="etiqueta">{t("Email")}</label>
            <input readOnly value={invitacion.email} className="campo" />
          </div>

          <div>
            <label className="etiqueta" htmlFor="nombre">
              {t("Cómo te llamas")}
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              defaultValue={invitacion.nombre ?? ""}
              className="campo"
              autoFocus
            />
          </div>

          <div>
            <label className="etiqueta" htmlFor="password">
              {t("Elige una contraseña")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="campo"
            />
            <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
              {t("Mínimo 10 caracteres.")}
            </p>
          </div>

          <div>
            <label className="etiqueta" htmlFor="repetir">
              {t("Repítela")}
            </label>
            <input
              id="repetir"
              name="repetir"
              type="password"
              required
              autoComplete="new-password"
              className="campo"
            />
          </div>

          <button type="submit" className="boton w-full justify-center">
            {t("Entrar")}
          </button>
        </form>
      </div>
    </main>
  );
}
