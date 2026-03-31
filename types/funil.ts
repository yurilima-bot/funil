export type FunilStatus = "Ativo" | "Em teste" | "Pausado" | "Descartado";
export type FunilTipo = "Oferta" | "Lead" | "Upsell";
export type LogAction = "create" | "edit" | "delete" | "status";

export interface Funil {
  id: string;
  codigo: string;
  tipo: FunilTipo | "";
  oferta: string;
  nome: string;
  versao: string;
  pais: string;
  checkout: string;
  status: FunilStatus | "";
  url: string;
  dataCriacao: string;
  descricao: string;
}

export interface ChangelogEntry {
  action: LogAction;
  codigo: string;
  nome: string;
  timestamp: string;
  userEmail?: string | null;
  oldStatus?: string;
  newStatus?: string;
  fields?: string;
  descricao?: string | null;
}
