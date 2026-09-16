"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql, uno, enTransaccion } from "@/lib/db";
import {
  sesionActual,
  exigirEditor,
  exigirAdmin,
  crearSesion,
} from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { guardarDiaMetricas } from "@/lib/metricasGuardar";
import {
  TEMAS,
  IDIOMAS,
  guardarTema,
  guardarIdioma,
} from "@/lib/preferencias";
import { aSegundos } from "@/lib/aht";
import { correoConfigurado, enviarCorreo, correoRecuperacion } from "@/lib/correo";
import {
  LIMITE_BYTES,
  MAX_ARCHIVOS_POR_SUBIDA,
  nombreSeguro,
  tamanoLegible,
} from "@/lib/adjuntos";
import {
  FASES,
  ESTADOS_CLIENTE,
  TIPOS_EVENTO,
  SEVERIDADES,
  TIPOS_HITO,
  ESTADOS_HITO,
  ESTADOS_COMPROMISO,
  LADOS,
  ESTADOS_SEGUIMIENTO,
  ETIQUETA_FASE,
  ESTADOS_RECURSO,
  TIPOS_CONTACTO_AGENTE,
} from "@/lib/dominio";

const texto = z.string().trim().min(1);
const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

/**
 * Teléfono tal como lo escribe la gente: `+57 300 123 4567`, `(601) 555-1234`.
 * Se guarda con su formato —el `+` del indicativo incluido— y solo se valida
 * que tenga sentido: `+` únicamente al principio, separadores habituales y
 * entre 7 y 15 dígitos, el máximo de E.164. La base aplica la misma regla.
 */
function telefonoOpcional(valor: string): string | null {
  const limpio = valor.trim().replace(/\s+/g, " ");
  if (limpio === "") return null;
  const digitos = limpio.replace(/[^0-9]/g, "").length;
  if (!/^\+?[0-9 ().-]+$/.test(limpio) || digitos < 7 || digitos > 15) {
    throw new Error("El teléfono solo admite + al inicio, dígitos, espacios, guiones, puntos y paréntesis, y entre 7 y 15 dígitos.");
  }
  return limpio;
}

function campo(datos: FormData, nombre: string) {
  const valor = datos.get(nombre);
  return typeof valor === "string" ? valor : "";
}




// ---------------------------------------------------------------- equipo

export type ResultadoInvitacion =
  | { ok: true; enlace: string; email: string }
  | { ok: false; error: string }
  | null;

/**
 * Crea una invitación y devuelve su enlace **una sola vez**.
 *
 * En la base solo queda el hash del token, así que ni yo ni nadie con acceso a
 * los datos puede reconstruir un enlace pendiente. Si se pierde, se revoca y se
 * crea otro. El enlace se devuelve en la respuesta y no por la URL, que acaba
 * en historiales y registros del servidor.
 */
