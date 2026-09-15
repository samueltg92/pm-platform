import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/consultas/clientes";
import {
  fichaCliente,
  servidoresCliente,
  sipCliente,
  integracionesCliente,
  stackCliente,
} from "@/lib/consultas/inventario";
import { lineaBaseCliente } from "@/lib/consultas/lineaBase";
import { resumenMensual } from "@/lib/consultas/metricas";
import { contactosCliente } from "@/lib/consultas/contactos";
import {
  guardarFicha,
  guardarServidor,
  borrarServidor,
  guardarSip,
  borrarSip,
  guardarIntegracion,
  borrarIntegracion,
  guardarStack,
  borrarStack,
} from "@/app/acciones";
import Inventario, {
  type CampoInventario,
  type ItemInventario,
} from "@/components/Inventario";
import ContactosCliente from "@/components/ContactosCliente";
import LineaBaseCard from "@/components/LineaBaseCard";
import Modal, { FormularioModal } from "@/components/Modal";
import Pastilla from "@/components/Pastilla";
import {
  ETIQUETA_FASE,
  TIPOS_CONTACTO_AGENTE,
  ETIQUETA_CONTACT_TYPE,
  CATEGORIAS_STACK,
  ETIQUETA_STACK,
} from "@/lib/dominio";
import { sesionActual } from "@/lib/auth";
import { puedeEditar as rolPuedeEditar } from "@/lib/roles";
import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import { traducirFilas, traducirFila } from "@/lib/traduccion";
import { original } from "@/lib/original";

export const dynamic = "force-dynamic";

/**
 * Los campos vienen del inventario que mantiene el partner. Se guardan los que
 * sirven para operar y diagnosticar —qué habla con qué, por qué puerto y hacia
 * dónde— y se dejan fuera los que en la hoja están siempre vacíos o repetidos
 * (Service NOW, la segunda columna de IP).
 */
const CAMPOS_SERVIDOR: CampoInventario[] = [
  { nombre: "server_name", etiqueta: "Nombre del servidor", placeholder: "TPCO-0000" },
  { nombre: "ambiente", etiqueta: "Ambiente", placeholder: "PROD" },
  { nombre: "cloud_provider", etiqueta: "Nube / on-premise", placeholder: "AWS" },
  { nombre: "app_origen", etiqueta: "Aplicación origen", ancho: 2, placeholder: "Quién consulta" },
  { nombre: "tipo_comunicacion", etiqueta: "Tipo de comunicación", placeholder: "Unidireccional" },
  { nombre: "host_origen", etiqueta: "Host origen", ancho: 2, multilinea: true },
  { nombre: "ip_origen", etiqueta: "IP origen", multilinea: true },
  { nombre: "protocolo", etiqueta: "Protocolo", placeholder: "TCP" },
  { nombre: "puerto", etiqueta: "Puerto", placeholder: "443" },
  { nombre: "owner_tecnico", etiqueta: "Owner técnico" },
  { nombre: "app_destino", etiqueta: "Aplicación destino" },
  { nombre: "host_destino", etiqueta: "Host destino", ancho: 2 },
  { nombre: "destino", etiqueta: "IP / URL de destino", ancho: 3, multilinea: true },
  { nombre: "servicio", etiqueta: "Endpoints que se consumen", ancho: 3, multilinea: true },
  { nombre: "notas", etiqueta: "Notas", ancho: 3, multilinea: true },
];

const CAMPOS_SIP: CampoInventario[] = [
  { nombre: "trunk_name", etiqueta: "Trunk", ancho: 2, placeholder: "TP Colombia Voicing" },
  { nombre: "sbc", etiqueta: "SBC" },
  { nombre: "did", etiqueta: "DID", ancho: 2, multilinea: true, placeholder: "Número, u Outbound" },
  { nombre: "vdn_desborde", etiqueta: "VDN de desborde" },
  { nombre: "tp_ip", etiqueta: "IP del partner", ancho: 2, multilinea: true },
  { nombre: "agent_ip", etiqueta: "IP del agente" },
  { nombre: "puerto", etiqueta: "Puerto" },
  { nombre: "transporte", etiqueta: "Transporte", placeholder: "UDP / TLS" },
  { nombre: "codec", etiqueta: "Códec", placeholder: "G.711" },
  { nombre: "transfer_destino", etiqueta: "Destino de transferencia", ancho: 3 },
  { nombre: "notas", etiqueta: "Notas", ancho: 3, multilinea: true },
];

/**
 * Qué modelo escucha, cuál razona y cuál habla. Sale de la plataforma de bots,
 * y es lo primero que se pregunta cuando una llamada suena mal.
 */
