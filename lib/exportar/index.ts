import "server-only";
import { sql } from "../db";
import { listarClientes, obtenerCliente } from "../consultas/clientes";
import { timelineCliente, actualizacionesDe } from "../consultas/eventos";
import { hitosCliente } from "../consultas/hitos";
import { compromisosCliente } from "../consultas/compromisos";
import { contactosCliente } from "../consultas/contactos";
import { lineaBaseCliente } from "../consultas/lineaBase";
import { resumenMensual } from "../consultas/metricas";
import { adjuntosDe } from "../consultas/adjuntos";
import {
  fichaCliente as fichaInventario,
  servidoresCliente,
  sipCliente,
  integracionesCliente,
} from "../consultas/inventario";
import { crearZip, type EntradaZip } from "../zip";
import { mmss } from "../aht";
import { aISO, fechaLarga, hoy, textoRelativo } from "../fechas";
import { tamanoLegible } from "../adjuntos";
import {
  ETIQUETA_ESTADO_CLIENTE,
  ETIQUETA_ESTADO_COMPROMISO,
  ETIQUETA_ESTADO_HITO,
  ETIQUETA_EVENTO,
  ETIQUETA_FASE,
  ETIQUETA_HITO,
  ETIQUETA_LADO,
  ETIQUETA_SEGUIMIENTO,
  ETIQUETA_SEVERIDAD,
  ETIQUETA_CONTACT_TYPE,
  ETIQUETA_ESTADO_RECURSO,
} from "../dominio";
import {
  campo,
  csv,
  decimal,
  delta,
  envolver,
  miles,
  nombreArchivo,
  porcentaje,
  seccion,
  tabla,
  titulo,
  colgante,
  recortar,
  ANCHO,
} from "./texto";

/**
 * El export completo de la plataforma, en texto plano.
 *
 * El objetivo es que el ZIP se pueda leer dentro de diez años sin la app, sin
 * la base de datos y sin este código: un archivo por cliente que se entiende
 * abriéndolo, y los mismos datos en CSV para quien quiera meterlos en una
 * hoja de cálculo. Por eso nada se guarda en JSON.
 */

const BOM = "﻿";

/** Windows es el único que se queja, y se queja siempre. */
function paraArchivo(texto: string): string {
  return BOM + texto.replace(/\r\n?|\n/g, "\r\n");
}

// ------------------------------------------------------------- consultas extra

type CambioFechaFila = {
  hito_id: string;
  fecha_anterior: string;
  fecha_nueva: string;
  motivo: string;
  creado_en: string;
};

async function cambiosDeFecha(clienteId: string) {
  const filas = await sql<CambioFechaFila>(
    `select cf.hito_id, cf.fecha_anterior, cf.fecha_nueva, cf.motivo, cf.creado_en
     from hito_cambio_fecha cf
     join hito h on h.id = cf.hito_id
     where h.cliente_id = $1
     order by cf.creado_en`,
    [clienteId],
  );

  const porHito: Record<string, CambioFechaFila[]> = {};
  for (const fila of filas) (porHito[fila.hito_id] ??= []).push(fila);
  return porHito;
}

type DiaFila = {
  fecha: string;
  llamadas_totales: number | null;
  duracion_total_min: string | null;
  contencion_pct: string | null;
  sin_actividad: boolean;
  notas: string | null;
};

function diasCliente(clienteId: string) {
  return sql<DiaFila>(
    `select fecha, llamadas_totales, duracion_total_min, contencion_pct,
            sin_actividad, notas
     from metrica_dia where cliente_id = $1 order by fecha desc`,
    [clienteId],
  );
}

function contenidosAdjuntos(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return sql<{ id: string; nombre: string; contenido: Buffer }>(
    "select id, nombre, contenido from adjunto where id = any($1::uuid[])",
    [ids],
  );
}

// ------------------------------------------------------------------ un cliente

type DatosCliente = Awaited<ReturnType<typeof cargarCliente>>;

async function cargarCliente(clienteId: string) {
  const [detalle, base, eventos, hitos, compromisos, contactos, meses, dias, cambios] =
    await Promise.all([
      obtenerCliente(clienteId),
      lineaBaseCliente(clienteId),
      timelineCliente(clienteId, 10_000),
      hitosCliente(clienteId),
      compromisosCliente(clienteId),
      contactosCliente(clienteId),
      resumenMensual(clienteId, 36),
      diasCliente(clienteId),
      cambiosDeFecha(clienteId),
    ]);

  const [inventarioFicha, servidores, sips, integraciones] = await Promise.all([
    fichaInventario(clienteId),
    servidoresCliente(clienteId),
    sipCliente(clienteId),
    integracionesCliente(clienteId),
  ]);

  const [actualizaciones, adjuntos] = await Promise.all([
    actualizacionesDe(eventos.map((e) => e.id)),
    adjuntosDe(eventos.map((e) => e.id)),
  ]);

  return {
    detalle,
    base,
    eventos,
    hitos,
    compromisos,
    contactos,
    meses,
    dias,
    cambios,
    actualizaciones,
    adjuntos,
    inventarioFicha,
    servidores,
    sips,
    integraciones,
  };
}