export async function crearInvitacion(
  _previo: ResultadoInvitacion,
  datos: FormData,
): Promise<ResultadoInvitacion> {
  try {
    const sesion = await exigirAdmin();

    const v = z
      .object({
        email: z.email("Ese email no es válido"),
        nombre: opcional,
        rol: z.enum(ROLES),
      })
      .parse({
        email: campo(datos, "email").trim().toLowerCase(),
        nombre: campo(datos, "nombre"),
        rol: campo(datos, "rol"),
      });

    const existe = await uno("select 1 from usuario where email = $1", [v.email]);
    if (existe) return { ok: false, error: "Ya hay una cuenta con ese email" };

    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");

    await sql(
      `insert into invitacion (email, nombre, rol, token_hash, creada_por, expira_en)
       values ($1, $2, $3, $4, $5, now() + interval '7 days')`,
      [v.email, v.nombre, v.rol, hash, sesion.id],
    );

    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
    revalidatePath("/equipo");
    return { ok: true, email: v.email, enlace: `${base}/invitacion/${token}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear" };
  }
}

export async function revocarInvitacion(datos: FormData) {
  await exigirAdmin();
  const id = z.uuid().parse(campo(datos, "id"));
  await sql("delete from invitacion where id = $1 and usada_en is null", [id]);
  revalidatePath("/equipo");
}

export async function cambiarRol(datos: FormData) {
  const sesion = await exigirAdmin();
  const id = z.uuid().parse(campo(datos, "id"));
  const rol = z.enum(ROLES).parse(campo(datos, "rol"));

  if (id === sesion.id) {
    throw new Error("No puedes cambiar tu propio rol: pídeselo a otro administrador.");
  }

  await sql("update usuario set rol = $2 where id = $1", [id, rol]);
  revalidatePath("/equipo");
}

export async function cambiarAcceso(datos: FormData) {
  const sesion = await exigirAdmin();
  const id = z.uuid().parse(campo(datos, "id"));
  const activo = campo(datos, "activo") === "1";

  if (id === sesion.id) throw new Error("No puedes desactivar tu propia cuenta.");

  await sql("update usuario set activo = $2 where id = $1", [id, activo]);
  revalidatePath("/equipo");
}

/** Acepta una invitación: crea la cuenta y abre sesión. */
export async function aceptarInvitacion(datos: FormData) {
  const token = campo(datos, "token");
  const nombre = texto.parse(campo(datos, "nombre"));
  const password = campo(datos, "password");
  const repetir = campo(datos, "repetir");

  if (password.length < 10) throw new Error("La contraseña debe tener al menos 10 caracteres");
  if (password !== repetir) throw new Error("Las contraseñas no coinciden");

  const hash = createHash("sha256").update(token).digest("hex");

  const invitacion = await uno<{ id: string; email: string; rol: string }>(
    `select id, email, rol from invitacion
     where token_hash = $1 and usada_en is null and expira_en > now()`,
    [hash],
  );
  if (!invitacion) throw new Error("Esta invitación no es válida o ya caducó");

  const sesion = await enTransaccion(async (q) => {
    const [usuario] = await q<{ id: string; email: string; nombre: string; rol: string }>(
      `insert into usuario (email, nombre, password_hash, rol)
       values ($1, $2, $3, $4)
       returning id, email, nombre, rol`,
      [invitacion.email, nombre, await bcrypt.hash(password, 12), invitacion.rol],
    );

    await q(
      "update invitacion set usada_en = now(), usuario_id = $2 where id = $1",
      [invitacion.id, usuario.id],
    );

    return usuario;
  });

  await crearSesion({
    id: sesion.id,
    email: sesion.email,
    nombre: sesion.nombre,
    rol: sesion.rol as never,
  });

  redirect("/");
}

// ---------------------------------------------------------------- preferencias

export async function cambiarTema(datos: FormData) {
  const tema = z.enum(TEMAS).parse(campo(datos, "tema"));
  await guardarTema(tema);
  revalidatePath("/", "layout");
}

export async function cambiarIdioma(datos: FormData) {
  const idioma = z.enum(IDIOMAS).parse(campo(datos, "idioma"));
  await guardarIdioma(idioma);
  revalidatePath("/", "layout");
}

export async function enviarGuiaSlack() {
  await exigirEditor();
  const { slackConfigurado } = await import("@/lib/slack/cliente");
  if (!slackConfigurado()) throw new Error("Slack no está configurado");

  const { publicarAyuda } = await import("@/lib/slack/ayuda");
  await publicarAyuda();
}

// ---------------------------------------------------------------- cuenta

export async function cambiarPassword(datos: FormData) {
  const sesion = await sesionActual();
  if (!sesion) throw new Error("Sesión no válida");

  const actual = campo(datos, "actual");
  const nueva = campo(datos, "nueva");
  const repetir = campo(datos, "repetir");

  if (nueva.length < 10) {
    throw new Error("La contraseña nueva debe tener al menos 10 caracteres");
  }
  if (nueva !== repetir) {
    throw new Error("La contraseña nueva y su repetición no coinciden");
  }

  // Se pide la actual aunque ya haya sesión: si alguien se sienta en tu
  // portátil con la sesión abierta, no debería poder dejarte fuera.
  const usuario = await uno<{ password_hash: string }>(
    "select password_hash from usuario where id = $1",
    [sesion.id],
  );
  if (!usuario || !(await bcrypt.compare(actual, usuario.password_hash))) {
    throw new Error("La contraseña actual no es correcta");
  }

  await sql("update usuario set password_hash = $2 where id = $1", [
    sesion.id,
    await bcrypt.hash(nueva, 12),
  ]);
}

// ---------------------------------------------------------------- clientes

const EsquemaCliente = z.object({
  nombre: texto,
  partner_id: opcional,
  fase: z.enum(FASES),
  estado: z.enum(ESTADOS_CLIENTE),
  owner_interno: opcional,
  descripcion: opcional,
});

export async function crearCliente(datos: FormData) {
  await exigirEditor();
  const v = EsquemaCliente.parse({
    nombre: campo(datos, "nombre"),
    partner_id: campo(datos, "partner_id"),
    fase: campo(datos, "fase"),
    estado: campo(datos, "estado") || "activo",
    owner_interno: campo(datos, "owner_interno"),
    descripcion: campo(datos, "descripcion"),
  });

  const creado = await uno<{ id: string }>(
    `insert into cliente (nombre, partner_id, fase, estado, owner_interno, descripcion)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [v.nombre, v.partner_id, v.fase, v.estado, v.owner_interno, v.descripcion],
  );

  revalidatePath("/clientes");
  redirect(`/clientes/${creado!.id}`);
}

export async function actualizarCliente(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const v = EsquemaCliente.parse({
    nombre: campo(datos, "nombre"),
    partner_id: campo(datos, "partner_id"),
    fase: campo(datos, "fase"),
    estado: campo(datos, "estado"),
    owner_interno: campo(datos, "owner_interno"),
    descripcion: campo(datos, "descripcion"),
  });

  await enTransaccion(async (q) => {
    const [previo] = await q<{ fase: keyof typeof ETIQUETA_FASE }>(
      "select fase from cliente where id = $1 for update",
      [id],
    );

    await q(
      `update cliente
       set nombre = $2, partner_id = $3, fase = $4, estado = $5,
           owner_interno = $6, descripcion = $7, actualizado_en = now()
       where id = $1`,
      [id, v.nombre, v.partner_id, v.fase, v.estado, v.owner_interno, v.descripcion],
    );

    // El cambio de fase queda en el timeline: es información de producto, no metadata.
    if (previo && previo.fase !== v.fase) {
      await q(
        `insert into evento (cliente_id, tipo, titulo, cuerpo, severidad, origen)
         values ($1, 'cambio_fase', $2, null, 'info', 'app')`,
        [id, `Pasa de ${ETIQUETA_FASE[previo.fase]} a ${ETIQUETA_FASE[v.fase]}`],
      );
    }
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function archivarCliente(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const archivar = campo(datos, "archivar") === "1";
  await sql("update cliente set archivado = $2, actualizado_en = now() where id = $1", [
    id,
    archivar,
  ]);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function borrarLineaBase(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from linea_base where id = $1", [clienteId]);
  revalidatePath(`/clientes/${clienteId}/metricas`);
}

/**
 * Borrado definitivo de un cliente, con todo lo que cuelga de él.
 *
 * Se exige escribir el nombre exacto y no basta con confirmar: archivar ya
 * cubre el caso de "no quiero verlo más", así que quien llega aquí quiere
 * destruir datos y debe demostrarlo.
 */
export async function borrarCliente(datos: FormData) {
  await exigirAdmin();
  const id = z.uuid().parse(campo(datos, "id"));
  const confirmacion = campo(datos, "confirmacion").trim();

  const cliente = await uno<{ nombre: string }>(
    "select nombre from cliente where id = $1",
    [id],
  );
  if (!cliente) throw new Error("Cliente no encontrado");

  if (confirmacion !== cliente.nombre) {
    throw new Error(
      `Para borrarlo, escribe exactamente su nombre: ${cliente.nombre}`,
    );
  }

  await sql("delete from cliente where id = $1", [id]);

  revalidatePath("/clientes");
  revalidatePath("/", "layout");
  redirect("/clientes");
}

// ---------------------------------------------------------------- eventos

const EsquemaEvento = z.object({
  cliente_id: z.uuid(),
  tipo: z.enum(TIPOS_EVENTO),
  titulo: texto,
  cuerpo: opcional,
  fecha_evento: fecha,
  severidad: z.enum(SEVERIDADES),
});

export async function crearEvento(datos: FormData) {
  await exigirEditor();
  const v = EsquemaEvento.parse({
    cliente_id: campo(datos, "cliente_id"),
    tipo: campo(datos, "tipo"),
    titulo: campo(datos, "titulo"),
    cuerpo: campo(datos, "cuerpo"),
    fecha_evento: campo(datos, "fecha_evento"),
    severidad: campo(datos, "severidad") || "info",
  });

  // El tipo dice qué clase de cosa es; el seguimiento, si sigue viva. Son ejes
  // distintos: un despliegue pendiente de coordinar con el cliente necesita
  // seguimiento, y una incidencia ya resuelta al registrarla no.
  const seguir = campo(datos, "seguir") === "si";
  const creado = await uno<{ id: string }>(
    `insert into evento (cliente_id, tipo, titulo, cuerpo, fecha_evento, severidad,
                         estado_seguimiento, origen)
     values ($1, $2, $3, $4, $5, $6, $7, 'app')
     returning id`,
    [
      v.cliente_id,
      v.tipo,
      v.titulo,
      v.cuerpo,
      v.fecha_evento,
      v.severidad,
      seguir ? "abierto" : null,
    ],
  );

  await guardarArchivos(creado!.id, datos.getAll("archivos") as File[]);

  revalidatePath(`/clientes/${v.cliente_id}/timeline`);
  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/");

  // Desde el registro rápido se lleva al usuario al cliente, para que vea
  // dónde aterrizó lo que acaba de escribir.
  if (campo(datos, "redirigir") === "1") {
    redirect(`/clientes/${v.cliente_id}/timeline`);
  }
}

/**
 * Añade una actualización al hilo de un evento y, si se indica, cambia su
 * estado. El estado anterior queda registrado en la propia actualización, así
 * que el hilo se lee como una historia: qué se supo, cuándo, y qué cambió.
 */
export async function actualizarEvento(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      evento_id: z.uuid(),
      cliente_id: z.uuid(),
      cuerpo: texto,
      estado_nuevo: z.enum(ESTADOS_SEGUIMIENTO).nullable(),
    })
    .parse({
      evento_id: campo(datos, "evento_id"),
      cliente_id: campo(datos, "cliente_id"),
      cuerpo: campo(datos, "cuerpo"),
      estado_nuevo: campo(datos, "estado_nuevo") || null,
    });

  await enTransaccion(async (q) => {
    const [evento] = await q<{ estado_seguimiento: string | null }>(
      "select estado_seguimiento from evento where id = $1 for update",
      [v.evento_id],
    );
    if (!evento) throw new Error("Evento no encontrado");

    const anterior = evento.estado_seguimiento;
    const cambia = v.estado_nuevo !== null && v.estado_nuevo !== anterior;

    await q(
      `insert into evento_actualizacion
         (evento_id, cuerpo, estado_anterior, estado_nuevo, origen)
       values ($1, $2, $3, $4, 'app')`,
      [v.evento_id, v.cuerpo, anterior, cambia ? v.estado_nuevo : null],
    );

    if (cambia) {
      await q("update evento set estado_seguimiento = $2 where id = $1", [
        v.evento_id,
        v.estado_nuevo,
      ]);
    }
  });

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/");
}

/** Abre el seguimiento de un evento que se registró sin él. */
export async function activarSeguimiento(datos: FormData) {
  await exigirEditor();
  const eventoId = z.uuid().parse(campo(datos, "evento_id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));

  await sql(
    `update evento set estado_seguimiento = 'abierto'
     where id = $1 and estado_seguimiento is null`,
    [eventoId],
  );

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
}

export async function borrarEvento(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from evento where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}`);
}


// ---------------------------------------------------------------- adjuntos

/**
 * Guarda los archivos de un FormData contra un evento. El límite se comprueba
 * aquí y no solo en el navegador: el input `accept` y el tamaño son una ayuda
 * de interfaz, no una garantía.
 */
async function guardarArchivos(eventoId: string, archivos: File[]) {
  const validos = archivos.filter((a) => a.size > 0);
  if (validos.length === 0) return;

  if (validos.length > MAX_ARCHIVOS_POR_SUBIDA) {
    throw new Error(`Máximo ${MAX_ARCHIVOS_POR_SUBIDA} archivos por vez`);
  }

  for (const archivo of validos) {
    if (archivo.size > LIMITE_BYTES) {
      throw new Error(
        `"${archivo.name}" pesa ${tamanoLegible(archivo.size)} y el límite es ` +
          `${tamanoLegible(LIMITE_BYTES)}`,
      );
    }
  }

  for (const archivo of validos) {
    const contenido = Buffer.from(await archivo.arrayBuffer());
    await sql(
      `insert into adjunto (evento_id, nombre, tipo_mime, tamano_bytes, contenido)
       values ($1, $2, $3, $4, $5)`,
      [
        eventoId,
        nombreSeguro(archivo.name),
        archivo.type || "application/octet-stream",
        archivo.size,
        contenido,
      ],
    );
  }
}

export async function subirAdjunto(datos: FormData) {
  await exigirEditor();
  const eventoId = z.uuid().parse(campo(datos, "evento_id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));

  await guardarArchivos(eventoId, datos.getAll("archivos") as File[]);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
}

export async function borrarAdjunto(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));

  await sql("delete from adjunto where id = $1", [id]);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
}


// ---------------------------------------------------------------- edición

export async function editarEvento(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      tipo: z.enum(TIPOS_EVENTO),
      titulo: texto,
      cuerpo: opcional,
      fecha_evento: fecha,
      severidad: z.enum(SEVERIDADES),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      tipo: campo(datos, "tipo"),
      titulo: campo(datos, "titulo"),
      cuerpo: campo(datos, "cuerpo"),
      fecha_evento: campo(datos, "fecha_evento"),
      severidad: campo(datos, "severidad"),
    });

  await sql(
    `update evento set tipo = $2, titulo = $3, cuerpo = $4,
                       fecha_evento = $5, severidad = $6
     where id = $1`,
    [v.id, v.tipo, v.titulo, v.cuerpo, v.fecha_evento, v.severidad],
  );

  revalidatePath(`/clientes/${v.cliente_id}/timeline`);
  revalidatePath("/");
}

export async function borrarActualizacion(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from evento_actualizacion where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}/timeline`);
}

export async function editarHito(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      tipo: z.enum(TIPOS_HITO),
      titulo: texto,
      notas: opcional,
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      tipo: campo(datos, "tipo"),
      titulo: campo(datos, "titulo"),
      notas: campo(datos, "notas"),
    });

  // La fecha no se toca aquí a propósito: moverla exige un motivo y va por
  // moverFechaHito, que deja rastro.
  await sql("update hito set tipo = $2, titulo = $3, notas = $4 where id = $1", [
    v.id,
    v.tipo,
    v.titulo,
    v.notas,
  ]);

  revalidatePath(`/clientes/${v.cliente_id}/hitos`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

export async function borrarHito(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from hito where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}/hitos`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

export async function editarCompromiso(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      descripcion: texto,
      lado: z.enum(LADOS),
      responsable_id: opcional,
      fecha_limite: z
        .string()
        .transform((s) => (s.trim() === "" ? null : s.trim()))
        .nullable()
        .refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), "Fecha inválida"),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      descripcion: campo(datos, "descripcion"),
      lado: campo(datos, "lado"),
      responsable_id: campo(datos, "responsable_id"),
      fecha_limite: campo(datos, "fecha_limite"),
    });

  await sql(
    `update compromiso set descripcion = $2, lado = $3, responsable_id = $4, fecha_limite = $5
     where id = $1`,
    [v.id, v.descripcion, v.lado, v.responsable_id, v.fecha_limite],
  );

  revalidatePath(`/clientes/${v.cliente_id}/compromisos`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}

export async function borrarCompromiso(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from compromiso where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}/compromisos`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}

export async function editarContacto(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      nombre: texto,
      rol: opcional,
      lado: z.enum(LADOS),
      email: opcional,
      telefono: z.string().transform(telefonoOpcional),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      nombre: campo(datos, "nombre"),
      rol: campo(datos, "rol"),
      lado: campo(datos, "lado"),
      email: campo(datos, "email"),
      telefono: campo(datos, "telefono"),
    });

  await sql(
    "update contacto set nombre = $2, rol = $3, lado = $4, email = $5, telefono = $6 where id = $1",
    [v.id, v.nombre, v.rol, v.lado, v.email, v.telefono],
  );

  // Los contactos viven en la pestaña Información: refrescar la ruta vieja
  // /contactos, que ahora es una redirección, dejaba la ficha sin actualizar.
  revalidatePath(`/clientes/${v.cliente_id}`, "layout");
  revalidatePath("/contactos");
}

