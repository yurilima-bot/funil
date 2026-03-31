import { ChangelogEntry, Funil } from "@/app/components/types/funil";

export function uid(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatDate(d: Date): string {
  return (
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

export const DEMO_DATA: Funil[] = [
  {
    id: uid(),
    codigo: "OF038-LEAD01",
    tipo: "Lead",
    oferta: "OF038",
    nome: "BR_Diabetes",
    versao: "",
    pais: "BR",
    checkout: "Yampi",
    status: "Ativo",
    url: "",
    dataCriacao: "2024-03-01",
    descricao: "",
  },
  {
    id: uid(),
    codigo: "OF068",
    tipo: "Upsell",
    oferta: "OF068",
    nome: "DE_Disfunção",
    versao: "V2",
    pais: "DE",
    checkout: "Digistore24",
    status: "Em teste",
    url: "",
    dataCriacao: "2024-04-10",
    descricao: "",
  },
  {
    id: uid(),
    codigo: "OF053",
    tipo: "Oferta",
    oferta: "OF053",
    nome: "US_Teste_AB",
    versao: "V3",
    pais: "US",
    checkout: "CartPanda",
    status: "Ativo",
    url: "",
    dataCriacao: "2024-02-15",
    descricao: "",
  },
  {
    id: uid(),
    codigo: "OF041",
    tipo: "Oferta",
    oferta: "OF041",
    nome: "BR_Prostate",
    versao: "V1",
    pais: "BR",
    checkout: "Hotmart",
    status: "Descartado",
    url: "",
    dataCriacao: "2024-01-10",
    descricao: "Taxa de conversão abaixo do esperado",
  },
];

export function buildDemoLogs(data: Funil[]): ChangelogEntry[] {
  return data.map((r) => ({
    action: "create" as const,
    codigo: r.codigo,
    nome: r.nome,
    timestamp: formatDate(new Date()),
    descricao: `Importado como demo — Status: ${r.status}`,
  }));
}