const CAMPOS_STACK: CampoInventario[] = [
  {
    nombre: "categoria",
    etiqueta: "Categoría",
    requerido: true,
    opciones: CATEGORIAS_STACK.map((c) => ({ valor: c, etiqueta: ETIQUETA_STACK[c] })),
  },
  { nombre: "proveedor", etiqueta: "Proveedor", requerido: true, placeholder: "OpenAI" },
  { nombre: "modelo", etiqueta: "Modelo o voz", placeholder: "gpt-4.1" },
  { nombre: "version", etiqueta: "Versión" },
  { nombre: "notas", etiqueta: "Notas", ancho: 3, multilinea: true },
];

const CAMPOS_INTEGRACION: CampoInventario[] = [
  { nombre: "sistema", etiqueta: "Sistema", ancho: 2, requerido: true, placeholder: "SFTP, CRM…" },
  { nombre: "tipo", etiqueta: "Tipo", placeholder: "REST API" },
  { nombre: "usuario", etiqueta: "Usuario o ruta", ancho: 2 },
  { nombre: "metodo", etiqueta: "Método", placeholder: "GET" },
  { nombre: "autenticacion", etiqueta: "Autenticación", placeholder: "OAuth2" },
  { nombre: "puerto", etiqueta: "Puerto" },
  { nombre: "ambiente", etiqueta: "Ambiente", placeholder: "PROD" },
  { nombre: "criticidad", etiqueta: "Criticidad", placeholder: "Crítica" },
  { nombre: "owner", etiqueta: "Owner", ancho: 2 },
  { nombre: "notas", etiqueta: "Datos de conexión y notas", ancho: 3, multilinea: true },
];

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="min-w-0">
      <dt className="etiqueta" style={{ marginBottom: "0.1rem" }}>
        {etiqueta}
      </dt>
      <dd className="text-xs" style={{ color: "var(--texto)", whiteSpace: "pre-wrap" }}>
        {valor}
      </dd>
    </div>
  );
}