export async function borrarMetricaDia(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const dia = fecha.parse(campo(datos, "fecha"));
  await sql("delete from metrica_dia where cliente_id = $1 and fecha = $2", [clienteId, dia]);
  revalidatePath("/metricas");
}

// ---------------------------------------------------------------- hitos

export async function crearHito(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      cliente_id: z.uuid(),
      tipo: z.enum(TIPOS_HITO),
      titulo: texto,
      fecha_objetivo: fecha,
      notas: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      tipo: campo(datos, "tipo"),
      titulo: campo(datos, "titulo"),
      fecha_objetivo: campo(datos, "fecha_objetivo"),
      notas: campo(datos, "notas"),
    });

  await sql(
    `insert into hito (cliente_id, tipo, titulo, fecha_objetivo, notas)
     values ($1, $2, $3, $4, $5)`,
    [v.cliente_id, v.tipo, v.titulo, v.fecha_objetivo, v.notas],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

/**
 * Mover una fecha exige un motivo y deja rastro. Es lo que después permite
 * responder "esta salida se ha movido tres veces y siempre por lo mismo".
 */
export async function moverFechaHito(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      fecha_nueva: fecha,
      motivo: texto,
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      fecha_nueva: campo(datos, "fecha_nueva"),
      motivo: campo(datos, "motivo"),
    });

  await enTransaccion(async (q) => {
    const [hito] = await q<{ fecha_objetivo: Date; titulo: string }>(
      "select fecha_objetivo, titulo from hito where id = $1 for update",
      [v.id],
    );
    if (!hito) throw new Error("Hito no encontrado");

    const anterior =
      typeof hito.fecha_objetivo === "string"
        ? (hito.fecha_objetivo as string).slice(0, 10)
        : hito.fecha_objetivo.toISOString().slice(0, 10);

    if (anterior === v.fecha_nueva) return;

    await q("update hito set fecha_objetivo = $2 where id = $1", [v.id, v.fecha_nueva]);
    await q(
      `insert into hito_cambio_fecha (hito_id, fecha_anterior, fecha_nueva, motivo)
       values ($1, $2, $3, $4)`,
      [v.id, anterior, v.fecha_nueva, v.motivo],
    );
  });

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

