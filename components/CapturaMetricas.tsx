"use client";

import { useState } from "react";
import { guardarMetricasDia } from "@/app/acciones";
import type { MetricaDia } from "@/lib/consultas/metricas";
import { interpretarBloque } from "@/lib/metricasTexto";
import { useAvisar } from "./Avisos";

import { useT } from "@/components/Idioma";
type Fila = {
  llamadas: string;
  minutos: string;
  contencion: string;
  sinActividad: boolean;
};

function inicial(m: MetricaDia): Fila {
  return {
    llamadas: m.llamadas_totales?.toString() ?? "",
    minutos: m.duracion_total_min ?? "",
    contencion: m.contencion_pct ?? "",
    sinActividad: m.sin_actividad,
  };
}

/**
 * Captura del día. Tres números por cliente y poco más: cada campo extra aquí
 * se paga todos los días.
 */
export default function CapturaMetricas({
  fecha,
  clientes,
}: {
  fecha: string;
  clientes: MetricaDia[];
}) {
  const t = useT();
  const [filas, setFilas] = useState<Record<string, Fila>>(() =>
    Object.fromEntries(clientes.map((c) => [c.cliente_id, inicial(c)])),
  );
  const [pegado, setPegado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const avisar = useAvisar();

  function cambiar(id: string, parcial: Partial<Fila>) {
    setFilas((previo) => ({ ...previo, [id]: { ...previo[id], ...parcial } }));
  }

  /**
   * Interpreta un bloque tipo `Acme 1240 3720 71`. El nombre puede llevar
   * espacios: se toman los últimos números de la línea y el resto es el nombre.
   */
  function interpretar() {
    const { lineas, reconocidos, ignorados } = interpretarBloque(
      pegado,
      clientes.map((c) => ({ id: c.cliente_id, nombre: c.cliente_nombre })),
    );

    const nuevas = { ...filas };
    for (const linea of lineas) {
      nuevas[linea.clienteId] = {
        llamadas: linea.llamadas,
        minutos: linea.minutos,
        contencion: linea.contencion,
        sinActividad: false,
      };
    }
    setFilas(nuevas);

    setAviso(
      [
        reconocidos.length ? `${t("Reconocidos:")} ${reconocidos.join(", ")}.` : null,
        ignorados.length ? `${t("Sin reconocer:")} ${ignorados.join(" · ")}.` : null,
      ]
        .filter(Boolean)
        .join(" ") || t("No se reconoció ninguna línea."),
    );
  }

  return (
    <form
      action={async (datos) => {
        setGuardando(true);
        setError(null);
        try {
          await guardarMetricasDia(datos);
          setAviso(null);
          avisar(t("Día guardado"));
        } catch (e) {
          setError(e instanceof Error ? t(e.message) : t("No se pudo guardar"));
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="fecha" value={fecha} />

      <details className="tarjeta">
        <summary
          className="px-4 py-2.5 text-sm cursor-pointer select-none"
          style={{ color: "var(--texto-2)" }}
        >{t("Pegar bloque")}</summary>
        <div className="px-4 pb-4 pt-1 space-y-2">
          <textarea
            rows={4}
            className="campo font-mono text-xs"
            placeholder={"Acme 1240 3720 71\nOtro Cliente 890 2100 65"}
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
          />
          <p className="text-xs" style={{ color: "var(--texto-3)" }}>
            {t("Nombre, llamadas, minutos y contención. Separados por espacios, comas o tabuladores — sirve pegar directo desde una hoja de cálculo.")}
          </p>
          <button type="button" onClick={interpretar} className="boton-suave">{t("Rellenar campos")}</button>
        </div>
      </details>

      <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
        {clientes.map((c) => {
          const fila = filas[c.cliente_id];
          const registrado = c.fecha !== null;
          return (
            <div key={c.cliente_id} className="px-4 py-3" style={{ borderColor: "var(--borde)" }}>
              <input type="hidden" name="cliente_id" value={c.cliente_id} />

              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="font-medium text-sm">{c.cliente_nombre}</span>
                <label
                  className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                  style={{ color: "var(--texto-2)" }}
                >
                  <input
                    type="checkbox"
                    name={`sin_actividad_${c.cliente_id}`}
                    checked={fila.sinActividad}
                    onChange={(e) =>
                      cambiar(c.cliente_id, { sinActividad: e.target.checked })
                    }
                  />{t("Sin actividad")}</label>
              </div>

              {!fila.sinActividad && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="etiqueta">{t("Llamadas")}</label>
                    <input
                      name={`llamadas_${c.cliente_id}`}
                      inputMode="numeric"
                      className="campo"
                      value={fila.llamadas}
                      onChange={(e) => cambiar(c.cliente_id, { llamadas: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="etiqueta">{t("Minutos")}</label>
                    <input
                      name={`minutos_${c.cliente_id}`}
                      inputMode="decimal"
                      className="campo"
                      value={fila.minutos}
                      onChange={(e) => cambiar(c.cliente_id, { minutos: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="etiqueta">{t("Contención %")}</label>
                    <input
                      name={`contencion_${c.cliente_id}`}
                      inputMode="decimal"
                      className="campo"
                      value={fila.contencion}
                      onChange={(e) =>
                        cambiar(c.cliente_id, { contencion: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {registrado && (
                <p className="text-xs mt-1.5" style={{ color: "var(--texto-3)" }}>{t("Ya había registro para este día. Guardar lo reemplaza.")}</p>
              )}
            </div>
          );
        })}
      </div>

      {aviso && (
        <p className="text-sm" style={{ color: "var(--texto-2)" }}>
          {aviso}
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {error}
        </p>
      )}

      <button type="submit" className="boton" disabled={guardando}>
        {guardando ? t("Guardando…") : t("Guardar el día")}
      </button>
    </form>
  );
}
