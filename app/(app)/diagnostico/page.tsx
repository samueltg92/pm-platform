import { diagnosticarSlack, diagnosticarIA, type Comprobacion } from "@/lib/slack/diagnostico";
import { sql } from "@/lib/db";
import { enviarGuiaSlack } from "@/app/acciones";
import { crearTraductor, type Traductor } from "@/lib/i18n";
import { textosPendientes } from "@/lib/traduccion";
import { proveedorActivo } from "@/lib/llm";
import { leerIdioma } from "@/lib/preferencias";

export const dynamic = "force-dynamic";

const COLOR: Record<Comprobacion["estado"], { fondo: string; texto: string; icono: string }> = {
  ok: { fondo: "var(--acento-suave)", texto: "var(--acento)", icono: "✓" },
  fallo: { fondo: "var(--riesgo-suave)", texto: "var(--riesgo)", icono: "✗" },
  aviso: { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)", icono: "!" },
  sin_probar: { fondo: "var(--superficie-2)", texto: "var(--texto-3)", icono: "·" },
};

function Fila({ c, t }: { c: Comprobacion; t: Traductor }) {
  const color = COLOR[c.estado];
  return (
    <div className="flex items-start gap-3 px-4 py-3" style={{ borderColor: "var(--borde)" }}>
      <span
        className="shrink-0 w-5 h-5 rounded-full grid place-items-center text-xs font-bold"
        style={{ background: color.fondo, color: color.texto }}
      >
        {color.icono}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{t(c.nombre)}</p>
        <p className="text-sm mt-0.5 break-words" style={{ color: "var(--texto-2)" }}>
          {t(c.detalle)}
        </p>
      </div>
    </div>
  );
}

export default async function Diagnostico() {
  const t = crearTraductor(await leerIdioma());

  const [slack, ia, envios, pendientes] = await Promise.all([
    diagnosticarSlack(),
    diagnosticarIA(),
    sql<{ clave: string; fecha: string; enviado_en: string }>(
      "select clave, fecha, enviado_en from envio_slack order by enviado_en desc limit 10",
    ),
    textosPendientes("en"),
  ]);

  // Cuántos textos escritos por el usuario faltan por traducir. Si no baja a
  // cero en un par de minutos, el proceso de fondo está fallando: el motivo
  // exacto queda en los logs, en líneas que empiezan por [traducción].
  const traduccion: Comprobacion =
    pendientes.length === 0
      ? { nombre: "Traducción al inglés", estado: "ok", detalle: "Todo el contenido está traducido." }
      : {
          nombre: "Traducción al inglés",
          estado: proveedorActivo() === "ninguno" ? "fallo" : "aviso",
          detalle:
            proveedorActivo() === "ninguno"
              ? `${pendientes.length} ${t("textos sin traducir y ningún proveedor de IA configurado.")}`
              : `${pendientes.length} ${t("textos pendientes. Se traducen solos en segundo plano, en lotes, cada minuto.")}`,
        };

  const entorno: Comprobacion[] = [
    {
      nombre: "APP_URL",
      estado: process.env.APP_URL ? "ok" : "aviso",
      detalle:
        process.env.APP_URL ??
        "Sin definir: los mensajes de Slack saldrán sin enlaces a la app",
    },
    {
      nombre: "Signing secret",
      estado: process.env.SLACK_SIGNING_SECRET ? "ok" : "fallo",
      detalle: process.env.SLACK_SIGNING_SECRET
        ? "Definido. Si Slack recibe 401, es que no coincide con el de Basic Information."
        : "Sin definir: toda petición de Slack se rechazará",
    },
  ];

  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-1">{t("Integraciones")}</p>
      <h1 className="titulo-pagina mb-1">{t("Diagnóstico")}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--texto-2)" }}>
        {t("Comprobaciones en vivo contra Slack y el modelo.")}
      </p>

      <div className="space-y-4">
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold">Slack</h2>
            <form action={enviarGuiaSlack}>
              <button type="submit" className="boton-suave text-xs">
                {t("Enviar la guía al canal")}
              </button>
            </form>
          </div>
          <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
            {[...slack, ...entorno].map((c, i) => (
              <Fila key={i} c={c}  t={t} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">{t("Modelo")}</h2>
          <div className="tarjeta">
            <Fila c={ia}  t={t} />
            <div style={{ borderTop: "1px solid var(--borde)" }}>
              <Fila c={traduccion} t={t} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-2">{t("Últimos avisos enviados")}</h2>
          <div className="tarjeta">
            {envios.length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: "var(--texto-3)" }}>
                {t("Todavía ninguno.")}
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--borde)" }}>
                {envios.map((e) => (
                  <li
                    key={`${e.clave}-${e.fecha}`}
                    className="px-4 py-2 text-sm flex justify-between gap-3"
                    style={{ borderColor: "var(--borde)" }}
                  >
                    <span>{e.clave}</span>
                    <span className="text-xs" style={{ color: "var(--texto-3)" }}>
                      {String(e.fecha).slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