export async function cambiarEstadoHito(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      estado: z.enum(ESTADOS_HITO),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      estado: campo(datos, "estado"),
    });

  await sql("update hito set estado = $2 where id = $1", [v.id, v.estado]);
  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/hitos");
  revalidatePath("/");
}

// ---------------------------------------------------------------- compromisos

export async function crearCompromiso(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      cliente_id: z.uuid(),
      descripcion: texto,
      lado: z.enum(LADOS),
      fecha_limite: z
        .string()
        .transform((s) => (s.trim() === "" ? null : s.trim()))
        .nullable()
        .refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), "Fecha inválida"),
      responsable_id: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      descripcion: campo(datos, "descripcion"),
      lado: campo(datos, "lado") || "interno",
      fecha_limite: campo(datos, "fecha_limite"),
      responsable_id: campo(datos, "responsable_id"),
    });

  await sql(
    `insert into compromiso (cliente_id, descripcion, lado, fecha_limite, responsable_id)
     values ($1, $2, $3, $4, $5)`,
    [v.cliente_id, v.descripcion, v.lado, v.fecha_limite, v.responsable_id],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}

export async function cambiarEstadoCompromiso(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      id: z.uuid(),
      cliente_id: z.uuid(),
      estado: z.enum(ESTADOS_COMPROMISO),
    })
    .parse({
      id: campo(datos, "id"),
      cliente_id: campo(datos, "cliente_id"),
      estado: campo(datos, "estado"),
    });

  await sql(
    `update compromiso
     set estado = $2,
         cerrado_en = case when $2 in ('cumplido','cancelado') then now() else null end
     where id = $1`,
    [v.id, v.estado],
  );

  revalidatePath(`/clientes/${v.cliente_id}`);
  revalidatePath("/compromisos");
  revalidatePath("/");
}


