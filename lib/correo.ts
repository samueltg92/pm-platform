import "server-only";

/**
 * Envío de correo por la API de Resend.
 *
 * Se usa `fetch` contra su endpoint en vez del SDK: es una petición POST con
 * cuatro campos, y no compensa arrastrar un paquete —y sus actualizaciones de
 * seguridad— durante años para eso.
 *
 * El único correo que manda la plataforma hoy es el de recuperar contraseña.
 */

const ENDPOINT = "https://api.resend.com/emails";
const TIEMPO_LIMITE_MS = 10_000;

export type ResultadoCorreo = { ok: true } | { ok: false; error: string };

function remitente(): string | null {
  return process.env.CORREO_DESDE?.trim() || null;
}

/**
 * Si falta la clave, el flujo de recuperación no puede funcionar y conviene
 * saberlo antes de prometerle a alguien un correo que no va a llegar.
 */
export function correoConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && remitente());
}

export async function enviarCorreo({
  para,
  asunto,
  html,
  texto,
}: {
  para: string;
  asunto: string;
  html: string;
  /** Alternativa en texto plano. Sin ella, algunos filtros puntúan peor. */
  texto: string;
}): Promise<ResultadoCorreo> {
  const clave = process.env.RESEND_API_KEY;
  const desde = remitente();

  if (!clave || !desde) {
    return { ok: false, error: "Falta RESEND_API_KEY o CORREO_DESDE" };
  }

  try {
    const respuesta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: desde, to: [para], subject: asunto, html, text: texto }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });

    if (!respuesta.ok) {
      // El cuerpo de Resend explica el motivo real —dominio sin verificar,
      // clave revocada— y sin él el diagnóstico es adivinar.
      const detalle = await respuesta.text().catch(() => "");
      return {
        ok: false,
        error: `Resend respondió ${respuesta.status}${detalle ? `: ${detalle.slice(0, 300)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `No se pudo contactar con Resend: ${motivo}` };
  }
}

/**
 * El correo de recuperación.
 *
 * Sin imágenes, sin rastreo y con la URL a la vista: un correo que pide pulsar
 * un enlace y esconde a dónde lleva se parece demasiado a los que enseñamos a
 * la gente a no abrir. Los estilos van en línea porque los clientes de correo
 * ignoran las hojas de estilo.
 */
export function correoRecuperacion(enlace: string, minutos: number) {
  const asunto = "Restablecer tu contraseña de PM Platform";

  const texto = [
    "Has pedido restablecer tu contraseña de PM Platform.",
    "",
    "Abre este enlace para elegir una nueva:",
    enlace,
    "",
    `El enlace caduca en ${minutos} minutos y solo se puede usar una vez.`,
    "",
    "Si no has sido tú, ignora este correo: tu contraseña no ha cambiado.",
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#1a1d1c;max-width:34rem">
  <p style="margin:0 0 1rem">Has pedido restablecer tu contraseña de <strong>PM&nbsp;Platform</strong>.</p>
  <p style="margin:0 0 1.5rem">
    <a href="${enlace}" style="display:inline-block;background:#1f7a63;color:#fff;text-decoration:none;padding:0.7rem 1.1rem;border-radius:8px;font-weight:600">Elegir una contraseña nueva</a>
  </p>
  <p style="margin:0 0 1rem;color:#5a625f;font-size:13px">
    O copia esta dirección en tu navegador:<br>
    <span style="word-break:break-all;color:#1a1d1c">${enlace}</span>
  </p>
  <p style="margin:0 0 1rem;color:#5a625f;font-size:13px">
    El enlace caduca en ${minutos} minutos y solo se puede usar una vez.
  </p>
  <p style="margin:0;color:#5a625f;font-size:13px">
    Si no has sido tú, ignora este correo: tu contraseña no ha cambiado.
  </p>
</div>`.trim();

  return { asunto, texto, html };
}
