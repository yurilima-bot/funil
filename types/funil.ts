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

  /**
   * Conexões para o mapa (React Flow). Cada id representa um próximo step.
   * Persistência: coluna `next_ids` (idealmente `text[]` ou `jsonb`) no Supabase.
   */
  nextIds?: string[] | null;

  /**
   * Posição persistida do node no canvas.
   * Persistência: colunas `pos_x` e `pos_y` (number) no Supabase.
   */
  posX?: number | null;
  posY?: number | null;
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