export default async function InfoProyecto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const idioma = await leerIdioma();
  const t = crearTraductor(idioma);
  const { id } = await params;

  const sesion = await sesionActual();
  const editable = sesion ? rolPuedeEditar(sesion.rol) : false;

  const [cliente, fichaOriginal, servidoresO, sipsO, integracionesO, stackO, base, meses, contactosO] =
    await Promise.all([
      obtenerCliente(id),
      fichaCliente(id),
      servidoresCliente(id),
      sipCliente(id),
      integracionesCliente(id),
      stackCliente(id),
      lineaBaseCliente(id),
      resumenMensual(id, 1),
      contactosCliente(id),
    ]);

  if (!cliente) notFound();

  // Todo lo que es prosa se pinta traducido; lo técnico (hosts, IPs, trunks,
  // modelos) no se toca. Los formularios leen el original con `original()`.
  const [ficha, servidores, sips, integraciones, stack, contactos] = await Promise.all([
    traducirFila(idioma, fichaOriginal, ["caso_uso", "proceso", "observaciones"]),
    traducirFilas(idioma, servidoresO, ["notas", "tipo_comunicacion"]),
    traducirFilas(idioma, sipsO, ["notas"]),
    traducirFilas(idioma, integracionesO, ["notas", "criticidad"]),
    traducirFilas(idioma, stackO, ["notas"]),
    traducirFilas(idioma, contactosO, ["rol", "notas"]),
  ]);

  return (
    <>
      {/* ------------------------------------------------------------- ficha */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h2 className="titulo-seccion">{t("El proyecto")}</h2>
          {editable && (
            <Modal
              etiqueta={ficha ? t("Editar") : t("Completar ficha")}
              titulo={t("Ficha del proyecto")}
              descripcion={t("Qué es este proyecto y cómo opera.")}
              icono={ficha ? "editar" : "mas"}
              variante={ficha ? "suave" : "principal"}
            >
              <FormularioModal accion={guardarFicha} confirmacion={t("Guardado")}>
                <input type="hidden" name="cliente_id" value={id} />
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="etiqueta">{t("Código")}</label>
                    <input
                      name="codigo"
                      className="campo"
                      placeholder="AI-000"
                      defaultValue={ficha?.codigo ?? ""}
                    />
                  </div>
                  <div>
                    <label className="etiqueta">{t("Caso de uso")}</label>
                    <input
                      name="caso_uso"
                      className="campo"
                      placeholder={t("Servicio al cliente")}
                      defaultValue={original(ficha, "caso_uso")}
                    />
                  </div>
                  <div>
                    <label className="etiqueta">{t("Tipo de contacto")}</label>
                    <select
                      name="contact_type"
                      className="campo"
                      defaultValue={ficha?.contact_type ?? ""}
                    >
                      <option value="">{t("Sin definir")}</option>
                      {TIPOS_CONTACTO_AGENTE.map((tc) => (
                        <option key={tc} value={tc}>
                          {t(ETIQUETA_CONTACT_TYPE[tc])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="etiqueta">{t("Ambiente")}</label>
                    <input
                      name="ambiente"
                      className="campo"
                      placeholder="PROD"
                      defaultValue={ficha?.ambiente ?? ""}
                    />
                  </div>
                  <div>
                    <label className="etiqueta">{t("País o región")}</label>
                    <input name="pais" className="campo" defaultValue={ficha?.pais ?? ""} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="etiqueta">{t("Qué hace el agente")}</label>
                    <textarea
                      name="proceso"
                      rows={4}
                      className="campo"
                      defaultValue={original(ficha, "proceso")}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="etiqueta">{t("Observaciones")}</label>
                    <textarea
                      name="observaciones"
                      rows={2}
                      className="campo"
                      defaultValue={original(ficha, "observaciones")}
                    />
                  </div>
                </div>
                <button type="submit" className="boton">
                  {t("Guardar")}
                </button>
              </FormularioModal>
            </Modal>
          )}
        </div>

        <div className="tarjeta px-4 py-3.5">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {ficha?.codigo && <Pastilla>{ficha.codigo}</Pastilla>}
            <Pastilla>{t(ETIQUETA_FASE[cliente.fase])}</Pastilla>
            {ficha?.contact_type && (
              <Pastilla fondo="var(--acento-suave)" texto="var(--acento)">
                {t(ETIQUETA_CONTACT_TYPE[ficha.contact_type])}
              </Pastilla>
            )}
            {ficha?.ambiente && <Pastilla>{ficha.ambiente}</Pastilla>}
          </div>

          {ficha ? (
            <dl className="grid sm:grid-cols-3 gap-x-4 gap-y-2.5">
              <Dato etiqueta={t("Caso de uso")} valor={ficha.caso_uso} />
              <Dato etiqueta={t("País o región")} valor={ficha.pais} />
              <Dato etiqueta={t("Partner")} valor={cliente.partner_nombre} />
              {ficha.proceso && (
                <div className="sm:col-span-3">
                  <Dato etiqueta={t("Qué hace el agente")} valor={ficha.proceso} />
                </div>
              )}
              {ficha.observaciones && (
                <div className="sm:col-span-3">
                  <Dato etiqueta={t("Observaciones")} valor={ficha.observaciones} />
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm" style={{ color: "var(--texto-2)" }}>
              {t("Sin ficha todavía. El caso de uso y el tipo de contacto se definen aquí.")}
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- métricas */}
      <section className="mb-8">
        <h2 className="titulo-seccion mb-2.5">{t("Métricas esperadas")}</h2>
        <LineaBaseCard clienteId={id} base={base} mes={meses[0] ?? null} />
      </section>

      {/* -------------------------------------------------------- inventario */}
      <Inventario
        titulo="Stack de voz"
        descripcion="Qué modelo escucha, cuál razona y cuál habla."
        etiquetaAlta="Añadir pieza"
        vacio="Sin stack registrado."
        campos={CAMPOS_STACK}
        titular={["proveedor"]}
        items={stack as unknown as ItemInventario[]}
        clienteId={id}
        guardar={guardarStack}
        borrar={borrarStack}
        puedeEditar={editable}
        t={t}
      />

      <Inventario
        titulo="Servidores de aplicación"
        descripcion="Qué habla con qué, por qué puerto y hacia dónde."
        etiquetaAlta="Añadir servidor"
        vacio="Sin servidores registrados."
        campos={CAMPOS_SERVIDOR}
        titular={["server_name", "app_origen", "host_origen"]}
        items={servidores as unknown as ItemInventario[]}
        clienteId={id}
        guardar={guardarServidor}
        borrar={borrarServidor}
        puedeEditar={editable}
        t={t}
      />

      <Inventario
        titulo="Telefonía SIP"
        descripcion="Trunks, DID y por dónde entra o sale la llamada."
        etiquetaAlta="Añadir trunk"
        vacio="Sin configuración SIP registrada."
        campos={CAMPOS_SIP}
        titular={["trunk_name", "sbc"]}
        items={sips as unknown as ItemInventario[]}
        clienteId={id}
        guardar={guardarSip}
        borrar={borrarSip}
        puedeEditar={editable}
        t={t}
      />

      <Inventario
        titulo="Integraciones externas"
        descripcion="Sistemas de terceros. No guardes contraseñas aquí: esto no se cifra."
        etiquetaAlta="Añadir integración"
        vacio="Sin integraciones registradas."
        campos={CAMPOS_INTEGRACION}
        titular={["sistema"]}
        items={integraciones as unknown as ItemInventario[]}
        clienteId={id}
        guardar={guardarIntegracion}
        borrar={borrarIntegracion}
        puedeEditar={editable}
        t={t}
      />

      {/* --------------------------------------------------------- contactos */}
      <ContactosCliente clienteId={id} contactos={contactos} puedeEditar={editable} t={t} />
    </>
  );
}