// ---------------------------------------------------------------- métricas

const numero = (valor: string, campoNombre: string, max?: number) => {
  const limpio = valor.trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${campoNombre}: "${valor}" no es un número válido`);
  }
  if (max !== undefined && n > max) {
    throw new Error(`${campoNombre}: ${n} está fuera de rango (máximo ${max})`);
  }
  return n;
};

/**
 * Guarda de una vez el día completo: una fila por cliente en producción.
 *
 * Un cliente se salta si no trae ningún número y no está marcado como sin
 * actividad. Eso permite registrar cuatro clientes hoy y el quinto mañana sin
 * que la fila a medias ensucie los promedios.
 */
export async function guardarMetricasDia(datos: FormData) {
  await exigirEditor();
  const fechaDia = fecha.parse(campo(datos, "fecha"));
  const ids = datos.getAll("cliente_id").map((v) => z.uuid().parse(String(v)));

  const entradas = ids.map((id) => ({
    clienteId: id,
    llamadas: numero(campo(datos, `llamadas_${id}`), "Llamadas"),
    minutos: numero(campo(datos, `minutos_${id}`), "Minutos"),
    contencion: numero(campo(datos, `contencion_${id}`), "Contención", 100),
    sinActividad: campo(datos, `sin_actividad_${id}`) === "on",
    notas: campo(datos, `notas_${id}`).trim() || null,
  }));

  await guardarDiaMetricas(fechaDia, entradas);

  revalidatePath("/metricas");
  revalidatePath("/clientes");
}

export async function guardarMetricaMes(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const mes = campo(datos, "periodo"); // 'YYYY-MM' del input type=month
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mes inválido");
  const periodo = `${mes}-01`;

  const llamadas = numero(campo(datos, "llamadas_totales"), "Llamadas");
  const minutos = numero(campo(datos, "duracion_total_min"), "Minutos");
  const contencion = numero(campo(datos, "contencion_pct"), "Contención", 100);
  const notas = campo(datos, "notas").trim() || null;

  if (llamadas === null && minutos === null && contencion === null) {
    await sql("delete from metrica_mes where cliente_id = $1 and periodo = $2", [
      clienteId,
      periodo,
    ]);
  } else {
    await sql(
      `insert into metrica_mes
         (cliente_id, periodo, llamadas_totales, duracion_total_min, contencion_pct, notas)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (cliente_id, periodo) do update set
         llamadas_totales   = excluded.llamadas_totales,
         duracion_total_min = excluded.duracion_total_min,
         contencion_pct     = excluded.contencion_pct,
         notas              = excluded.notas`,
      [clienteId, periodo, llamadas, minutos, contencion, notas],
    );
  }

  revalidatePath(`/clientes/${clienteId}`);
}

export async function borrarMetricaMes(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from metrica_mes where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}`);
}


// ---------------------------------------------------------------- línea base

const CAMPOS_BASE = [
  ["volumen_mensual_promedio", "volumen mensual"],
  ["aht_promedio_seg", "AHT"],
  ["concurrencia_promedio", "concurrencia promedio"],
  ["concurrencia_maxima", "concurrencia máxima"],
  ["meta_contencion_pct", "meta de contención"],
] as const;

/**
 * Guarda los supuestos que entregó el partner. Si cambian valores que ya
 * existían, queda un evento en el timeline: que TP revise el forecast a mitad
 * de proyecto es información de producto, no una corrección silenciosa.
 */