/** Pares etiqueta/valor, saltando los vacíos: en el inventario casi todo lo es. */
function bloque(pares: [string, string | null | undefined][], sangria = 4): string[] {
  return pares
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([etiqueta, v]) => {
      const valor = String(v);
      // Un valor de varias líneas —seis rangos de IP, dos endpoints— se sangra
      // debajo de su etiqueta en vez de aplastarse en una sola.
      return valor.includes("\n")
        ? `${" ".repeat(sangria)}${etiqueta}\n${envolver(valor, sangria + 4)}`
        : `${" ".repeat(sangria)}${campo(etiqueta, valor)}`;
    });
}

function fichaCliente(d: DatosCliente, carpetaAdjuntos: string | null): string {
  const c = d.detalle!;
  const partes: string[] = [];

  const abiertos = d.eventos.filter(
    (e) => e.estado_seguimiento === "abierto" || e.estado_seguimiento === "en_curso",
  );

  partes.push(titulo(c.nombre));
  partes.push("");
  partes.push(campo("Fase", ETIQUETA_FASE[c.fase]));
  partes.push(campo("Estado", ETIQUETA_ESTADO_CLIENTE[c.estado]));
  partes.push(campo("Partner", c.partner_nombre));
  partes.push(campo("Responsable interno", c.owner_interno));
  partes.push(campo("Alta", fechaLarga(c.fecha_alta)));
  if (c.archivado) partes.push(campo("Archivado", "sí"));
  partes.push(campo("Asuntos abiertos", String(abiertos.length)));
  partes.push(campo("Registros", String(d.eventos.length)));

  if (c.descripcion) {
    partes.push("");
    partes.push(envolver(c.descripcion));
  }

  // ------------------------------------------------------------- inventario
  const f = d.inventarioFicha;
  if (f) {
    partes.push(seccion("Ficha del proyecto"));
    partes.push(...bloque([
      ["Código", f.codigo],
      ["Caso de uso", f.caso_uso],
      ["Tipo de contacto", f.contact_type ? ETIQUETA_CONTACT_TYPE[f.contact_type] : null],
      ["Ambiente", f.ambiente],
      ["País o región", f.pais],
    ], 0));
    if (f.proceso) {
      partes.push("");
      partes.push(envolver(f.proceso));
    }
    if (f.observaciones) {
      partes.push("");
      partes.push(envolver(f.observaciones));
    }
  }

  if (d.servidores.length > 0) {
    partes.push(seccion(`Servidores de aplicación (${d.servidores.length})`));
    for (const s of d.servidores) {
      partes.push("");
      partes.push(`${s.server_name ?? s.app_origen ?? "Servidor"}  [${ETIQUETA_ESTADO_RECURSO[s.estado]}]`);
      partes.push(...bloque([
        ["Ambiente", s.ambiente],
        ["Nube / on-premise", s.cloud_provider],
        ["Aplicación origen", s.app_origen],
        ["Host origen", s.host_origen],
        ["IP origen", s.ip_origen],
        ["Comunicación", s.tipo_comunicacion],
        ["Protocolo", s.protocolo],
        ["Puerto", s.puerto],
        ["Aplicación destino", s.app_destino],
        ["Host destino", s.host_destino],
        ["IP / URL destino", s.destino],
        ["Endpoints", s.servicio],
        ["Owner técnico", s.owner_tecnico],
        ["Notas", s.notas],
      ]));
    }
  }

  if (d.sips.length > 0) {
    partes.push(seccion(`Telefonía SIP (${d.sips.length})`));
    for (const s of d.sips) {
      partes.push("");
      partes.push(`${s.trunk_name ?? s.sbc ?? "Trunk"}  [${ETIQUETA_ESTADO_RECURSO[s.estado]}]`);
      partes.push(...bloque([
        ["SBC", s.sbc],
        ["DID", s.did],
        ["VDN de desborde", s.vdn_desborde],
        ["IP del partner", s.tp_ip],
        ["IP del agente", s.agent_ip],
        ["Puerto", s.puerto],
        ["Transporte", s.transporte],
        ["Códec", s.codec],
        ["Transferencia", s.transfer_destino],
        ["Notas", s.notas],
      ]));
    }
  }

  if (d.integraciones.length > 0) {
    partes.push(seccion(`Integraciones externas (${d.integraciones.length})`));
    for (const i of d.integraciones) {
      partes.push("");
      partes.push(`${i.sistema}  [${ETIQUETA_ESTADO_RECURSO[i.estado]}]`);
      partes.push(...bloque([
        ["Tipo", i.tipo],
        ["Usuario o ruta", i.usuario],
        ["Método", i.metodo],
        ["Autenticación", i.autenticacion],
        ["Puerto", i.puerto],
        ["Ambiente", i.ambiente],
        ["Criticidad", i.criticidad],
        ["Owner", i.owner],
        ["Notas", i.notas],
      ]));
    }
  }

  // ------------------------------------------------------------- línea base
  if (d.base) {
    const b = d.base;
    partes.push(seccion("Línea base del partner"));
    partes.push(
      envolver("Los supuestos con los que se dimensionó el proyecto antes de salir a producción. Es contra esto que se compara la realidad."),
    );
    partes.push("");
    partes.push(campo("Volumen mensual", b.volumen_mensual_promedio === null ? null : `${miles(b.volumen_mensual_promedio)} llamadas`));
    partes.push(campo("AHT promedio", b.aht_promedio_seg === null ? null : `${mmss(b.aht_promedio_seg)} (${b.aht_promedio_seg} s)`));
    partes.push(campo("Meta de contención", porcentaje(b.meta_contencion_pct)));
    partes.push(campo("Concurrencia media", b.concurrencia_promedio === null ? null : String(b.concurrencia_promedio)));
    partes.push(campo("Concurrencia máxima", b.concurrencia_maxima === null ? null : String(b.concurrencia_maxima)));
    partes.push(campo("Horario operativo", b.horario_operativo));
    partes.push(campo("Entregado por", b.entregado_por));
    partes.push(campo("Fecha de entrega", b.fecha_entrega ? aISO(b.fecha_entrega) : null));
    if (b.notas) {
      partes.push("");
      partes.push(envolver(b.notas));
    }
  }

  // ----------------------------------------------------------------- hitos
  partes.push(seccion(`Hitos (${d.hitos.length})`));
  if (d.hitos.length === 0) {
    partes.push("Sin hitos registrados.");
  } else {
    for (const h of d.hitos) {
      const movido = d.cambios[h.id] ?? [];
      partes.push("");
      partes.push(colgante(`${aISO(h.fecha_objetivo)}  `, h.titulo));
      partes.push(
        `    ${ETIQUETA_HITO[h.tipo]} · ${ETIQUETA_ESTADO_HITO[h.estado]}` +
          (h.responsable_nombre ? ` · ${h.responsable_nombre}` : "") +
          (h.estado === "pendiente" || h.estado === "en_curso"
            ? ` · ${textoRelativo(h.fecha_objetivo)}`
            : ""),
      );
      if (h.notas) partes.push(envolver(h.notas, 4));
      if (movido.length > 0) {
        partes.push(`    Movido ${movido.length} ${movido.length === 1 ? "vez" : "veces"}:`);
        for (const m of movido) {
          partes.push(
            `      ${aISO(m.creado_en)}  ${aISO(m.fecha_anterior)} → ${aISO(m.fecha_nueva)}`,
          );
          partes.push(envolver(m.motivo, 8));
        }
      }
    }
  }

  // ----------------------------------------------------------- compromisos
  partes.push(seccion(`Compromisos (${d.compromisos.length})`));
  if (d.compromisos.length === 0) {
    partes.push("Sin compromisos registrados.");
  } else {
    for (const co of d.compromisos) {
      partes.push("");
      partes.push(
        `${co.fecha_limite ? aISO(co.fecha_limite) : "sin fecha "}  ` +
          `[${ETIQUETA_ESTADO_COMPROMISO[co.estado]}]`,
      );
      partes.push(envolver(co.descripcion, 4));
      partes.push(
        `    ${ETIQUETA_LADO[co.lado]}` +
          (co.responsable_nombre ? ` · ${co.responsable_nombre}` : ""),
      );
    }
  }

  // ------------------------------------------------------------- contactos
  partes.push(seccion(`Contactos (${d.contactos.length})`));
  if (d.contactos.length === 0) {
    partes.push("Sin contactos registrados.");
  } else {
    partes.push(
      tabla(
        ["Nombre", "Lado", "Rol", "Email", "Teléfono"],
        d.contactos.map((ct) => [
          ct.nombre,
          ETIQUETA_LADO[ct.lado],
          recortar(ct.rol ?? "—", 22),
          ct.email ?? "—",
          ct.telefono ?? "—",
        ]),
      ),
    );
    for (const ct of d.contactos.filter((x) => x.notas)) {
      partes.push("");
      partes.push(`${ct.nombre}:`);
      partes.push(envolver(ct.notas!, 4));
    }
  }

  // --------------------------------------------------------------- métricas
  partes.push(seccion(`Métricas mensuales (${d.meses.length})`));
  if (d.meses.length === 0) {
    partes.push("Sin métricas cargadas.");
  } else {
    // Van de más reciente a más antiguo, así que el mes anterior de cada fila
    // es el siguiente del array.
    partes.push(
      tabla(
        ["Periodo", "Llamadas", "vs mes ant.", "Minutos", "AHT", "Contención", "Días", "Origen"],
        d.meses.map((m, i) => [
          aISO(m.periodo).slice(0, 7),
          miles(m.llamadas),
          delta(m.llamadas, d.meses[i + 1]?.llamadas ?? null),
          decimal(m.minutos, 0),
          m.duracion_promedio ? mmss(Math.round(Number(m.duracion_promedio) * 60)) : "—",
          porcentaje(m.contencion_promedio),
          String(m.dias_con_actividad),
          m.fuente === "mes" ? "total mes" : "suma días",
        ]),
        ["i", "d", "d", "d", "d", "d", "d", "i"],
      ),
    );

    const conObjetivo = d.meses.filter((m) => m.llamadas_comprometidas !== null);
    if (conObjetivo.length > 0) {
      partes.push("");
      partes.push("Contra lo comprometido:");
      partes.push(
        tabla(
          ["Periodo", "Comprometidas", "Reales", "Desvío"],
          conObjetivo.map((m) => [
            aISO(m.periodo).slice(0, 7),
            miles(m.llamadas_comprometidas),
            miles(m.llamadas),
            delta(m.llamadas, m.llamadas_comprometidas),
          ]),
          ["i", "d", "d", "d"],
        ),
      );
    }
  }

  if (d.dias.length > 0) {
    partes.push(seccion(`Registro diario (${d.dias.length} días)`));
    partes.push(
      tabla(
        ["Fecha", "Llamadas", "Minutos", "Contención", "Nota"],
        d.dias.map((dia) => [
          aISO(dia.fecha),
          dia.sin_actividad ? "sin actividad" : miles(dia.llamadas_totales),
          decimal(dia.duracion_total_min, 0),
          porcentaje(dia.contencion_pct),
          recortar(dia.notas ?? "", 32),
        ]),
        ["i", "d", "d", "d", "i"],
      ),
    );
  }

  // --------------------------------------------------------------- timeline
  if (abiertos.length > 0) {
    partes.push(seccion(`Asuntos abiertos (${abiertos.length})`));
    for (const e of abiertos) {
      partes.push(
        `${aISO(e.fecha_evento)}  ${ETIQUETA_EVENTO[e.tipo]} · ` +
          `${ETIQUETA_SEVERIDAD[e.severidad]} · ` +
          ETIQUETA_SEGUIMIENTO[e.estado_seguimiento!],
      );
      partes.push(envolver(e.titulo, 12));
    }
    partes.push("");
    partes.push("El detalle de cada uno está más abajo, en el timeline.");
  }

  partes.push(seccion(`Timeline (${d.eventos.length})`));
  if (d.eventos.length === 0) {
    partes.push("Sin registros.");
  } else {
    partes.push("Del más reciente al más antiguo.");
    for (const e of d.eventos) {
      const marcas = [ETIQUETA_EVENTO[e.tipo], ETIQUETA_SEVERIDAD[e.severidad]];
      if (e.estado_seguimiento) marcas.push(ETIQUETA_SEGUIMIENTO[e.estado_seguimiento]);
      if (e.origen !== "app") marcas.push(`vía ${e.origen}`);

      partes.push("");
      partes.push("·".repeat(ANCHO));
      partes.push(colgante(`${aISO(e.fecha_evento)}  `, e.titulo));
      partes.push(`            ${marcas.join(" · ")}`);
      if (e.cuerpo) {
        partes.push("");
        partes.push(envolver(e.cuerpo, 4));
      }

      const hilo = d.actualizaciones[e.id] ?? [];
      if (hilo.length > 0) {
        partes.push("");
        partes.push(`    Actualizaciones (${hilo.length})`);
        for (const a of hilo) {
          const cambio =
            a.estado_nuevo && a.estado_nuevo !== a.estado_anterior
              ? `  ${a.estado_anterior ? ETIQUETA_SEGUIMIENTO[a.estado_anterior] : "—"} → ${ETIQUETA_SEGUIMIENTO[a.estado_nuevo]}`
              : "";
          partes.push(`      ${aISO(a.creado_en)}${cambio}`);
          partes.push(envolver(a.cuerpo, 8));
        }
      }

      const archivos = d.adjuntos[e.id] ?? [];
      if (archivos.length > 0) {
        partes.push("");
        partes.push(`    Adjuntos (${archivos.length})`);
        for (const a of archivos) {
          partes.push(
            `      ${a.nombre} · ${tamanoLegible(a.tamano_bytes)}` +
              (carpetaAdjuntos ? `  →  ${carpetaAdjuntos}/` : ""),
          );
        }
      }
    }
  }

  partes.push("");
  return partes.join("\n");
}

