import Link from "next/link";
import { restablecerPassword, usuarioDeTokenReset } from "@/app/acciones";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";

export const dynamic = "force-dynamic";

export default async function Restablecer({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { token } = await params;

  const usuario = await usuarioDeTokenReset(token);

  if (!usuario) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="tarjeta p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">{t("Enlace no válido")}</h1>
          <p className="text-sm mb-4" style={{ color: "var(--texto-2)" }}>
            {t("Este enlace ya se usó, caducó o fue reemplazado por uno más reciente.")}
          </p>
          <Link href="/olvide" className="boton inline-flex">
            {t("Pedir uno nuevo")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Elige una contraseña nueva")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
            {usuario.email}
          </p>
        </div>

        <form action={restablecerPassword} className="tarjeta p-6 space-y-4">
          <input type="hidden" name="token" value={token} />

          {/* El navegador necesita ver de quién es la contraseña para ofrecer
              guardarla en el gestor. Oculto porque el correo no se elige. */}
          <input
            type="email"
            name="email"
            value={usuario.email}
            autoComplete="username"
            readOnly
            hidden
          />

          <div>
            <label className="etiqueta" htmlFor="password">
              {t("Contraseña nueva")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoFocus
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
            {t("Guardar y entrar")}
          </button>

          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            {t("Al guardarla se cerrarán las demás sesiones abiertas de tu cuenta.")}
          </p>
        </form>
      </div>
    </main>
  );
}
