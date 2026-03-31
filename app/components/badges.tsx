import { FunilStatus, FunilTipo } from "@/types/funil";

const statusMap: Record<string, string> = {
  Ativo: "badge-ativo",
  "Em teste": "badge-teste",
  Pausado: "badge-pausado",
  Descartado: "badge-descartado",
};

const tipoMap: Record<string, string> = {
  Oferta: "badge-oferta",
  Lead: "badge-lead",
  Upsell: "badge-upsell",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusMap[status] || "badge-pausado"}`}>
      {status}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`badge ${tipoMap[tipo] || "badge-oferta"}`}>
      {tipo || "—"}
    </span>
  );
}