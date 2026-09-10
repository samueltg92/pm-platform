/** Vocabulario del dominio: los enum de la base con su etiqueta y su color. */

export const FASES = [
  "descubrimiento",
  "desarrollo",
  "qa",
  "uat",
  "produccion",
] as const;
export type Fase = (typeof FASES)[number];

export const ETIQUETA_FASE: Record<Fase, string> = {
  descubrimiento: "Descubrimiento",
  desarrollo: "Desarrollo",
  qa: "QA",
  uat: "UAT",
  produccion: "Producción",
};

export const ESTADOS_CLIENTE = ["activo", "pausado", "cerrado"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];

export const ETIQUETA_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  activo: "Activo",
  pausado: "Pausado",
  cerrado: "Cerrado",
};

export const TIPOS_EVENTO = [
  "nota",
  "incidencia",
  "decision",
  "cambio_scope",
  "riesgo",
  "bloqueo",
  "despliegue",
  "cambio_stack",
  "cambio_fase",
  "feedback",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  nota: "Nota",
  incidencia: "Incidencia",
  decision: "Decisión",
  cambio_scope: "Cambio de scope",
  riesgo: "Riesgo",
  bloqueo: "Bloqueo",
  despliegue: "Despliegue",
  cambio_stack: "Cambio de stack",
  cambio_fase: "Cambio de fase",
  feedback: "Feedback",
};

/** Tipos que el PM puede crear a mano. Los otros los genera el sistema. */
export const TIPOS_EVENTO_MANUAL: TipoEvento[] = [
  "nota",
  "incidencia",
  "decision",
  "cambio_scope",
  "riesgo",
  "bloqueo",
  "despliegue",
  "feedback",
];

export const SEVERIDADES = ["info", "media", "alta"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  info: "Info",
  media: "Media",
  alta: "Alta",
};

export const TIPOS_HITO = [
  "go_live",
  "piloto",
  "entrega",
  "aprobacion",
  "facturacion",
  "otro",
] as const;
export type TipoHito = (typeof TIPOS_HITO)[number];

export const ETIQUETA_HITO: Record<TipoHito, string> = {
  go_live: "Salida a producción",
  piloto: "Piloto",
  entrega: "Entrega",
  aprobacion: "Aprobación",
  facturacion: "Facturación",
  otro: "Otro",
};

export const ESTADOS_HITO = ["pendiente", "en_curso", "cumplido", "cancelado"] as const;
export type EstadoHito = (typeof ESTADOS_HITO)[number];

export const ETIQUETA_ESTADO_HITO: Record<EstadoHito, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
};

export const ESTADOS_COMPROMISO = [
  "pendiente",
  "cumplido",
  "vencido",
  "cancelado",
] as const;
export type EstadoCompromiso = (typeof ESTADOS_COMPROMISO)[number];

export const ETIQUETA_ESTADO_COMPROMISO: Record<EstadoCompromiso, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const LADOS = ["interno", "partner", "cliente"] as const;
export type Lado = (typeof LADOS)[number];

export const ETIQUETA_LADO: Record<Lado, string> = {
  interno: "Interno",
  partner: "Partner",
  cliente: "Cliente",
};

export const CATEGORIAS_STACK = [
  "stt",
  "llm",
  "tts",
  "vad",
  "telefonia",
  "sip",
  "infra",
  "vector_db",
] as const;
export type CategoriaStack = (typeof CATEGORIAS_STACK)[number];

export const ETIQUETA_STACK: Record<CategoriaStack, string> = {
  stt: "STT",
  llm: "LLM",
  tts: "TTS",
  vad: "VAD",
  telefonia: "Telefonía",
  sip: "SIP",
  infra: "Infraestructura",
  vector_db: "Base vectorial",
};