// ------------------------------------------------------------------- resumen

function fichaResumen(
  clientes: Awaited<ReturnType<typeof listarClientes>>,
  datos: Map<string, DatosCliente>,
  fecha: string,
): string {
  const partes: string[] = [];

  partes.push(titulo("Resumen general"));
  partes.push("");
  partes.push(campo("Generado", fechaLarga(fecha)));
  partes.push(campo("Clientes", String(clientes.length)));
  partes.push("");

  // La tabla lleva solo la fecha del próximo hito, no su título: los títulos
  // son largos y desbordan la página, y están enteros dos secciones más abajo.
  partes.push(
    tabla(
      ["Cliente", "Fase", "Estado", "Abiertos", "Próximo hito"],
      clientes.map((c) => [
        c.nombre,
        ETIQUETA_FASE[c.fase],
        ETIQUETA_ESTADO_CLIENTE[c.estado],
        String(c.abiertos),
        c.proximo_hito_fecha ? aISO(c.proximo_hito_fecha) : "—",
      ]),
      ["i", "i", "i", "d", "i"],
    ),
  );

  const conVolumen = clientes.filter((c) => c.llamadas_mes !== null);
  if (conVolumen.length > 0) {
    partes.push(seccion("Volumen del mes en curso"));
    partes.push(
      tabla(
        ["Cliente", "Llamadas", "vs mes anterior"],
        conVolumen.map((c) => [
          c.nombre,
          miles(c.llamadas_mes),
          delta(c.llamadas_mes, c.llamadas_mes_previo),
        ]),
        ["i", "d", "d"],
      ),
    );
  }

  // ------------------------------------------------------- asuntos abiertos
  const abiertos = clientes.flatMap((c) =>
    (datos.get(c.id)?.eventos ?? [])
      .filter((e) => e.estado_seguimiento === "abierto" || e.estado_seguimiento === "en_curso")
      .map((e) => ({ cliente: c.nombre, e })),
  );

  partes.push(seccion(`Asuntos abiertos (${abiertos.length})`));
  if (abiertos.length === 0) {
    partes.push("Nada abierto.");
  } else {
    const orden = { alta: 0, media: 1, info: 2 } as const;
    abiertos.sort(
      (a, b) =>
        orden[a.e.severidad] - orden[b.e.severidad] ||
        aISO(a.e.fecha_evento).localeCompare(aISO(b.e.fecha_evento)),
    );
    // Dos líneas por asunto en vez de una tabla: los títulos son frases y en
    // columnas habría que recortarlas justo donde está lo que importa.
    for (const { cliente, e } of abiertos) {
      partes.push("");
      partes.push(
        `${aISO(e.fecha_evento)}  ${cliente} · ${ETIQUETA_EVENTO[e.tipo]} · ` +
          `${ETIQUETA_SEVERIDAD[e.severidad]} · ` +
          ETIQUETA_SEGUIMIENTO[e.estado_seguimiento!],
      );
      partes.push(envolver(e.titulo, 12));
    }
  }

  // ------------------------------------------------------------------ hitos
  const hitos = clientes
    .flatMap((c) =>
      (datos.get(c.id)?.hitos ?? [])
        .filter((h) => h.estado === "pendiente" || h.estado === "en_curso")
        .map((h) => ({ cliente: c.nombre, h })),
    )
    .sort((a, b) => aISO(a.h.fecha_objetivo).localeCompare(aISO(b.h.fecha_objetivo)));

  partes.push(seccion(`Hitos abiertos (${hitos.length})`));
  if (hitos.length === 0) {
    partes.push("Sin hitos abiertos.");
  } else {
    for (const { cliente, h } of hitos) {
      partes.push("");
      partes.push(
        `${aISO(h.fecha_objetivo)}  ${cliente} · ${ETIQUETA_HITO[h.tipo]} · ` +
          textoRelativo(h.fecha_objetivo) +
          (h.veces_movido > 0 ? ` · movido ${h.veces_movido}×` : ""),
      );
      partes.push(envolver(h.titulo, 12));
    }
  }

  // ------------------------------------------------------------ compromisos
  const compromisos = clientes
    .flatMap((c) =>
      (datos.get(c.id)?.compromisos ?? [])
        .filter((co) => co.estado === "pendiente" || co.estado === "vencido")
        .map((co) => ({ cliente: c.nombre, co })),
    )
    .sort((a, b) =>
      (a.co.fecha_limite ? aISO(a.co.fecha_limite) : "9999").localeCompare(
        b.co.fecha_limite ? aISO(b.co.fecha_limite) : "9999",
      ),
    );

  partes.push(seccion(`Compromisos abiertos (${compromisos.length})`));
  if (compromisos.length === 0) {
    partes.push("Sin compromisos abiertos.");
  } else {
    for (const { cliente, co } of compromisos) {
      partes.push("");
      partes.push(
        `${co.fecha_limite ? aISO(co.fecha_limite) : "sin fecha "}  ${cliente} · ` +
          ETIQUETA_LADO[co.lado] +
          (co.responsable_nombre ? ` · ${co.responsable_nombre}` : ""),
      );
      partes.push(envolver(co.descripcion, 12));
    }
  }

  partes.push("");
  return partes.join("\n");
}

