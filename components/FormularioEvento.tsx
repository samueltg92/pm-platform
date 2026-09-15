"use client";

import { useRef, useState } from "react";
import { useCerrarModal } from "./Modal";
import { useAvisar } from "./Avisos";
import { crearEvento } from "@/app/acciones";
import { LIMITE_BYTES, MAX_ARCHIVOS_POR_SUBIDA, tamanoLegible } from "@/lib/adjuntos";
import Icono from "./Icono";
import {
  TIPOS_EVENTO_MANUAL,
  SEVERIDADES,
  ETIQUETA_EVENTO,
  ETIQUETA_SEVERIDAD,
  colorEvento,
  seguirPorDefecto,
  type TipoEvento,
} from "@/lib/dominio";

import { useT } from "@/components/Idioma";
/**
 * Registro rápido. Los tipos son botones y no un desplegable a propósito:
 * un clic menos multiplicado por varias entradas al día es lo que hace que
 * el hábito se sostenga.
 */
export default function FormularioEvento({
  clienteId,
  hoy,
  clientes,
  redirigir = false,
}: {
  clienteId?: string;
  hoy: string;
  /** Si se pasan, el formulario pide a qué cliente va. */
  clientes?: { id: string; nombre: string }[];
  redirigir?: boolean;
}) {
  const t = useT();
  const formulario = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoEvento>("nota");
  const [seguir, setSeguir] = useState(seguirPorDefecto("nota"));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cerrarModal = useCerrarModal();
  const avisar = useAvisar();

  return (
    <form
      ref={formulario}
      action={async (datos) => {
        setGuardando(true);
        setError(null);
        try {
          await crearEvento(datos);
          formulario.current?.reset();
          setTipo("nota");
          setSeguir(seguirPorDefecto("nota"));
          cerrarModal();
          avisar(t("Registrado"));
        } catch (e) {
          if (
            typeof e === "object" && e !== null && "digest" in e &&
            String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
          ) throw e;
          setError(e instanceof Error ? t(e.message) : t("No se pudo registrar"));
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-3"
    >
      {clientes ? (
        <div>
          <label className="etiqueta" htmlFor="cliente_id">
            {t("Cliente")}
          </label>
          <select id="cliente_id" name="cliente_id" required className="campo" defaultValue="">
            <option value="" disabled>
              {t("Elige un cliente")}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="cliente_id" value={clienteId} />
      )}
      {redirigir && <input type="hidden" name="redirigir" value="1" />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="seguir" value={seguir ? "si" : "no"} />

      <div className="flex flex-wrap gap-1.5">
        {TIPOS_EVENTO_MANUAL.map((opcion) => {
          const activo = tipo === opcion;
          const color = colorEvento(opcion);
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => {
                setTipo(opcion);
                setSeguir(seguirPorDefecto(opcion));
              }}
              className="pastilla"
              style={{
                background: activo ? color.fondo : "transparent",
                color: activo ? color.texto : "var(--texto-3)",
                border: `1px solid ${activo ? "transparent" : "var(--borde)"}`,
              }}
            >
              {t(ETIQUETA_EVENTO[opcion])}
            </button>
          );
        })}
      </div>

      <input
        name="titulo"
        required
        className="campo"
        placeholder={t("Qué pasó")}
        autoComplete="off"
      />

      <textarea name="cuerpo" rows={2} className="campo" placeholder={t("Detalle (opcional)")} />

      {/* Los archivos van plegados: se usan en una de cada diez entradas y,
          desplegados, pesaban más en la pantalla que el propio texto. */}
      <details className="accion">
        <summary>
          <Icono nombre="adjuntar" tam={12} />
          {t("Adjuntar archivo")}
        </summary>
        <div>
          <input
            id="archivos"
            type="file"
            name="archivos"
            multiple
            className="text-xs w-full"
            style={{ color: "var(--texto-2)" }}
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--texto-3)" }}>
            {t("hasta")} {MAX_ARCHIVOS_POR_SUBIDA}, {tamanoLegible(LIMITE_BYTES)}{" "}
            {t("cada uno")}
          </p>
        </div>
      </details>

      {error && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="etiqueta">{t("Fecha")}</label>
          <input type="date" name="fecha_evento" defaultValue={hoy} className="campo" />
        </div>
        <div className="w-32">
          <label className="etiqueta">{t("Severidad")}</label>
          <select name="severidad" className="campo" defaultValue="info">
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>
                {t(ETIQUETA_SEVERIDAD[s])}
              </option>
            ))}
          </select>
        </div>
        <label
          className="flex items-center gap-1.5 text-sm cursor-pointer select-none pb-2"
          style={{ color: "var(--texto-2)" }}
          title={t("Queda como asunto abierto hasta que lo cierres")}
        >
          <input
            type="checkbox"
            checked={seguir}
            onChange={(e) => setSeguir(e.target.checked)}
          />{t("Hacer seguimiento")}</label>

        <button type="submit" className="boton ml-auto" disabled={guardando}>
          {guardando ? t("Guardando…") : t("Registrar")}
        </button>
      </div>
    </form>
  );
}
