import { resumenMensual, objetivosCliente, mesesCargados } from "@/lib/consultas/metricas";
import ResumenMetricas from "@/components/ResumenMetricas";

export const dynamic = "force-dynamic";

export default async function MetricasCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resumen, objetivos, meses] = await Promise.all([
    resumenMensual(id),
    objetivosCliente(id),
    mesesCargados(id),
  ]);

  return (
    <ResumenMetricas
      clienteId={id}
      resumen={resumen}
      objetivos={objetivos}
      meses={meses}
    />
  );
}
