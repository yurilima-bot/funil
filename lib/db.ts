import { getSupabaseClient } from "./supabase";
import { Funil, ChangelogEntry } from "@/types/funil";

// ==================== FUNIS ====================

export async function fetchFunis(): Promise<Funil[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const { data, error } = await supabase
      .from("funis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ? data.map(transformFromDB) : [];
  } catch (error) {
    console.error("Erro ao buscar funis:", error);
    return [];
  }
}

export async function createFunil(funil: Omit<Funil, "id">): Promise<Funil | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const { data, error } = await supabase
      .from("funis")
      .insert([
        {
          codigo: funil.codigo,
          tipo: funil.tipo,
          oferta: funil.oferta,
          nome: funil.nome,
          versao: funil.versao,
          pais: funil.pais,
          checkout: funil.checkout,
          status: funil.status,
          url: funil.url,
          data_criacao: funil.dataCriacao,
          descricao: funil.descricao,
          // Campos opcionais do mapa (se existirem no banco)
          next_ids: funil.nextIds ?? undefined,
          pos_x: funil.posX ?? undefined,
          pos_y: funil.posY ?? undefined,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data ? transformFromDB(data) : null;
  } catch (error) {
    console.error("Erro ao criar funil:", error);
    return null;
  }
}

export async function updateFunil(id: string, funil: Partial<Funil>): Promise<Funil | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const updateData: Record<string, unknown> = {};

    if (funil.codigo !== undefined) updateData.codigo = funil.codigo;
    if (funil.tipo !== undefined) updateData.tipo = funil.tipo;
    if (funil.oferta !== undefined) updateData.oferta = funil.oferta;
    if (funil.nome !== undefined) updateData.nome = funil.nome;
    if (funil.versao !== undefined) updateData.versao = funil.versao;
    if (funil.pais !== undefined) updateData.pais = funil.pais;
    if (funil.checkout !== undefined) updateData.checkout = funil.checkout;
    if (funil.status !== undefined) updateData.status = funil.status;
    if (funil.url !== undefined) updateData.url = funil.url;
    if (funil.dataCriacao !== undefined && funil.dataCriacao !== "") updateData.data_criacao = funil.dataCriacao;
    if (funil.descricao !== undefined) updateData.descricao = funil.descricao;
    if (funil.nextIds !== undefined) updateData.next_ids = funil.nextIds;
    if (funil.posX !== undefined) updateData.pos_x = funil.posX;
    if (funil.posY !== undefined) updateData.pos_y = funil.posY;

    const { data, error } = await supabase
      .from("funis")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data ? transformFromDB(data) : null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Erro ao atualizar funil:", msg, error);
    return null;
  }
}

export type DeleteFunilResult = { ok: boolean; error?: string };

export async function deleteFunil(id: string): Promise<DeleteFunilResult> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase não configurado" };
    const { error } = await supabase.from("funis").delete().eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Erro ao deletar funil:", msg, error);
    return { ok: false, error: msg };
  }
}

// ==================== CHANGELOG ====================

// Converter timestamp para ISO 8601 (formato aceito por PostgreSQL)
function toISO8601(timestamp: string): string {
  // Se já está em ISO 8601, retorna como está
  if (timestamp.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return timestamp;
  }
  // Converte "31/03/2026 10:16" para "2026-03-31T10:16:00Z"
  const [datePart, timePart] = timestamp.split(" ");
  if (!datePart || !timePart) return new Date().toISOString();
  
  const [day, month, year] = datePart.split("/");
  const [hours, minutes] = timePart.split(":");
  
  return `${year}-${month}-${day}T${hours}:${minutes}:00Z`;
}

export async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const { data, error } = await supabase
      .from("changelog")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return data ? data.map(transformChangelogFromDB) : [];
  } catch (error) {
    console.error("Erro ao buscar changelog:", error);
    return [];
  }
}

