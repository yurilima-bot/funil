"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Funil, ChangelogEntry } from "@/types/funil";
import { uid, formatDate } from "@/lib/utils";
import { fetchFunis, createFunil, updateFunil, deleteFunil, fetchChangelog, addChangelogEntry } from "@/lib/db";
import { useAuth } from "@/app/context/AuthContext";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import Sidebar from "@/app/components/funis/Sidebar";
import FunilModal from "@/app/components/funis/FunilModal";
import Toast from "@/app/components/toast";
import ChangelogPage from "@/app/components/changelogpage";
import { BDPage, AtivosPage, DescartadosPage } from "@/app/components/funispages";

type Page = "bd" | "ativos" | "descartados" | "changelog";

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
  const [page, setPage] = useState<Page>("bd");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Funil>>(EMPTY_FORM);
  const [toast, setToast] = useState({ message: "", type: "" as "success" | "info" | "warn" | "" });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

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

  async function saveRecord() {
    const data = {
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

        // Update no banco
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
          oldStatus: statusChanged ? old.status : undefined,
          newStatus: statusChanged ? data.status : undefined,
          fields: changedFields.join(", "),
          descricao: data.descricao || null,
        };
        await addChangelogEntry(logEntry);
        addLog(logEntry);
        showToast("✅ Funil atualizado", "success");
      } else {
        if (db.find((r) => r.codigo === data.codigo)) {
          showToast(`⚠️ Código ${data.codigo} já existe`, "warn");
          return;
        }

        // Create no banco
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
          descricao: `Tipo: ${data.tipo} · País: ${data.pais} · Status: ${data.status}`,
        };
        await addChangelogEntry(logEntry);
        addLog(logEntry);
        showToast("✅ Funil cadastrado", "success");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast("❌ Erro ao salvar. Verifique sua conexão.", "warn");
      return;
    }

    closeModal();
  }

  async function deleteRecord(id: string) {
    const rec = db.find((r) => r.id === id);
    if (!rec) return;
    if (!confirm(`Excluir "${rec.codigo} — ${rec.nome}"?\n\nEsta ação é irreversível.`)) return;

    try {
      const success = await deleteFunil(id);
      if (!success) {
        showToast("❌ Erro ao deletar funil", "warn");
        return;
      }

      setDb((prev) => prev.filter((r) => r.id !== id));
      const logEntry: ChangelogEntry = {
        action: "delete",
        codigo: rec.codigo,
        nome: rec.nome,
        timestamp: formatDate(new Date()),
        descricao: `Status anterior: ${rec.status}`,
      };
      await addChangelogEntry(logEntry);
      addLog(logEntry);
      showToast("🗑 Funil removido", "info");
    } catch (error) {
      console.error("Erro ao deletar:", error);
      showToast("❌ Erro ao deletar. Verifique sua conexão.", "warn");
    }
  }

  const badges = {
    bd: db.length,
    ativos: db.filter((r) => r.status !== "Descartado").length,
    descartados: db.filter((r) => r.status === "Descartado").length,
    changelog: changelog.length,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Carregando dados...</h2>
          {isOffline && <p style={{ color: "#ff6b6b" }}>⚠️ Modo offline - usando dados salvos localmente</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Header com logout */}
      <div style={{ backgroundColor: "#ffffff", color: "rgb(7, 0, 0)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>Funil Manager</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px" }}>{user?.email}</span>
          <button
            onClick={async () => {
              await signOut();
              router.push("/auth");
            }}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {isOffline && (
        <div style={{ position: "fixed", top: "56px", width: "100%", backgroundColor: "#ff6b6b", color: "white", padding: "8px", zIndex: 1000 }}>
          ⚠️ Modo offline - mudanças serão sincronizadas quando a conexão retornar
        </div>
      )}
      
      <div style={{ display: "flex", flex: 1, marginTop: isOffline ? "40px" : "0" }}>
        <Sidebar
          currentPage={page}
          onNavigate={setPage}
          badges={badges}
        />

        <main className="main">
          {page === "bd" && (
            <BDPage
              db={db}
              onEdit={openEditModal}
              onDelete={deleteRecord}
              onNew={openCreateModal}
            />
          )}
          {page === "ativos" && (
            <AtivosPage
              db={db}
              onEdit={openEditModal}
              onDelete={deleteRecord}
              onNew={openCreateModal}
            />
          )}
          {page === "descartados" && (
            <DescartadosPage
              db={db}
              onEdit={openEditModal}
              onDelete={deleteRecord}
              onNew={openCreateModal}
            />
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
        />

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