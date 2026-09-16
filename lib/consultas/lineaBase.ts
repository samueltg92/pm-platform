import "server-only";
import { uno } from "../db";
import { sqlAutoria, type Autoria } from "../autoria";

export type LineaBase = {
  id: string;
  volumen_mensual_promedio: number | null;
  aht_promedio_seg: number | null;
  concurrencia_promedio: number | null;
  concurrencia_maxima: number | null;
  meta_contencion_pct: string | null;
  horario_operativo: string | null;
  entregado_por: string | null;
  fecha_entrega: string | null;
  notas: string | null;
} & Autoria;

export async function lineaBaseCliente(clienteId: string) {
  return uno<LineaBase>(`select lb.*, ${sqlAutoria("lb")} from linea_base lb where id = $1`, [clienteId]);
}
