import { redirect } from "next/navigation";
import { sesionActual, verificarCredenciales, crearSesion } from "@/lib/auth";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; error?: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { volver, error } = await searchParams;

  if (await sesionActual()) redirect(volver ?? "/");

  async function entrar(datos: FormData) {
    "use server";
    const email = String(datos.get("email") ?? "");
    const password = String(datos.get("password") ?? "");
    const destino = String(datos.get("volver") ?? "") || "/";

    const sesion = await verificarCredenciales(email, password);
    if (!sesion) {
      redirect(`/login?error=1${destino !== "/" ? `&volver=${encodeURIComponent(destino)}` : ""}`);
    }

    await crearSesion(sesion);
    redirect(destino);
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t("PM Platform")}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>{t("Centro de control de producto")}</p>
        </div>

        <form action={entrar} className="tarjeta p-6 space-y-4">
          <input type="hidden" name="volver" value={volver ?? ""} />

          <div>
            <label className="etiqueta" htmlFor="email">{t("Email")}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="campo"
            />
          </div>

          <div>
            <label className="etiqueta" htmlFor="password">{t("Contraseña")}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="campo"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--riesgo)" }}>{t("Email o contraseña incorrectos.")}</p>
          )}

          <button type="submit" className="boton w-full justify-center">{t("Entrar")}</button>

          <a
            href="/olvide"
            className="text-xs block text-center"
            style={{ color: "var(--texto-3)" }}
          >{t("Olvidé mi contraseña")}</a>
        </form>
      </div>
    </main>
  );
}
