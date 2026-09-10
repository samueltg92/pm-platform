import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import FormularioOlvide from "@/components/FormularioOlvide";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";

export const dynamic = "force-dynamic";

export default async function Olvide() {
  const t = crearTraductor(await leerIdioma());

  // Con sesión abierta esto no tiene sentido: la contraseña se cambia desde
  // Perfil, que además pide la actual.
  if (await sesionActual()) redirect("/perfil");

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Recuperar el acceso")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--texto-2)" }}>
            {t("Escribe tu correo y te enviamos un enlace para elegir una contraseña nueva.")}
          </p>
        </div>

        <FormularioOlvide
          textos={{
            email: t("Email"),
            enviar: t("Enviarme el enlace"),
            enviando: t("Enviando…"),
            volver: t("Volver al inicio de sesión"),
          }}
        />
      </div>
    </main>
  );
}
