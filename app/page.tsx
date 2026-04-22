"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Funil, ChangelogEntry } from "@/types/funil";
import { uid, formatDate } from "@/lib/utils";
import { fetchFunis, createFunil, updateFunil, fetchChangelog, addChangelogEntry, deleteFunil } from "@/lib/db";
import { useAuth } from "@/app/context/AuthContext";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import Sidebar, { type AppPage } from "@/app/components/funis/Sidebar";
import FunilModal from "@/app/components/funis/FunilModal";
import DiscardConfirmModal from "@/app/components/DiscardConfirmModal";
import PermanentDeleteConfirmModal from "@/app/components/PermanentDeleteConfirmModal";
import Toast from "@/app/components/toast";
import ChangelogPage from "@/app/components/changelogpage";
import FunisFlowCanvas from "@/app/components/funis/FunisFlowCanvas";

const EMPTY_FORM: Partial<Funil> = {
  codigo: "",
  tipo: "",
  oferta: "",
  nome: "",
  versao: "",
  pais: "",
  checkout: "",
  status: "",
  url: "",
  dataCriacao: "",
  descricao: "",
};

function FunisApp() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [db, setDb] = useState<Funil[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [page, setPage] = useState<AppPage>("mapa");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Funil>>(EMPTY_FORM);
  const [toast, setToast] = useState({ message: "", type: "" as "success" | "info" | "warn" | "" });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [pendingPermanentIds, setPendingPermanentIds] = useState<string[] | null>(null);
  const [permanentDeleteSubmitting, setPermanentDeleteSubmitting] = useState(false);
  const [pendingAutoConnectFromId, setPendingAutoConnectFromId] = useState<string | null>(null);
  const [pendingSourceCanvasPos, setPendingSourceCanvasPos] = useState<{ x: number; y: number } | null>(null);

  const pendingDeleteFunil = pendingDeleteId ? db.find((r) => r.id === pendingDeleteId) ?? null : null;

  const pendingPermanentRecords = useMemo(() => {
    if (!pendingPermanentIds?.length) return [];
    return pendingPermanentIds
      .map((id) => db.find((r) => r.id === id))
      .filter((r): r is Funil => !!r);
  }, [pendingPermanentIds, db]);

  // Load from Supabase on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const funis = await fetchFunis();
      const logs = await fetchChangelog();
      
      setDb(funis);
      setChangelog(logs);
      setIsOffline(false);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setIsOffline(true);
      // Fallback para localStorage
      const storedDb = localStorage.getItem("funis_db2");
      const storedCL = localStorage.getItem("funis_changelog2");
      if (storedDb) setDb(JSON.parse(storedDb));
      if (storedCL) setChangelog(JSON.parse(storedCL));
    } finally {
      setLoading(false);
    }
  }

  // Persist on change
  useEffect(() => {
    if (db.length > 0 || localStorage.getItem("funis_db2")) {
      localStorage.setItem("funis_db2", JSON.stringify(db));
    }
  }, [db]);

  useEffect(() => {
    localStorage.setItem("funis_changelog2", JSON.stringify(changelog));
  }, [changelog]);

  function showToast(message: string, type: "success" | "info" | "warn") {
    setToast({ message, type });
  }

  function addLog(entry: ChangelogEntry) {
    setChangelog((prev) => [...prev, entry]);
  }

  function openCreateModal(ctx?: "descartado") {
    setModalMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      dataCriacao: new Date().toISOString().split("T")[0],
      status: ctx === "descartado" ? "Descartado" : "",
    });
    setModalOpen(true);
  }

  function openCreateModalPreset(preset: Partial<Funil>) {
    setModalMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      dataCriacao: new Date().toISOString().split("T")[0],
      status: "",
      ...preset,
    });
    setModalOpen(true);
  }

  function suggestChildCodigo(parentCodigo: string, tipo: "Lead" | "Upsell") {
    const siblings = db.filter((r) => r.oferta === parentCodigo && r.tipo === tipo);
    const n = siblings.length + 1;
    const suffix = String(n).padStart(2, "0");
    return tipo === "Lead" ? `${parentCodigo}-LEAD${suffix}` : `${parentCodigo}-UP${suffix}`;
  }

  function suggestChildCodigoFromParent(parentId: string, tipo: "Lead" | "Upsell") {
    const parent = db.find((r) => r.id === parentId) || null;
    const base = parent?.codigo || String(parent?.oferta || "").trim().toUpperCase();
    const childIds = parent?.nextIds || [];
    const n = db.filter((r) => childIds.includes(r.id) && r.tipo === tipo).length + 1;
    const suffix = String(n).padStart(2, "0");
    return tipo === "Lead" ? `${base}-LEAD${suffix}` : `${base}-UP${suffix}`;
  }

  function suggestChildVersao(parentCodigo: string) {
    const parent = db.find((r) => r.codigo === parentCodigo && r.tipo === "Oferta") || null;
    const parentV = parent?.versao ? Number(String(parent.versao).replace(/^v/i, "")) : NaN;
    const base = Number.isFinite(parentV) && parentV > 0 ? parentV : 1;
    // Regra pedida: se estiver criando Lead/Upsell de uma oferta, começa como v2.
    return String(base + 1);
  }

  function openQuickCreateFromOferta(args: {
    preset: Partial<Funil>;
    connectFromId?: string;
    sourceCanvasX?: number | null;
    sourceCanvasY?: number | null;
  }) {
    const ofertaCodigo = String(args.preset.oferta || "").trim().toUpperCase();
    const tipo = args.preset.tipo as "Lead" | "Upsell" | undefined;
    const parent = args.connectFromId ? db.find((r) => r.id === args.connectFromId) || null : null;
    setPendingAutoConnectFromId(args.connectFromId || null);
    setPendingSourceCanvasPos(
      args.sourceCanvasX != null && args.sourceCanvasY != null
        ? { x: args.sourceCanvasX, y: args.sourceCanvasY }
        : null
    );

    const computed: Partial<Funil> = { ...args.preset };
    if (tipo) {
      // Mantém a oferta do funil pai (para permitir Lead → Lead dentro da mesma oferta)
      const effectiveOferta =
        (parent?.tipo === "Oferta" ? parent.codigo : parent?.oferta) || ofertaCodigo;
      if (effectiveOferta) computed.oferta = String(effectiveOferta).trim().toUpperCase();

      // Código: se tiver um pai (Lead/Upsell/Oferta), gera baseado nele; senão, usa a oferta
      if (args.connectFromId) {
        computed.codigo = suggestChildCodigoFromParent(args.connectFromId, tipo);
      } else if (computed.oferta) {
        computed.codigo = suggestChildCodigo(String(computed.oferta), tipo);
      }

      // Versão: regra v2 só quando criar direto da Oferta; senão herda do pai, se existir
      if (parent?.tipo === "Oferta") {
        computed.versao = suggestChildVersao(parent.codigo);
      } else if (parent?.versao) {
        computed.versao = String(parent.versao);
      } else if (computed.oferta) {
        computed.versao = suggestChildVersao(String(computed.oferta));
      }
    }
    openCreateModalPreset(computed);
  }

  function openEditModal(id: string) {
    const rec = db.find((r) => r.id === id);
    if (!rec) return;
    setModalMode("edit");
    setEditingId(id);
    setForm({ ...rec });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function handleFormChange(field: keyof Funil, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveRecord(pauseLinkedFunilId?: string) {
    let data: {
      codigo: string;
      tipo: string;
      oferta: string;
      nome: string;
      versao: string;
      pais: string;
      checkout: string;
      status: string;
      url: string;
      dataCriacao: string;
      descricao: string;
    } = {
      codigo: (form.codigo || "").trim().toUpperCase(),
      tipo: form.tipo || "",
      oferta: (form.oferta || "").trim().toUpperCase(),
      nome: (form.nome || "").trim(),
      versao: form.versao || "",
      pais: form.pais || "",
      checkout: form.checkout || "",
      status: form.status || "",
      url: (form.url || "").trim(),
      dataCriacao: form.dataCriacao || "",
      descricao: (form.descricao || "").trim(),
    };

    if (!data.codigo || !data.tipo || !data.nome || !data.pais || !data.status) {
      showToast("⚠️ Preencha os campos obrigatórios", "warn");
      return;
    }

    const now = formatDate(new Date());

    async function pauseLinkedIfNeeded(pauseId?: string) {
      if (!pauseId) return;
      const linkedRow = db.find((r) => r.id === pauseId);
      if (linkedRow?.status !== "Ativo" && linkedRow?.status !== "Em teste") return;
      const oldSt = linkedRow.status;
      const paused = await updateFunil(pauseId, { status: "Pausado" });
      if (!paused) return;
      setDb((prev) => prev.map((r) => (r.id === pauseId ? paused : r)));
      const pauseLog: ChangelogEntry = {
        action: "status",
        codigo: paused.codigo,
        nome: paused.nome,
        timestamp: now,
        userEmail: user?.email,
        oldStatus: oldSt,
        newStatus: "Pausado",
        descricao: `Pausado automaticamente ao vincular o novo step ${data.codigo} (Ativo)`,
      };
      await addChangelogEntry(pauseLog);
      addLog(pauseLog);
      showToast(`⏸ ${paused.codigo} pausado — ${data.codigo} ficou Ativo.`, "info");
    }

    try {
      if (editingId) {
        const old = db.find((r) => r.id === editingId)!;
        const oldRecord = old as unknown as Record<string, unknown>;
        const dataRecord = data as unknown as Record<string, unknown>;
        const changedFields = (Object.keys(data) as (keyof typeof data)[]).filter((k) => {
          const key = k as unknown as string;
          return dataRecord[key] !== oldRecord[key];
        });
        const statusChanged = old.status !== data.status;

        const updated = await updateFunil(editingId, data as Funil);
        if (!updated) {
          showToast("❌ Erro ao atualizar funil", "warn");
          return;
        }

        setDb((prev) =>
          prev.map((r) => (r.id === editingId ? updated : r))
        );
        
        const logEntry: ChangelogEntry = {
          action: statusChanged && changedFields.length === 1 ? "status" : "edit",
          codigo: data.codigo,
          nome: data.nome,
          timestamp: now,
          userEmail: user?.email,
          oldStatus: statusChanged ? old.status : undefined,
          newStatus: statusChanged ? data.status : undefined,
          fields: changedFields.join(", "),
          descricao: data.descricao || null,
        };
        await addChangelogEntry(logEntry);
        addLog(logEntry);
        showToast("✅ Funil atualizado", "success");
        await pauseLinkedIfNeeded(pauseLinkedFunilId);
      } else {
        if (db.find((r) => r.codigo === data.codigo)) {
          showToast(`⚠️ Código ${data.codigo} já existe`, "warn");
          return;
        }

        const created = await createFunil(data as Funil);
        if (!created) {
          showToast("❌ Erro ao criar funil", "warn");
          return;
        }

        setDb((prev) => [...prev, created]);
        const logEntry: ChangelogEntry = {
          action: "create",
          codigo: data.codigo,
          nome: data.nome,
          timestamp: now,
          userEmail: user?.email,
        };
        await addChangelogEntry(logEntry);
        addLog(logEntry);
        showToast("✅ Funil cadastrado", "success");
        await pauseLinkedIfNeeded(pauseLinkedFunilId);

        // Se veio do "+" da oferta: cria conexão Oferta → novo step e posiciona à direita
        if (pendingAutoConnectFromId) {
          const src = db.find((r) => r.id === pendingAutoConnectFromId) || null;
          const current = src?.nextIds || [];
          const nextIds = current.includes(created.id) ? current : [...current, created.id];

          // Posiciona o novo nó à direita da Oferta no canvas
          const NODE_W = 240;
          const CONN_GAP = 80;
          if (pendingSourceCanvasPos) {
            const newX = pendingSourceCanvasPos.x + NODE_W + CONN_GAP;
            const newY = pendingSourceCanvasPos.y;
            // Garante que a Oferta também tenha posição salva (para consistência)
            const srcPosX = typeof src?.posX === "number" ? src.posX : pendingSourceCanvasPos.x;
            const srcPosY = typeof src?.posY === "number" ? src.posY : pendingSourceCanvasPos.y;
            setDb((prev) =>
              prev.map((r) => {
                if (r.id === pendingAutoConnectFromId) return { ...r, nextIds, posX: srcPosX, posY: srcPosY };
                if (r.id === created.id) return { ...r, posX: newX, posY: newY };
                return r;
              })
            );
            await Promise.all([
              updateFunil(pendingAutoConnectFromId, { nextIds, posX: srcPosX, posY: srcPosY }),
              updateFunil(created.id, { posX: newX, posY: newY }),
            ]);
          } else {
            setDb((prev) =>
              prev.map((r) => (r.id === pendingAutoConnectFromId ? { ...r, nextIds } : r))
            );
            await updateFunil(pendingAutoConnectFromId, { nextIds });
          }
        }
        setPendingAutoConnectFromId(null);
        setPendingSourceCanvasPos(null);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast("❌ Erro ao salvar. Verifique sua conexão.", "warn");
      return;
    }

    closeModal();
  }

  function deleteRecord(id: string) {
    setPendingDeleteId(id);
  }

  function requestPermanentDelete(ids: string[]) {
    const valid = ids.filter((id) => db.find((r) => r.id === id)?.status === "Descartado");
    if (valid.length === 0) return;
    setPendingPermanentIds(valid);
  }

  async function confirmPermanentDeleteRecords() {
    if (!pendingPermanentIds?.length) return;
    setPermanentDeleteSubmitting(true);
    const ids = [...pendingPermanentIds];
    let removed = 0;
    const failed: Array<{ id: string; codigo: string; reason?: string }> = [];
    try {
      const now = formatDate(new Date());
      for (const id of ids) {
        const rec = db.find((r) => r.id === id);
        if (!rec || rec.status !== "Descartado") continue;
        const res = await deleteFunil(id);

        // Se estiver offline (ou sem supabase), remove localmente para o usuário conseguir limpar a lista.
        const canRemoveLocally = isOffline || res.error === "Supabase não configurado";

        if (!res.ok && !canRemoveLocally) {
          failed.push({ id, codigo: rec.codigo, reason: res.error });
          continue;
        }

        removed++;
        setDb((prev) => prev.filter((r) => r.id !== id));
        const logEntry: ChangelogEntry = {
          action: "delete",
          codigo: rec.codigo,
          nome: rec.nome,
          timestamp: now,
          userEmail: user?.email,
          descricao: "Exclusão permanente (descartados)",
        };
        // Em modo offline, não tenta gravar log no Supabase.
        if (!isOffline && res.ok) {
          await addChangelogEntry(logEntry);
          addLog(logEntry);
        } else {
          addLog(logEntry);
        }
      }
      if (removed > 0) {
        const suffix = isOffline ? " (removido(s) localmente — offline)" : "";
        showToast(`✅ ${removed} registro(s) removido(s) permanentemente${suffix}`, "success");
      } else {
        const msg =
          failed.length > 0
            ? `❌ Não foi possível excluir (${failed[0].codigo}). Motivo: ${failed[0].reason || "erro desconhecido"}`
            : "❌ Não foi possível excluir";
        showToast(msg, "warn");
      }
      setPendingPermanentIds(null);
    } catch (error) {
      console.error("Erro ao excluir permanentemente:", error);
      showToast("❌ Erro ao excluir. Verifique sua conexão.", "warn");
    } finally {
      setPermanentDeleteSubmitting(false);
    }
  }

  async function restoreDiscardedRecords(
    ids: string[],
    status: "Ativo" | "Em teste" | "Pausado",
  ) {
    const valid = ids.filter((id) => db.find((r) => r.id === id)?.status === "Descartado");
    if (valid.length === 0) return;
    const now = formatDate(new Date());
    let okCount = 0;
    try {
      for (const id of valid) {
        const rec = db.find((r) => r.id === id);
        if (!rec) continue;
        const old = rec.status;
        const updated = await updateFunil(id, { status });
        if (!updated) continue;
        setDb((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
        const logEntry: ChangelogEntry = {
          action: "status",
          codigo: rec.codigo,
          nome: rec.nome,
          timestamp: now,
          userEmail: user?.email,
          descricao: `Restaurado: ${old} → ${status}`,
        };
        await addChangelogEntry(logEntry);
        addLog(logEntry);
        okCount++;
      }
      if (okCount > 0) {
        showToast(`✅ ${okCount} step(s) restaurado(s) como ${status}`, "success");
      } else {
        showToast("❌ Não foi possível restaurar", "warn");
      }
    } catch (error) {
      console.error("Erro ao restaurar:", error);
      showToast("❌ Erro ao restaurar. Verifique sua conexão.", "warn");
    }
  }

  async function confirmDeleteRecord() {
    const id = pendingDeleteId;
    if (!id) return;
    const rec = db.find((r) => r.id === id);
    if (!rec) {
      setPendingDeleteId(null);
      return;
    }

    setDeleteSubmitting(true);
    try {
      // Se já estiver descartado, o botão "Excluir" deve remover permanentemente.
      if (rec.status === "Descartado") {
        const res = await deleteFunil(id);
        const canRemoveLocally = isOffline || res.error === "Supabase não configurado";
        if (!res.ok && !canRemoveLocally) {
          showToast(`❌ Erro ao excluir permanentemente: ${res.error || "falha desconhecida"}`, "warn");
          return;
        }

        setDb((prev) => prev.filter((r) => r.id !== id));
        const logEntry: ChangelogEntry = {
          action: "delete",
          codigo: rec.codigo,
          nome: rec.nome,
          timestamp: formatDate(new Date()),
          userEmail: user?.email,
          descricao: "Exclusão permanente (item já descartado)",
        };
        if (!isOffline && res.ok) {
          await addChangelogEntry(logEntry);
        }
        addLog(logEntry);
        showToast("🗑 Excluído permanentemente", "success");
        setPendingDeleteId(null);
        return;
      }

      const updated = await updateFunil(id, { status: "Descartado" });
      if (!updated) {
        showToast("❌ Erro ao mover funil para descartados", "warn");
        return;
      }

      setDb((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Descartado" } : r)));
      const logEntry: ChangelogEntry = {
        action: "status",
        codigo: rec.codigo,
        nome: rec.nome,
        timestamp: formatDate(new Date()),
        userEmail: user?.email,
        descricao: `Status alterado: ${rec.status} → Descartado`,
      };
      await addChangelogEntry(logEntry);
      addLog(logEntry);
      showToast("🗑 Funil movido para descartados", "info");
      setPendingDeleteId(null);
    } catch (error) {
      console.error("Erro ao mover para descartados:", error);
      showToast("❌ Erro ao mover funil. Verifique sua conexão.", "warn");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const badges = {
    mapa: db.length,
    changelog: changelog.length,
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-card">
          <div className="app-loading-title">Carregando dados…</div>
          <div className="app-loading-sub">Buscando funis e histórico</div>
          {isOffline && (
            <div className="app-loading-warn">
              ⚠️ Modo offline — usando dados salvos localmente
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-brand">Funil Manager</div>
        <div className="app-topbar-right">
          {user?.email && <div className="app-topbar-email">{user.email}</div>}
          <button
            className="btn-topbar-signout"
            onClick={async () => {
              await signOut();
              router.push("/auth");
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {isOffline && (
        <div className="app-offline-banner">
          ⚠️ Modo offline — mudanças serão sincronizadas quando a conexão retornar
        </div>
      )}
      
      <div className="app-shell-body">
        <Sidebar
          currentPage={page}
          onNavigate={setPage}
          badges={badges}
        />

        <main className="main">
          {page === "mapa" && (
            <>
              <div className="page-header">
                <div>
                  <div className="page-title">Funil</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => openCreateModalPreset({ tipo: "Oferta" })}
                >
                  + Nova Oferta
                </button>
              </div>

              <div className="funnel-flow-container">
                <div className="stats-row" style={{ marginBottom: "20px" }}>
                  <div className="stat-card">
                    <div className="stat-label">Ativos</div>
                    <div className="stat-value stat-green">{db.filter((r) => r.status === "Ativo").length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Em Teste</div>
                    <div className="stat-value stat-yellow">{db.filter((r) => r.status === "Em teste").length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Pausados</div>
                    <div className="stat-value stat-orange">{db.filter((r) => r.status === "Pausado").length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Descartados</div>
                    <div className="stat-value" style={{ color: "#dc2626" }}>
                      {db.filter((r) => r.status === "Descartado").length}
                    </div>
                  </div>
                
                </div>
                <FunisFlowCanvas
                  funis={db}
                  onEdit={openEditModal}
                  onDelete={deleteRecord}
                  onQuickCreate={openQuickCreateFromOferta}
                />
              </div>
            </>
          )}
          {page === "changelog" && (
            <ChangelogPage changelog={changelog} />
          )}
        </main>

        <FunilModal
          open={modalOpen}
          mode={modalMode}
          form={form}
          onChange={handleFormChange}
          onSave={saveRecord}
          onClose={closeModal}
          allFunis={db}
          editingId={editingId}
        />

        {pendingDeleteFunil && (
          <DiscardConfirmModal
            funil={pendingDeleteFunil}
            busy={deleteSubmitting}
            onConfirm={confirmDeleteRecord}
            onCancel={() => {
              if (!deleteSubmitting) setPendingDeleteId(null);
            }}
          />
        )}

        {pendingPermanentIds && pendingPermanentIds.length > 0 && pendingPermanentRecords.length > 0 && (
          <PermanentDeleteConfirmModal
            records={pendingPermanentRecords}
            busy={permanentDeleteSubmitting}
            onConfirm={confirmPermanentDeleteRecords}
            onCancel={() => {
              if (!permanentDeleteSubmitting) setPendingPermanentIds(null);
            }}
          />
        )}

        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ message: "", type: "" })}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <FunisApp />
    </ProtectedRoute>
  );
}