export async function guardarLineaBase(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));

  const valores = {
    volumen_mensual_promedio: numero(campo(datos, "volumen_mensual_promedio"), "Volumen"),
    aht_promedio_seg: aSegundos(campo(datos, "aht_promedio_seg")),
    concurrencia_promedio: numero(campo(datos, "concurrencia_promedio"), "Concurrencia"),
    concurrencia_maxima: numero(campo(datos, "concurrencia_maxima"), "Concurrencia máxima"),
    meta_contencion_pct: numero(campo(datos, "meta_contencion_pct"), "Contención", 100),
    horario_operativo: campo(datos, "horario_operativo").trim() || null,
    entregado_por: campo(datos, "entregado_por").trim() || null,
    fecha_entrega: campo(datos, "fecha_entrega").trim() || null,
    notas: campo(datos, "notas").trim() || null,
  };

  await enTransaccion(async (q) => {
    const [previo] = await q<Record<string, number | string | null>>(
      "select * from linea_base where id = $1 for update",
      [clienteId],
    );

    await q(
      `insert into linea_base
         (id, volumen_mensual_promedio, aht_promedio_seg, concurrencia_promedio,
          concurrencia_maxima, meta_contencion_pct, horario_operativo,
          entregado_por, fecha_entrega, notas)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (id) do update set
         volumen_mensual_promedio = excluded.volumen_mensual_promedio,
         aht_promedio_seg         = excluded.aht_promedio_seg,
         concurrencia_promedio    = excluded.concurrencia_promedio,
         concurrencia_maxima      = excluded.concurrencia_maxima,
         meta_contencion_pct      = excluded.meta_contencion_pct,
         horario_operativo        = excluded.horario_operativo,
         entregado_por            = excluded.entregado_por,
         fecha_entrega            = excluded.fecha_entrega,
         notas                    = excluded.notas,
         actualizado_en           = now()`,
      [
        clienteId,
        valores.volumen_mensual_promedio,
        valores.aht_promedio_seg,
        valores.concurrencia_promedio,
        valores.concurrencia_maxima,
        valores.meta_contencion_pct,
        valores.horario_operativo,
        valores.entregado_por,
        valores.fecha_entrega,
        valores.notas,
      ],
    );

    if (!previo) return;

    const cambios = CAMPOS_BASE.filter(([clave]) => {
      const antes = previo[clave];
      const ahora = valores[clave];
      if (antes === null || antes === undefined) return false;
      return Number(antes) !== Number(ahora);
    }).map(([clave, etiqueta]) => `${etiqueta}: ${previo[clave]} → ${valores[clave] ?? "—"}`);

    if (cambios.length > 0) {
      await q(
        `insert into evento (cliente_id, tipo, titulo, cuerpo, severidad, origen)
         values ($1, 'cambio_scope', $2, $3, 'media', 'app')`,
        [clienteId, "Cambia la línea base entregada por el partner", cambios.join("\n")],
      );
    }
  });

  revalidatePath(`/clientes/${clienteId}/metricas`);
  revalidatePath(`/clientes/${clienteId}`);
}

export async function guardarObjetivoMes(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const periodo = fecha.parse(campo(datos, "periodo"));
  const llamadas = numero(campo(datos, "llamadas_comprometidas"), "Llamadas");
  const minutos = numero(campo(datos, "minutos_comprometidos"), "Minutos");

  if (llamadas === null && minutos === null) {
    await sql("delete from objetivo_mes where cliente_id = $1 and periodo = $2", [
      clienteId,
      periodo,
    ]);
  } else {
    await sql(
      `insert into objetivo_mes
         (cliente_id, periodo, llamadas_comprometidas, minutos_comprometidos)
       values ($1, $2, $3, $4)
       on conflict (cliente_id, periodo) do update set
         llamadas_comprometidas = excluded.llamadas_comprometidas,
         minutos_comprometidos  = excluded.minutos_comprometidos`,
      [clienteId, periodo, llamadas, minutos],
    );
  }

  revalidatePath(`/clientes/${clienteId}`);
}

// ---------------------------------------------------------------- contactos

