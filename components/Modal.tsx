"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * `redirect()` de Next señala la navegación lanzando. Si el catch se la traga,
 * el usuario ve un error donde debería haber un cambio de página.
 */
function esRedireccion(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
import Icono, { type NombreIcono } from "./Icono";
import { useT } from "./Idioma";
import { useAvisar } from "./Avisos";

const Cerrar = createContext<() => void>(() => {});

/** Para que un formulario dentro del modal se cierre solo al guardar. */
export function useCerrarModal() {
  return useContext(Cerrar);
}

/**
 * Crear algo es una tarea con principio y fin, no una parte permanente de la
 * pantalla. Como formulario fijo empujaba hacia abajo lo que hay que leer y
 * competía con ello; en un modal ocupa el centro mientras dura y desaparece.
 *
 * El desenfoque del fondo no es adorno: quita del campo visual todo lo que en
 * ese momento no se puede tocar.
 */
export default function Modal({
  etiqueta,
  titulo,
  descripcion,
  icono = "mas",
  variante = "suave",
  className,
  children,
}: {
  etiqueta: string;
  titulo?: string;
  descripcion?: string;
  icono?: NombreIcono;
  variante?: "principal" | "suave";
  /** Para el disparador, cuando el sitio pide otro ancho. */
  className?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", teclas);

    // El foco entra al primer campo: quien abre un formulario quiere escribir.
    const primero = panel.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), textarea, select",
    );
    primero?.focus();

    return () => window.removeEventListener("keydown", teclas);
  }, [abierto]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${variante === "principal" ? "boton" : "boton-suave"} ${className ?? ""}`}
      >
        <Icono nombre={icono} tam={13} />
        {etiqueta}
      </button>
    );
  }

  /**
   * Se monta en el body y no donde está el botón. Un ancestro con `transform`
   * —el menú lateral lo tiene para deslizarse en móvil— convierte cualquier
   * `position: fixed` de dentro en `absolute` relativo a él: el modal quedaba
   * encajado en la columna izquierda y solo desenfocaba esa franja.
   */
  return createPortal(
    <>
      <button
        type="button"
        aria-label={t("Cerrar")}
        className="velo"
        style={{
          backdropFilter: "blur(6px) saturate(0.9)",
          WebkitBackdropFilter: "blur(6px) saturate(0.9)",
        }}
        onClick={() => setAbierto(false)}
      />
      <div
        ref={panel}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo ?? etiqueta}
      >
        <header>
          <div className="min-w-0">
            <h2 className="titulo-seccion">{titulo ?? etiqueta}</h2>
            {descripcion && (
              <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                {descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            style={{ color: "var(--texto-3)" }}
            aria-label={t("Cerrar")}
          >
            <Icono nombre="cerrar" tam={16} />
          </button>
        </header>

        <div className="cuerpo">
          <Cerrar.Provider value={() => setAbierto(false)}>{children}</Cerrar.Provider>
        </div>
      </div>
    </>,
    document.body,
  );
}

/**
 * Formulario que cierra el modal al terminar. El cierre va después de que la
 * acción resuelva: si falla, el modal se queda abierto con lo escrito dentro.
 */
export function FormularioModal({
  accion,
  confirmacion,
  children,
  className = "space-y-3",
}: {
  accion: (datos: FormData) => Promise<void>;
  /** El aviso que se muestra al terminar. Mismo verbo que el botón. */
  confirmacion?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cerrar = useCerrarModal();
  const avisar = useAvisar();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [, setEnviando] = useState(false);

  return (
    <form
      className={className}
      action={async (datos) => {
        setEnviando(true);
        setError(null);
        try {
          await accion(datos);
          cerrar();
          if (confirmacion) avisar(confirmacion);
        } catch (e) {
          if (esRedireccion(e)) throw e;
          setError(e instanceof Error ? t(e.message) : t("No se pudo guardar"));
        } finally {
          setEnviando(false);
        }
      }}
    >
      {children}
      {error && (
        <p className="text-sm" style={{ color: "var(--riesgo)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
