/**
 * Iconografía propia, trazo de 1.5 sobre rejilla de 16.
 *
 * Los emoji que había antes cambian de forma según el sistema operativo, no
 * heredan el color del texto y delatan que nadie eligió nada. Un juego corto y
 * consistente hace más por que esto parezca un producto que cualquier otra
 * cosa del rediseño.
 */
export type NombreIcono =
  | "mas"
  | "buscar"
  | "editar"
  | "borrar"
  | "adjuntar"
  | "calendario"
  | "check"
  | "alerta"
  | "reloj"
  | "flecha"
  | "cerrar"
  | "equipo"
  | "descargar"
  | "hilo"
  | "vacio"
  | "sol"
  | "luna"
  | "pantalla";

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  mas: <path d="M8 3.5v9M3.5 8h9" />,
  buscar: (
    <>
      <circle cx="7.2" cy="7.2" r="3.9" />
      <path d="M10.2 10.2 13 13" />
    </>
  ),
  editar: <path d="M11.2 2.8 13.2 4.8 5.6 12.4 2.8 13.2 3.6 10.4z" />,
  borrar: (
    <>
      <path d="M2.8 4.4h10.4M6.4 4.4V3.2h3.2v1.2M4 4.4l.6 8.4h6.8l.6-8.4" />
      <path d="M6.6 7v3.4M9.4 7v3.4" />
    </>
  ),
  adjuntar: <path d="M12.2 7.6 7.4 12.4a2.9 2.9 0 0 1-4.1-4.1l5.4-5.4a1.9 1.9 0 0 1 2.7 2.7l-5.4 5.4a.9.9 0 0 1-1.3-1.3l4.8-4.8" />,
  calendario: (
    <>
      <rect x="2.6" y="3.6" width="10.8" height="9.8" rx="1.4" />
      <path d="M2.6 6.6h10.8M5.6 2.4v2.4M10.4 2.4v2.4" />
    </>
  ),
  check: <path d="M3.2 8.4 6.4 11.6 12.8 4.8" />,
  alerta: (
    <>
      <path d="M8 2.6 14.2 13H1.8z" />
      <path d="M8 6.6v3M8 11.4v.1" />
    </>
  ),
  reloj: (
    <>
      <circle cx="8" cy="8" r="5.4" />
      <path d="M8 4.8V8l2.2 1.6" />
    </>
  ),
  flecha: <path d="M3.2 8h9.6M9 4.2 12.8 8 9 11.8" />,
  cerrar: <path d="M4 4l8 8M12 4l-8 8" />,
  equipo: (
    <>
      <circle cx="6.2" cy="6" r="2.4" />
      <path d="M2.2 13.4c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6" />
      <path d="M10.8 4.2a2.2 2.2 0 0 1 0 4.2M11.6 13.4c0-1.6-.5-2.6-1.3-3.2" />
    </>
  ),
  descargar: <path d="M8 2.8v7.4M5 7.4 8 10.4l3-3M3 12.6h10" />,
  hilo: (
    <>
      <path d="M2.8 4.4h10.4M2.8 8h7.4M2.8 11.6h4.6" />
    </>
  ),
  sol: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1" />
    </>
  ),
  luna: <path d="M12.6 10.2A5.4 5.4 0 0 1 5.8 3.4a5.4 5.4 0 1 0 6.8 6.8z" />,
  pantalla: (
    <>
      <rect x="2.2" y="3" width="11.6" height="7.8" rx="1.2" />
      <path d="M6 13.2h4M8 10.8v2.4" />
    </>
  ),
  vacio: (
    <>
      <rect x="2.6" y="3.4" width="10.8" height="9.2" rx="1.4" />
      <path d="M5.6 8h4.8" />
    </>
  ),
};

export default function Icono({
  nombre,
  tam = 14,
  className,
}: {
  nombre: NombreIcono;
  tam?: number;
  className?: string;
}) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