export async function crearContacto(datos: FormData) {
  await exigirEditor();
  const v = z
    .object({
      cliente_id: z.uuid(),
      nombre: texto,
      rol: opcional,
      lado: z.enum(LADOS),
      email: opcional,
      telefono: z.string().transform(telefonoOpcional),
      notas: opcional,
    })
    .parse({
      cliente_id: campo(datos, "cliente_id"),
      nombre: campo(datos, "nombre"),
      rol: campo(datos, "rol"),
      lado: campo(datos, "lado") || "cliente",
      email: campo(datos, "email"),
      telefono: campo(datos, "telefono"),
      notas: campo(datos, "notas"),
    });

  await sql(
    `insert into contacto (cliente_id, nombre, rol, lado, email, telefono, notas)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [v.cliente_id, v.nombre, v.rol, v.lado, v.email, v.telefono, v.notas],
  );

  revalidatePath(`/clientes/${v.cliente_id}`, "layout");
  revalidatePath("/contactos");
}

export async function borrarContacto(datos: FormData) {
  await exigirEditor();
  const id = z.uuid().parse(campo(datos, "id"));
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  await sql("delete from contacto where id = $1", [id]);
  revalidatePath(`/clientes/${clienteId}`);
}

// ------------------------------------------------------------- inventario

/**
 * Las tablas de inventario son planas y todas se guardan igual: un puñado de
 * campos de texto, un estado y un cliente. En vez de escribir seis acciones
 * casi idénticas, se declara qué columnas tiene cada tabla y se generan.
 *
 * `id` vacío significa alta; con `id` es edición. Es el mismo formulario en los
 * dos casos, así que distinguirlo aquí evita duplicar el modal.
 */
const COLUMNAS_INVENTARIO = {
  servidor_app: [
    "ambiente", "server_name", "app_origen", "host_origen", "ip_origen",
    "tipo_comunicacion", "protocolo", "puerto", "destino", "app_destino",
    "host_destino", "cloud_provider", "servicio", "owner_tecnico", "notas",
  ],
  sip_trunk: [
    "trunk_name", "did", "vdn_desborde", "sbc", "tp_ip", "agent_ip", "puerto",
    "transporte", "codec", "transfer_destino", "notas",
  ],
  stack_item: [
    "categoria", "proveedor", "modelo", "version", "notas",
  ],
  integracion_externa: [
    "sistema", "tipo", "usuario", "metodo", "autenticacion", "puerto",
    "ambiente", "criticidad", "owner", "notas",
  ],
} as const;

type TablaInventario = keyof typeof COLUMNAS_INVENTARIO;

async function guardarFila(tabla: TablaInventario, datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const id = campo(datos, "id").trim();
  const estado = z.enum(ESTADOS_RECURSO).parse(campo(datos, "estado") || "activo");
  const columnas = COLUMNAS_INVENTARIO[tabla];
  const valores = columnas.map((c) => opcional.parse(campo(datos, c)));

  if (id) {
    const asignaciones = columnas.map((c, i) => `${c} = $${i + 3}`).join(", ");
    await sql(
      `update ${tabla} set ${asignaciones}, estado = $${columnas.length + 3}
       where id = $1 and cliente_id = $2`,
      [z.uuid().parse(id), clienteId, ...valores, estado],
    );
  } else {
    const huecos = columnas.map((_, i) => `$${i + 2}`).join(", ");
    await sql(
      `insert into ${tabla} (cliente_id, ${columnas.join(", ")}, estado)
       values ($1, ${huecos}, $${columnas.length + 2})`,
      [clienteId, ...valores, estado],
    );
  }

  revalidatePath(`/clientes/${clienteId}/info`);
}

async function borrarFila(tabla: TablaInventario, datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const id = z.uuid().parse(campo(datos, "id"));

  // El cliente va en el WHERE aunque el id ya sea único: así un id de otro
  // proyecto no borra nada, en vez de borrar lo que no era.
  await sql(`delete from ${tabla} where id = $1 and cliente_id = $2`, [id, clienteId]);
  revalidatePath(`/clientes/${clienteId}/info`);
}

export async function guardarServidor(datos: FormData) {
  await guardarFila("servidor_app", datos);
}
export async function borrarServidor(datos: FormData) {
  await borrarFila("servidor_app", datos);
}
export async function guardarSip(datos: FormData) {
  await guardarFila("sip_trunk", datos);
}
export async function borrarSip(datos: FormData) {
  await borrarFila("sip_trunk", datos);
}
export async function guardarIntegracion(datos: FormData) {
  await guardarFila("integracion_externa", datos);
}
export async function borrarIntegracion(datos: FormData) {
  await borrarFila("integracion_externa", datos);
}

export async function guardarStack(datos: FormData) {
  await guardarFila("stack_item", datos);
}
export async function borrarStack(datos: FormData) {
  await borrarFila("stack_item", datos);
}

export async function guardarFicha(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const v = z
    .object({
      codigo: opcional,
      caso_uso: opcional,
      proceso: opcional,
      contact_type: z.enum(TIPOS_CONTACTO_AGENTE).nullable(),
      ambiente: opcional,
      pais: opcional,
      observaciones: opcional,
    })
    .parse({
      codigo: campo(datos, "codigo"),
      caso_uso: campo(datos, "caso_uso"),
      proceso: campo(datos, "proceso"),
      contact_type: campo(datos, "contact_type") || null,
      ambiente: campo(datos, "ambiente"),
      pais: campo(datos, "pais"),
      observaciones: campo(datos, "observaciones"),
    });

  await sql(
    `insert into ficha_proyecto
       (id, codigo, caso_uso, proceso, contact_type, ambiente, pais, observaciones)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do update set
       codigo = excluded.codigo,
       caso_uso = excluded.caso_uso,
       proceso = excluded.proceso,
       contact_type = excluded.contact_type,
       ambiente = excluded.ambiente,
       pais = excluded.pais,
       observaciones = excluded.observaciones,
       actualizado_en = now()`,
    [
      clienteId, v.codigo, v.caso_uso, v.proceso, v.contact_type,
      v.ambiente, v.pais, v.observaciones,
    ],
  );

  revalidatePath(`/clientes/${clienteId}/info`);
}

// -------------------------------------------------- recuperar la contraseña

/** Una hora. Un reset se usa al recibirlo; lo que sobra es ventana de ataque. */
const MINUTOS_RESET = 60;

/** Peticiones por cuenta y hora, para que el buzón de alguien no sea un arma. */
const MAX_PETICIONES_POR_HORA = 3;

export type ResultadoReset = { ok: boolean; mensaje: string } | null;

/**
 * Pide un enlace de recuperación.
 *
 * La respuesta es **siempre la misma**, exista o no la cuenta: si dijera "ese
 * email no está registrado", cualquiera podría usar este formulario para
 * averiguar quién tiene cuenta. Los fallos reales de envío se registran en el
 * servidor, donde los ve quien opera y no quien pregunta.
 */
export async function solicitarReset(
  _previo: ResultadoReset,
  datos: FormData,
): Promise<ResultadoReset> {
  const generico =
    "Si hay una cuenta con ese correo, te acabamos de enviar un enlace. Revisa tu bandeja y la carpeta de spam.";

  // Que falte la configuración no depende del email que escriban, así que
  // decirlo no filtra nada — y calla el "revisa tu bandeja" que sería mentira.
  if (!correoConfigurado()) {
    return {
      ok: false,
      mensaje:
        "El envío de correo no está configurado todavía. Avisa a quien administra la plataforma.",
    };
  }

  const email = campo(datos, "email").trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    return { ok: false, mensaje: "Ese correo no es válido." };
  }

  const usuario = await uno<{ id: string; email: string; nombre: string }>(
    "select id, email, nombre from usuario where email = $1 and activo",
    [email],
  );

  if (usuario) {
    const [{ recientes }] = await sql<{ recientes: number }>(
      `select count(*)::int as recientes from reset_password
       where usuario_id = $1 and creada_en > now() - interval '1 hour'`,
      [usuario.id],
    );

    if (recientes >= MAX_PETICIONES_POR_HORA) {
      // Se corta en silencio: decir "demasiados intentos" confirmaría que la
      // cuenta existe, que es justo lo que el mensaje genérico oculta.
      console.warn(`[reset] límite por hora alcanzado para ${usuario.email}`);
      return { ok: true, mensaje: generico };
    }

    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");

    await enTransaccion(async (q) => {
      // Pedir uno nuevo invalida los anteriores: si no, el enlace de un correo
      // viejo seguiría sirviendo tanto como el recién pedido.
      await q(
        "update reset_password set usada_en = now() where usuario_id = $1 and usada_en is null",
        [usuario.id],
      );
      await q(
        `insert into reset_password (usuario_id, token_hash, expira_en)
         values ($1, $2, now() + make_interval(mins => $3))`,
        [usuario.id, hash, MINUTOS_RESET],
      );
    });

    const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
    const { asunto, html, texto } = correoRecuperacion(
      `${base}/restablecer/${token}`,
      MINUTOS_RESET,
    );

    const envio = await enviarCorreo({ para: usuario.email, asunto, html, texto });
    if (!envio.ok) {
      console.error(`[reset] no se pudo enviar a ${usuario.email}: ${envio.error}`);
    }
  }

  return { ok: true, mensaje: generico };
}

/** Devuelve el usuario si el token sirve; null si no. No consume el token. */
export async function usuarioDeTokenReset(token: string) {
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  return uno<{ id: string; email: string; nombre: string }>(
    `select u.id, u.email, u.nombre
     from reset_password r
     join usuario u on u.id = r.usuario_id
     where r.token_hash = $1 and r.usada_en is null and r.expira_en > now() and u.activo`,
    [hash],
  );
}

export async function restablecerPassword(datos: FormData) {
  const token = campo(datos, "token");
  const nueva = campo(datos, "password");
  const repetir = campo(datos, "repetir");

  if (nueva.length < 10) {
    throw new Error("La contraseña debe tener al menos 10 caracteres");
  }
  if (nueva !== repetir) {
    throw new Error("Las contraseñas no coinciden");
  }

  const hashToken = createHash("sha256").update(token).digest("hex");

  const sesion = await enTransaccion(async (q) => {
    // `for update` sobre la fila del token: dos envíos simultáneos del mismo
    // formulario no pueden gastarlo dos veces.
    const [fila] = await q<{ id: string; usuario_id: string }>(
      `select r.id, r.usuario_id from reset_password r
       join usuario u on u.id = r.usuario_id
       where r.token_hash = $1 and r.usada_en is null and r.expira_en > now() and u.activo
       for update of r`,
      [hashToken],
    );
    if (!fila) throw new Error("Este enlace ya se usó o caducó. Pide otro desde el login.");

    await q("update reset_password set usada_en = now() where id = $1", [fila.id]);

    // `sesiones_desde` tumba las sesiones abiertas antes de ahora mismo. Si se
    // restablece la clave porque alguien entró, esa sesión suya muere aquí.
    const [usuario] = await q<{
      id: string;
      email: string;
      nombre: string;
      rol: string;
    }>(
      `update usuario
         set password_hash = $2, sesiones_desde = now()
       where id = $1
       returning id, email, nombre, rol`,
      [fila.usuario_id, await bcrypt.hash(nueva, 12)],
    );

    return usuario;
  });

  await crearSesion({
    id: sesion.id,
    email: sesion.email,
    nombre: sesion.nombre,
    rol: sesion.rol as never,
  });

  redirect("/");
}

// -------------------------------------------------- reutilizar contactos

/**
 * Añade a un proyecto personas que ya existen en otros.
 *
 * Se copian sus datos en vez de compartir una sola fila: el rol de una persona
 * cambia de un proyecto a otro, y los compromisos apuntan a su contacto dentro
 * del proyecto. De cada persona se toma, campo a campo, el dato más reciente
 * que tenga en cualquier proyecto. Quien ya está en este proyecto se salta, así
 * que repetir la acción no duplica a nadie.
 */
export async function reutilizarContactos(datos: FormData) {
  await exigirEditor();
  const clienteId = z.uuid().parse(campo(datos, "cliente_id"));
  const ids = z
    .array(z.uuid())
    .max(200)
    .parse(datos.getAll("contacto_id").filter((v): v is string => typeof v === "string"));
  if (ids.length === 0) throw new Error("Elige al menos una persona");

  const { normalizar } = await import("@/lib/contactos");

  await enTransaccion(async (q) => {
    const elegidos = await q<{ nombre: string }>(
      "select nombre from contacto where id = any($1::uuid[])",
      [ids],
    );
    const claves = new Set(elegidos.map((e) => normalizar(e.nombre)));

    const yaEstan = new Set(
      (await q<{ nombre: string }>("select nombre from contacto where cliente_id = $1", [clienteId])).map(
        (c) => normalizar(c.nombre),
      ),
    );

    const todas = await q<{
      nombre: string;
      rol: string | null;
      lado: string;
      email: string | null;
      telefono: string | null;
    }>(
      "select nombre, rol, lado, email, telefono from contacto order by creado_en desc",
    );

    const porPersona = new Map<string, (typeof todas)[number]>();
    for (const fila of todas) {
      const clave = normalizar(fila.nombre);
      if (!claves.has(clave) || yaEstan.has(clave)) continue;
      const actual = porPersona.get(clave);
      if (!actual) porPersona.set(clave, { ...fila });
      else {
        actual.rol ??= fila.rol;
        actual.email ??= fila.email;
        actual.telefono ??= fila.telefono;
      }
    }

    for (const p of porPersona.values()) {
      await q(
        `insert into contacto (cliente_id, nombre, rol, lado, email, telefono)
         values ($1, $2, $3, $4, $5, $6)`,
        [clienteId, p.nombre, p.rol, p.lado, p.email, p.telefono],
      );
    }
  });

  revalidatePath(`/clientes/${clienteId}`, "layout");
  revalidatePath("/contactos");
}