function leeme(clientes: { nombre: string }[], fecha: string, archivos: string[]): string {
  return [
    titulo("PM Platform — copia de los datos"),
    "",
    envolver(
      `Esta carpeta es una copia completa de lo registrado en PM Platform el ${fechaLarga(fecha)}. Todo es texto plano: se lee con cualquier editor, sin la aplicación y sin base de datos.`,
    ),
    seccion("Qué hay dentro"),
    "",
    "Resumen.txt",
    envolver(
      "La foto de toda la cartera en una página: cada cliente con su fase, sus asuntos abiertos y su próximo hito, más las listas de todo lo que sigue abierto.",
      4,
    ),
    "",
    "Clientes/",
    envolver(
      `Un archivo por cliente (${clientes.length} en total) con absolutamente todo lo suyo: línea base del partner, hitos con su historial de fechas, compromisos, contactos, métricas mes a mes y el timeline completo con sus actualizaciones.`,
      4,
    ),
    "",
    "Datos/",
    envolver(
      "Los mismos datos en CSV, para abrirlos en Excel o Google Sheets y hacer cuentas. Separador coma, codificación UTF-8.",
      4,
    ),
    "",
    "Adjuntos/",
    envolver(
      "Los archivos subidos a los registros del timeline, en una carpeta por cliente. Solo existe si hay adjuntos.",
      4,
    ),
    seccion("Cómo leer las fichas de cliente"),
    envolver(
      "Las fechas van siempre como AAAA-MM-DD para que ordenen bien. El timeline va del registro más reciente al más antiguo. Debajo de cada registro aparecen sus actualizaciones en orden cronológico, con el cambio de estado cuando lo hubo.",
    ),
    seccion("Clientes incluidos"),
    "",
    ...clientes.map((c) => `  · ${c.nombre}`),
    seccion("Índice de archivos"),
    "",
    ...archivos.map((a) => `  ${a}`),
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------- export

export type Export = { nombre: string; zip: Buffer };

/**
 * Arma el ZIP completo. Incluye los clientes archivados: es una copia de todo
 * lo que hay, y lo archivado es justo lo que nadie va a poder reconstruir de
 * memoria más adelante.
 */
export async function construirExport(): Promise<Export> {
  const fecha = hoy();
  const raiz = `PM Platform ${fecha}`;
  const clientes = await listarClientes({ incluirArchivados: true });

  const datos = new Map<string, DatosCliente>();
  for (const c of clientes) {
    datos.set(c.id, await cargarCliente(c.id));
  }

  const entradas: EntradaZip[] = [];
  const indice: string[] = [];

  const agregar = (ruta: string, datosArchivo: Buffer | string) => {
    entradas.push({ ruta: `${raiz}/${ruta}`, datos: datosArchivo });
    indice.push(ruta);
  };

  // -------------------------------------------------------------- adjuntos
  const carpetaPorCliente = new Map<string, string>();
  for (const c of clientes) {
    const d = datos.get(c.id)!;
    const metadatos = Object.values(d.adjuntos).flat();
    if (metadatos.length === 0) continue;

    const carpeta = `Adjuntos/${nombreArchivo(c.nombre)}`;
    carpetaPorCliente.set(c.id, carpeta);

    const contenidos = new Map(
      (await contenidosAdjuntos(metadatos.map((a) => a.id))).map((a) => [a.id, a]),
    );

    // Dos actas pueden llamarse igual; el nombre del archivo no puede.
    const usados = new Set<string>();
    for (const meta of metadatos) {
      const contenido = contenidos.get(meta.id);
      if (!contenido) continue;

      const limpio = nombreArchivo(meta.nombre);
      let nombre = limpio;
      let n = 2;
      while (usados.has(nombre.toLowerCase())) {
        const punto = limpio.lastIndexOf(".");
        nombre =
          punto > 0
            ? `${limpio.slice(0, punto)} (${n})${limpio.slice(punto)}`
            : `${limpio} (${n})`;
        n++;
      }
      usados.add(nombre.toLowerCase());
      agregar(`${carpeta}/${nombre}`, contenido.contenido);
    }
  }

  // ------------------------------------------------------------- por cliente
  for (const c of clientes) {
    const d = datos.get(c.id)!;
    if (!d.detalle) continue;
    agregar(
      `Clientes/${nombreArchivo(c.nombre)}.txt`,
      paraArchivo(fichaCliente(d, carpetaPorCliente.get(c.id) ?? null)),
    );
  }

  // -------------------------------------------------------------------- CSV
  agregar(
    "Datos/clientes.csv",
    paraArchivo(
      csv(
        ["cliente", "fase", "estado", "partner", "responsable", "alta", "archivado", "asuntos_abiertos"],
        clientes.map((c) => {
          const det = datos.get(c.id)!.detalle!;
          return [
            c.nombre,
            c.fase,
            c.estado,
            c.partner_nombre,
            c.owner_interno,
            aISO(det.fecha_alta),
            det.archivado ? "si" : "no",
            c.abiertos,
          ];
        }),
      ),
    ),
  );

  agregar(
    "Datos/timeline.csv",
    paraArchivo(
      csv(
        ["cliente", "fecha", "tipo", "severidad", "seguimiento", "titulo", "cuerpo", "origen", "actualizaciones"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.eventos.map((e) => [
            c.nombre,
            aISO(e.fecha_evento),
            e.tipo,
            e.severidad,
            e.estado_seguimiento ?? "",
            e.titulo,
            e.cuerpo,
            e.origen,
            e.actualizaciones,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/actualizaciones.csv",
    paraArchivo(
      csv(
        ["cliente", "registro", "fecha", "estado_anterior", "estado_nuevo", "texto"],
        clientes.flatMap((c) => {
          const d = datos.get(c.id)!;
          return d.eventos.flatMap((e) =>
            (d.actualizaciones[e.id] ?? []).map((a) => [
              c.nombre,
              e.titulo,
              aISO(a.creado_en),
              a.estado_anterior ?? "",
              a.estado_nuevo ?? "",
              a.cuerpo,
            ]),
          );
        }),
      ),
    ),
  );

  agregar(
    "Datos/hitos.csv",
    paraArchivo(
      csv(
        ["cliente", "fecha_objetivo", "tipo", "titulo", "estado", "responsable", "veces_movido", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.hitos.map((h) => [
            c.nombre,
            aISO(h.fecha_objetivo),
            h.tipo,
            h.titulo,
            h.estado,
            h.responsable_nombre,
            h.veces_movido,
            h.notas,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/hitos-cambios-de-fecha.csv",
    paraArchivo(
      csv(
        ["cliente", "hito", "registrado", "fecha_anterior", "fecha_nueva", "motivo"],
        clientes.flatMap((c) => {
          const d = datos.get(c.id)!;
          return d.hitos.flatMap((h) =>
            (d.cambios[h.id] ?? []).map((m) => [
              c.nombre,
              h.titulo,
              aISO(m.creado_en),
              aISO(m.fecha_anterior),
              aISO(m.fecha_nueva),
              m.motivo,
            ]),
          );
        }),
      ),
    ),
  );

  agregar(
    "Datos/compromisos.csv",
    paraArchivo(
      csv(
        ["cliente", "fecha_limite", "estado", "lado", "responsable", "descripcion"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.compromisos.map((co) => [
            c.nombre,
            co.fecha_limite ? aISO(co.fecha_limite) : "",
            co.estado,
            co.lado,
            co.responsable_nombre,
            co.descripcion,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/contactos.csv",
    paraArchivo(
      csv(
        ["cliente", "nombre", "lado", "rol", "email", "telefono", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.contactos.map((ct) => [
            c.nombre,
            ct.nombre,
            ct.lado,
            ct.rol,
            ct.email,
            ct.telefono,
            ct.notas,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/metricas-mensuales.csv",
    paraArchivo(
      csv(
        ["cliente", "periodo", "llamadas", "minutos", "aht_segundos", "contencion_pct", "dias_con_actividad", "llamadas_comprometidas", "origen"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.meses.map((m) => [
            c.nombre,
            aISO(m.periodo).slice(0, 7),
            m.llamadas,
            m.minutos,
            m.duracion_promedio ? Math.round(Number(m.duracion_promedio) * 60) : "",
            m.contencion_promedio,
            m.dias_con_actividad,
            m.llamadas_comprometidas,
            m.fuente === "mes" ? "total mensual" : "suma de dias",
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/metricas-diarias.csv",
    paraArchivo(
      csv(
        ["cliente", "fecha", "llamadas", "minutos", "contencion_pct", "sin_actividad", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.dias.map((d) => [
            c.nombre,
            aISO(d.fecha),
            d.llamadas_totales,
            d.duracion_total_min,
            d.contencion_pct,
            d.sin_actividad ? "si" : "no",
            d.notas,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/linea-base.csv",
    paraArchivo(
      csv(
        ["cliente", "volumen_mensual", "aht_segundos", "concurrencia_media", "concurrencia_maxima", "meta_contencion_pct", "horario", "entregado_por", "fecha_entrega", "notas"],
        clientes
          .filter((c) => datos.get(c.id)!.base)
          .map((c) => {
            const b = datos.get(c.id)!.base!;
            return [
              c.nombre,
              b.volumen_mensual_promedio,
              b.aht_promedio_seg,
              b.concurrencia_promedio,
              b.concurrencia_maxima,
              b.meta_contencion_pct,
              b.horario_operativo,
              b.entregado_por,
              b.fecha_entrega ? aISO(b.fecha_entrega) : "",
              b.notas,
            ];
          }),
      ),
    ),
  );

  agregar(
    "Datos/inventario-servidores.csv",
    paraArchivo(
      csv(
        ["cliente", "server_name", "ambiente", "cloud_provider", "app_origen", "host_origen",
         "ip_origen", "tipo_comunicacion", "protocolo", "puerto", "destino", "app_destino",
         "host_destino", "servicio", "owner_tecnico", "estado", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.servidores.map((s) => [
            c.nombre, s.server_name, s.ambiente, s.cloud_provider, s.app_origen,
            s.host_origen, s.ip_origen, s.tipo_comunicacion, s.protocolo, s.puerto,
            s.destino, s.app_destino, s.host_destino, s.servicio, s.owner_tecnico,
            s.estado, s.notas,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/inventario-sip.csv",
    paraArchivo(
      csv(
        ["cliente", "trunk_name", "did", "vdn_desborde", "sbc", "tp_ip", "agent_ip",
         "puerto", "transporte", "codec", "transfer_destino", "estado", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.sips.map((s) => [
            c.nombre, s.trunk_name, s.did, s.vdn_desborde, s.sbc, s.tp_ip, s.agent_ip,
            s.puerto, s.transporte, s.codec, s.transfer_destino, s.estado, s.notas,
          ]),
        ),
      ),
    ),
  );

  agregar(
    "Datos/inventario-integraciones.csv",
    paraArchivo(
      csv(
        ["cliente", "sistema", "tipo", "usuario", "metodo", "autenticacion", "puerto",
         "ambiente", "criticidad", "owner", "estado", "notas"],
        clientes.flatMap((c) =>
          datos.get(c.id)!.integraciones.map((i) => [
            c.nombre, i.sistema, i.tipo, i.usuario, i.metodo, i.autenticacion, i.puerto,
            i.ambiente, i.criticidad, i.owner, i.estado, i.notas,
          ]),
        ),
      ),
    ),
  );

  agregar("Resumen.txt", paraArchivo(fichaResumen(clientes, datos, fecha)));

  // El índice se escribe al final porque enumera todo lo anterior.
  entradas.unshift({
    ruta: `${raiz}/LEEME.txt`,
    datos: paraArchivo(leeme(clientes, fecha, [...indice].sort())),
  });

  return { nombre: `${raiz}.zip`, zip: crearZip(entradas) };
}
