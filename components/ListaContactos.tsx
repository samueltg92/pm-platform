"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Pastilla from "./Pastilla";
import Icono from "./Icono";
import { useT } from "./Idioma";
import { normalizar, type Persona } from "@/lib/contactos";
import { ETIQUETA_LADO, LADOS, colorFase, type Fase, type Lado } from "@/lib/dominio";

type Proyecto = { id: string; nombre: string; fase: Fase };

/**
 * La agenda entera en una pantalla.
 *
 * El filtro es de cliente y no de servidor: son unas decenas de personas y lo
 * que se busca aquí es un nombre a medio recordar, así que lo que importa es
 * que la lista se estreche mientras se teclea.
 */
export default function ListaContactos({
  personas,
  proyectos,
  enlazarProyectos = true,
}: {
  personas: Persona[];
  proyectos: Proyecto[];
  /** El rol de solo contactos ve los proyectos pero no puede abrirlos. */
  enlazarProyectos?: boolean;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const [lado, setLado] = useState<Lado | null>(null);

  const porProyecto = useMemo(
    () => new Map(proyectos.map((p) => [p.id, p])),
    [proyectos],
  );

  const visibles = useMemo(() => {
    const buscado = normalizar(texto);
    return personas.filter((persona) => {
      if (lado && !persona.lados.includes(lado)) return false;
      if (!buscado) return true;
      // Se busca por lo que uno recuerda: el nombre, el rol, el correo o el
      // proyecto en el que lo conoció.
      const heno = normalizar(
        [
          persona.nombre,
          ...persona.roles,
          ...persona.emails,
          ...persona.apariciones.map((a) => a.clienteNombre),
        ].join(" "),
      );
      // Un número se busca por sus dígitos: "3001234" encuentra "+57 300 123 4567".
      const digitos = texto.replace(/[^0-9]/g, "");
      if (digitos.length >= 3 && persona.telefonos.some((t) => t.replace(/[^0-9]/g, "").includes(digitos))) {
        return true;
      }
      return heno.includes(buscado);
    });
  }, [personas, texto, lado]);

  const enVarios = personas.filter((p) => p.apariciones.length > 1).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1" style={{ minWidth: "14rem", maxWidth: "22rem" }}>
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--texto-3)" }}
          >
            <Icono nombre="buscar" tam={14} />
          </span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t("Buscar por nombre, rol, correo, teléfono o proyecto")}
            className="campo"
            style={{ paddingLeft: "2rem" }}
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setLado(null)}
            className="pastilla"
            style={{
              background: lado === null ? "var(--acento-suave)" : "var(--superficie)",
              color: lado === null ? "var(--acento)" : "var(--texto-2)",
              border: "1px solid var(--borde)",
              cursor: "pointer",
            }}
          >
            {t("Todos")}
          </button>
          {LADOS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLado(lado === l ? null : l)}
              className="pastilla"
              style={{
                background: lado === l ? "var(--acento-suave)" : "var(--superficie)",
                color: lado === l ? "var(--acento)" : "var(--texto-2)",
                border: "1px solid var(--borde)",
                cursor: "pointer",
              }}
            >
              {t(ETIQUETA_LADO[l])}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: "var(--texto-2)" }}>
        {visibles.length === personas.length
          ? `${personas.length} ${personas.length === 1 ? t("persona") : t("personas")}`
          : `${visibles.length} de ${personas.length}`}
        {enVarios > 0 && visibles.length === personas.length && (
          <span style={{ color: "var(--texto-3)" }}>
            {" · "}
            {enVarios} {t("en más de un proyecto")}
          </span>
        )}
      </p>

      {visibles.length === 0 ? (
        <div className="tarjeta px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--texto-2)" }}>
            {t("Nadie coincide con eso.")}
          </p>
        </div>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {visibles.map((persona) => (
            <div
              key={persona.clave}
              className="px-4 py-3"
              style={{ borderColor: "var(--borde)" }}
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium">{persona.nombre}</span>
                {persona.lados.map((l) => (
                  <Pastilla key={l}>{t(ETIQUETA_LADO[l])}</Pastilla>
                ))}
                {persona.roles.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--texto-2)" }}>
                    {persona.roles.join(" · ")}
                  </span>
                )}
              </div>

              {persona.telefonos.length > 0 && (
                <p className="text-xs mt-1 num" style={{ color: "var(--texto-3)" }}>
                  {persona.telefonos.map((tel, i) => (
                    <span key={tel}>
                      {i > 0 && " · "}
                      <a href={`tel:${tel.replace(/[^0-9+]/g, "")}`} className="hover:underline">
                        {tel}
                      </a>
                    </span>
                  ))}
                </p>
              )}

              {persona.emails.length > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--texto-3)" }}>
                  {persona.emails.map((email, i) => (
                    <span key={email}>
                      {i > 0 && " · "}
                      <a href={`mailto:${email}`} className="hover:underline">
                        {email}
                      </a>
                    </span>
                  ))}
                  {/* Dos correos para la misma persona casi siempre es una
                      ficha mal copiada, y conviene que se note. */}
                  {persona.emails.length > 1 && (
                    <span style={{ color: "var(--oportunidad)" }}>
                      {" · "}
                      {persona.emails.length} {t("correos registrados")}
                    </span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2">
                {persona.apariciones.map((aparicion) => {
                  const proyecto = porProyecto.get(aparicion.clienteId);
                  const color = proyecto
                    ? colorFase(proyecto.fase)
                    : { fondo: "var(--superficie-2)", texto: "var(--texto-2)", punto: "var(--texto-3)" };
                  const estilo = { background: color.fondo, color: color.texto };
                  return enlazarProyectos ? (
                    <Link
                      key={aparicion.id}
                      href={`/clientes/${aparicion.clienteId}/info`}
                      className="pastilla"
                      style={estilo}
                      title={t("Ver los contactos de este proyecto")}
                    >
                      {aparicion.clienteNombre}
                    </Link>
                  ) : (
                    <span key={aparicion.id} className="pastilla" style={estilo}>
                      {aparicion.clienteNombre}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
