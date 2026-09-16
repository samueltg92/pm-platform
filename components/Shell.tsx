"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colorFase, ETIQUETA_FASE, type Fase } from "@/lib/dominio";
import Buscador from "./Buscador";
import Modal from "./Modal";
import FormularioEvento from "./FormularioEvento";
import SelectorPreferencias from "./SelectorPreferencias";
import type { Idioma, Tema } from "@/lib/preferencias";

import { useT } from "@/components/Idioma";
export type ClienteSidebar = {
  id: string;
  nombre: string;
  fase: Fase;
  abiertos: number;
};

const SECCIONES = [
  { href: "/", etiqueta: "Hoy" },
  { href: "/metricas", etiqueta: "Métricas" },
  { href: "/hitos", etiqueta: "Hitos" },
  { href: "/compromisos", etiqueta: "Compromisos" },
  { href: "/contactos", etiqueta: "Contactos" },
];

function Item({
  href,
  activo,
  children,
  onNavegar,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
  onNavegar: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavegar}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors"
      style={{
        background: activo ? "var(--acento-suave)" : "transparent",
        color: activo ? "var(--acento)" : "var(--texto-2)",
        fontWeight: activo ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Sidebar persistente con los clientes siempre a la vista, para saltar de uno
 * a otro sin pasar por la lista. En móvil se convierte en cajón.
 */
export default function Shell({
  clientes,
  usuario,
  hoy,
  esAdmin,
  puedeRegistrar,
  salir,
  tema,
  idioma,
  soloContactos = false,
  children,
}: {
  clientes: ClienteSidebar[];
  usuario: string;
  /** La fecha de hoy en la zona de la app, calculada en servidor. */
  hoy: string;
  esAdmin: boolean;
  puedeRegistrar: boolean;
  salir: React.ReactNode;
  tema: Tema;
  idioma: Idioma;
  /** Rol que solo ve la agenda: el menú no ofrece nada más. */
  soloContactos?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");

  const visibles = filtro.trim()
    ? clientes.filter((c) =>
        c.nombre.toLowerCase().includes(filtro.trim().toLowerCase()),
      )
    : clientes;

  const cerrar = () => setAbierto(false);

  return (
    <div className="min-h-screen flex">
      {/* Cajón en móvil */}
      {abierto && (
        <button
          type="button"
          aria-label={t("Cerrar menú")}
          onClick={cerrar}
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,.4)" }}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 flex flex-col transition-transform lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--superficie-2)",
          borderRight: "1px solid var(--borde)",
        }}
      >
        <div className="px-4 h-14 flex items-center shrink-0">
          <Link href="/" onClick={cerrar} className="font-semibold tracking-tight">{t("PM Platform")}</Link>
        </div>

        <div className="px-2 pb-2 space-y-2">
          {puedeRegistrar && (
            <Modal
              etiqueta={t("Registrar")}
              titulo={t("Nuevo registro")}
              descripcion={t("Elige el cliente y escribe lo que pasó.")}
              variante="principal"
              className="w-full"
            >
              <FormularioEvento
                hoy={hoy}
                redirigir
                clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
              />
            </Modal>
          )}
          {!soloContactos && <Buscador />}
        </div>

        <nav className="px-2 space-y-0.5">
          {SECCIONES.filter((s) => !soloContactos || s.href === "/contactos").map((s) => (
            <Item
              key={s.href}
              href={s.href}
              activo={s.href === "/" ? ruta === "/" : ruta.startsWith(s.href)}
              onNavegar={cerrar}
            >
              {t(s.etiqueta)}
            </Item>
          ))}
        </nav>

        {!soloContactos && (
        <>
        <div className="mt-6 px-4 flex items-center justify-between">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--texto-3)" }}
          >{t("Clientes")}</span>
          {puedeRegistrar && (
            <Link
              href="/clientes/nuevo"
              onClick={cerrar}
              className="text-sm leading-none"
              style={{ color: "var(--texto-3)" }}
              title={t("Nuevo cliente")}
            >
              +
            </Link>
          )}
        </div>

        {clientes.length > 6 && (
          <div className="px-2 mt-2">
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={t("Filtrar")}
              className="campo"
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.8125rem" }}
            />
          </div>
        )}

        <div className="px-2 mt-2 space-y-0.5 overflow-y-auto flex-1 pb-4">
          {visibles.map((c) => {
            const activo = ruta.startsWith(`/clientes/${c.id}`);
            const color = colorFase(c.fase);
            return (
              <Item key={c.id} href={`/clientes/${c.id}`} activo={activo} onNavegar={cerrar}>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: color.punto }}
                  title={t(ETIQUETA_FASE[c.fase])}
                />
                <span className="truncate flex-1">{c.nombre}</span>
                {c.abiertos > 0 && (
                  <span
                    className="text-xs px-1.5 rounded-full shrink-0"
                    style={{ background: "var(--riesgo-suave)", color: "var(--riesgo)" }}
                    title={t("Asuntos abiertos")}
                  >
                    {c.abiertos}
                  </span>
                )}
              </Item>
            );
          })}

          <Link
            href="/clientes"
            onClick={cerrar}
            className="block px-2.5 py-1.5 text-xs"
            style={{ color: "var(--texto-3)" }}
          >{t("Ver todos")}</Link>
        </div>
        </>
        )}
        {soloContactos && <div className="flex-1" />}

        <div className="shrink-0" style={{ borderTop: "1px solid var(--borde)" }}>
          <SelectorPreferencias tema={tema} idioma={idioma} />
        </div>

        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{ borderTop: "1px solid var(--borde)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/perfil"
              onClick={cerrar}
              className="text-xs truncate"
              style={{ color: "var(--texto-3)" }}
              title={usuario}
            >
              {usuario}
            </Link>
            {esAdmin && (
              <Link
                href="/equipo"
                onClick={cerrar}
                className="text-xs shrink-0"
                style={{ color: "var(--texto-3)" }}
              >
                · {t("Equipo")}
              </Link>
            )}
          </div>
          {salir}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div
          className="lg:hidden sticky top-0 z-20 h-14 flex items-center gap-3 px-4"
          style={{
            background: "var(--fondo)",
            borderBottom: "1px solid var(--borde)",
          }}
        >
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label={t("Abrir menú")}
            className="text-lg leading-none"
            style={{ color: "var(--texto-2)" }}
          >
            ☰
          </button>
          <span className="font-semibold tracking-tight">{t("PM Platform")}</span>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