/** Color de la fase, para el punto del sidebar y las pastillas. */
export function colorFase(fase: Fase): { fondo: string; texto: string; punto: string } {
  switch (fase) {
    case "produccion":
      return { fondo: "var(--acento-suave)", texto: "var(--acento)", punto: "var(--acento)" };
    case "uat":
    case "qa":
      return {
        fondo: "var(--oportunidad-suave)",
        texto: "var(--oportunidad)",
        punto: "var(--oportunidad)",
      };
    default:
      return {
        fondo: "var(--superficie-2)",
        texto: "var(--texto-2)",
        punto: "var(--texto-3)",
      };
  }
}

/** Color de la pastilla según el tipo de evento. */
export function colorEvento(tipo: TipoEvento): { fondo: string; texto: string } {
  switch (tipo) {
    case "incidencia":
    case "bloqueo":
    case "riesgo":
      return { fondo: "var(--riesgo-suave)", texto: "var(--riesgo)" };
    case "cambio_scope":
    case "feedback":
      return { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" };
    case "despliegue":
    case "decision":
    case "cambio_fase":
    case "cambio_stack":
      return { fondo: "var(--acento-suave)", texto: "var(--acento)" };
    default:
      return { fondo: "var(--superficie-2)", texto: "var(--texto-2)" };
  }
}

// ---------------------------------------------------------------- seguimiento

export const ESTADOS_SEGUIMIENTO = [
  "abierto",
  "en_curso",
  "resuelto",
  "descartado",
] as const;
export type EstadoSeguimiento = (typeof ESTADOS_SEGUIMIENTO)[number];

export const ETIQUETA_SEGUIMIENTO: Record<EstadoSeguimiento, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  descartado: "Descartado",
};

/**
 * Tipos que normalmente describen algo que sigue vivo. Solo determinan si la
 * casilla de seguimiento viene marcada por defecto: cualquier evento puede
 * llevar seguimiento, porque el tipo dice qué clase de cosa es y el estado
 * dice si sigue abierta, y son cosas distintas.
 */
export const TIPOS_SEGUIBLES: TipoEvento[] = [
  "incidencia",
  "bloqueo",
  "riesgo",
  "cambio_scope",
];

export function seguirPorDefecto(tipo: TipoEvento): boolean {
  return TIPOS_SEGUIBLES.includes(tipo);
}

export function colorSeguimiento(estado: EstadoSeguimiento): {
  fondo: string;
  texto: string;
} {
  switch (estado) {
    case "abierto":
      return { fondo: "var(--riesgo-suave)", texto: "var(--riesgo)" };
    case "en_curso":
      return { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" };
    case "resuelto":
      return { fondo: "var(--acento-suave)", texto: "var(--acento)" };
    default:
      return { fondo: "var(--superficie-2)", texto: "var(--texto-3)" };
  }
}

// ------------------------------------------------------------ inventario

export const TIPOS_CONTACTO_AGENTE = ["inbound", "outbound", "ambos"] as const;
export type TipoContactoAgente = (typeof TIPOS_CONTACTO_AGENTE)[number];

export const ETIQUETA_CONTACT_TYPE: Record<TipoContactoAgente, string> = {
  inbound: "Entrante",
  outbound: "Saliente",
  ambos: "Entrante y saliente",
};

export const ESTADOS_RECURSO = ["activo", "inactivo", "planeado"] as const;
export type EstadoRecurso = (typeof ESTADOS_RECURSO)[number];

export const ETIQUETA_ESTADO_RECURSO: Record<EstadoRecurso, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  planeado: "Planeado",
};

/** Verde solo lo que está vivo: un recurso inactivo no debe parecer sano. */
export function colorRecurso(estado: EstadoRecurso): { fondo: string; texto: string } {
  switch (estado) {
    case "activo":
      return { fondo: "var(--acento-suave)", texto: "var(--acento)" };
    case "planeado":
      return { fondo: "var(--oportunidad-suave)", texto: "var(--oportunidad)" };
    default:
      return { fondo: "var(--superficie-2)", texto: "var(--texto-3)" };
  }
}
