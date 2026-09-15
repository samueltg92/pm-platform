/**
 * Next llama a `register` una vez al arrancar el servidor. Es el sitio para
 * levantar el programador de avisos sin necesitar un proceso aparte ni un cron
 * externo que llame a un endpoint.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { arrancarProgramador } = await import("./lib/slack/programador");
  arrancarProgramador();

  // Va aparte del de Slack: aquel no hace nada si Slack no está configurado,
  // y la traducción no debe depender de eso.
  const { arrancarTraductor } = await import("./lib/traduccion");
  arrancarTraductor();
}