export async function addChangelogEntry(entry: ChangelogEntry): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const { error } = await supabase.from("changelog").insert([
      {
        action: entry.action,
        codigo: entry.codigo,
        nome: entry.nome,
        timestamp: toISO8601(entry.timestamp),
        user_email: entry.userEmail || null,
        old_status: entry.oldStatus || null,
        new_status: entry.newStatus || null,
        fields: entry.fields || null,
        descricao: entry.descricao || null,
      },
    ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao adicionar changelog:", error);
    return false;
  }
}

export async function clearChangelog(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase não configurado");
    const { error } = await supabase.from("changelog").delete().gte("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao limpar changelog:", error);
    return false;
  }
}

// ==================== HELPERS ====================

function toFunilTipo(value: unknown): Funil["tipo"] {
  const v = value === null || value === undefined ? "" : String(value);
  if (v === "" || v === "Oferta" || v === "Lead" || v === "Upsell") return v;
  return "";
}

function toFunilStatus(value: unknown): Funil["status"] {
  const v = value === null || value === undefined ? "" : String(value);
  if (v === "" || v === "Ativo" || v === "Em teste" || v === "Pausado" || v === "Descartado") return v;
  return "";
}

function transformFromDB(dbRecord: Record<string, unknown>): Funil {
  const nextIdsRaw = (dbRecord as Record<string, unknown>).next_ids;
  const nextIds =
    Array.isArray(nextIdsRaw) ? nextIdsRaw.map((x) => String(x)) : undefined;

  const posXRaw = (dbRecord as Record<string, unknown>).pos_x;
  const posYRaw = (dbRecord as Record<string, unknown>).pos_y;
  const posX =
    typeof posXRaw === "number"
      ? posXRaw
      : posXRaw === null || posXRaw === undefined || posXRaw === ""
        ? undefined
        : Number(posXRaw);
  const posY =
    typeof posYRaw === "number"
      ? posYRaw
      : posYRaw === null || posYRaw === undefined || posYRaw === ""
        ? undefined
        : Number(posYRaw);

  return {
    id: String(dbRecord.id),
    codigo: String(dbRecord.codigo),
    tipo: toFunilTipo(dbRecord.tipo),
    oferta: dbRecord.oferta === null || dbRecord.oferta === undefined ? "" : String(dbRecord.oferta),
    nome: String(dbRecord.nome),
    versao: dbRecord.versao === null || dbRecord.versao === undefined ? "" : String(dbRecord.versao),
    pais: String(dbRecord.pais),
    checkout: dbRecord.checkout === null || dbRecord.checkout === undefined ? "" : String(dbRecord.checkout),
    status: toFunilStatus(dbRecord.status),
    url: dbRecord.url === null || dbRecord.url === undefined ? "" : String(dbRecord.url),
    dataCriacao: dbRecord.data_criacao === null || dbRecord.data_criacao === undefined ? "" : String(dbRecord.data_criacao),
    descricao: dbRecord.descricao === null || dbRecord.descricao === undefined ? "" : String(dbRecord.descricao),
    nextIds,
    posX: Number.isFinite(posX as number) ? (posX as number) : undefined,
    posY: Number.isFinite(posY as number) ? (posY as number) : undefined,
  };
}

function transformChangelogFromDB(dbRecord: Record<string, unknown>): ChangelogEntry {
  return {
    action: String(dbRecord.action) as ChangelogEntry["action"],
    codigo: String(dbRecord.codigo),
    nome: String(dbRecord.nome),
    timestamp: String(dbRecord.timestamp),
    userEmail:
      dbRecord.user_email === null || dbRecord.user_email === undefined
        ? null
        : String(dbRecord.user_email),
    oldStatus: dbRecord.old_status === null || dbRecord.old_status === undefined ? undefined : String(dbRecord.old_status),
    newStatus: dbRecord.new_status === null || dbRecord.new_status === undefined ? undefined : String(dbRecord.new_status),
    fields: dbRecord.fields === null || dbRecord.fields === undefined ? undefined : String(dbRecord.fields),
    descricao: dbRecord.descricao === null || dbRecord.descricao === undefined ? null : String(dbRecord.descricao),
  };
}
