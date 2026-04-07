"use client";
import { useState } from "react";
import { Funil } from "@/types/funil";

interface FunnelCanvasPageProps {
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchRestore?: (ids: string[]) => void;
}

// Agrupa funis por oferta ou por código
function groupFunis(db: Funil[]): Map<string, Funil[]> {
  const groups = new Map<string, Funil[]>();
  db.forEach((funil) => {
    const groupKey = funil.oferta?.trim() || funil.codigo;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(funil);
  });

  const typeOrder: Record<string, number> = { Oferta: 0, Lead: 1, Upsell: 2 };
  groups.forEach((items) => items.sort((a, b) => (typeOrder[a.tipo] ?? 9) - (typeOrder[b.tipo] ?? 9)));

  return groups;
}

const TYPE_ICONS: Record<string, string> = { Oferta: "🛒", Lead: "📧", Upsell: "⬆️" };
const STATUS_COLORS: Record<string, string> = { Ativo: "#059669", "Em teste": "#d97706", Pausado: "#64748b", Descartado: "#dc2626" };
const STATUS_BG: Record<string, string> = { Ativo: "#ecfdf5", "Em teste": "#fffbeb", Pausado: "#f8fafc", Descartado: "#fef2f2" };

// Card individual
function FunnelCard({
  funil,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  funil: Funil;
  selected?: boolean;
  onSelect?: (id: string, value: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const statusColor = STATUS_COLORS[funil.status] || "#6b7280";
  const statusBg = STATUS_BG[funil.status] || "#f9fafb";

  return (
    <div
      className={`fc-card ${selected ? "selected" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderTopColor: statusColor }}
    >
      <div className="fc-card-strip" style={{ background: statusColor }} />

      <div className="fc-card-body">
        <div className="fc-card-top">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(funil.id, e.target.checked)}
              style={{ marginRight: 6 }}
            />
          )}
          <span className="fc-card-icon">{TYPE_ICONS[funil.tipo] || "📄"}</span>
          <span className="fc-card-code">{funil.codigo}</span>
          {funil.versao && <span className="fc-card-version">{funil.versao}</span>}
          <span className="fc-card-country">{funil.pais}</span>
        </div>

        <div className="fc-card-name">{funil.nome}</div>

        <div className="fc-card-tags">
          <span className="fc-card-status" style={{ color: statusColor, background: statusBg }}>
            {funil.status}
          </span>
          {funil.checkout && <span className="fc-card-plat">{funil.checkout}</span>}
        </div>

        {funil.url && (
          <a
            href={funil.url}
            target="_blank"
            rel="noopener noreferrer"
            className="fc-card-url"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 {funil.url.replace(/^https?:\/\//, "").slice(0, 28)}
            {funil.url.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
          </a>
        )}
      </div>

      <div className={`fc-card-actions ${hover ? "visible" : ""}`}>
        <button className="fc-action-btn fc-action-edit" onClick={() => onEdit(funil.id)} title="Editar">✏️</button>
        <button className="fc-action-btn fc-action-del" onClick={() => onDelete(funil.id)} title="Excluir">✕</button>
      </div>
    </div>
  );
}

// Seta a flecha entre funis
function ArrowRight() {
  return (
    <div className="fc-arrow">
      <div className="fc-arrow-line" />
      <div className="fc-arrow-head" />
    </div>
  );
}

// Grupo de funis
function FolderGroup({
  groupKey,
  funis,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchRestore,
}: {
  groupKey: string;
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchRestore?: (ids: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [discardLimit, setDiscardLimit] = useState(10);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const mainFlow = funis.filter((f) => f.status !== "Descartado");
  const descartados = funis.filter((f) => f.status === "Descartado");

  const activeCount = funis.filter((f) => f.status === "Ativo").length;
  const testeCount = funis.filter((f) => f.status === "Em teste").length;

  const toggleSelect = (id: string, value: boolean) => {
    setSelected((s) => ({ ...s, [id]: value }));
  };

  const selectedIds = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);

  return (
    <div className="fc-folder">
      {/* Header */}
      <div className="fc-folder-tab" onClick={() => setCollapsed((c) => !c)}>
        <span className="fc-folder-tab-icon">📁</span>
        <span className="fc-folder-tab-name">{groupKey}</span>

        <div className="fc-folder-tab-badges">
          {activeCount > 0 && <span className="fc-folder-badge fc-folder-badge-ativo">{activeCount} ativo{activeCount>1?"s":""}</span>}
          {testeCount > 0 && <span className="fc-folder-badge fc-folder-badge-teste">{testeCount} em teste</span>}
          {descartados.length > 0 && <span className="fc-folder-badge fc-folder-badge-discarded">🗑 {descartados.length}</span>}
          <span className="fc-folder-badge fc-folder-badge-total">{funis.length} funil{funis.length>1?"s":""}</span>
        </div>

        <span className="fc-folder-chevron">{collapsed ? "▶" : "▼"}</span>
      </div>

      {!collapsed && (
        <div className="fc-folder-body">
          {/* MAIN FLOW */}
          {mainFlow.length > 0 && (
            <div className="fc-flow-row">
              {mainFlow.map((funil, idx) => (
                <div key={funil.id} className="fc-flow-item">
                  <FunnelCard funil={funil} onEdit={onEdit} onDelete={onDelete} />
                  {idx < mainFlow.length - 1 && <ArrowRight />}
                </div>
              ))}
            </div>
          )}

          {/* DESCARTADOS */}
          {descartados.length > 0 && (
            <div className="fc-discarded-row">
              <div className="fc-discarded-header" onClick={() => setShowDiscarded((s) => !s)}>
                <span>🗃 Descartados ({descartados.length})</span>
                <span>{showDiscarded ? "▲" : "▼"}</span>
              </div>

              {showDiscarded && (
                <>
                  {/* Ações em massa */}
                  {selectedIds.length > 0 && (
                    <div className="fc-batch-actions">
                      {onBatchDelete && (
                        <button className="btn btn-ghost btn-sm" onClick={() => onBatchDelete(selectedIds)}>Excluir selecionados</button>
                      )}
                      {onBatchRestore && (
                        <button className="btn btn-ghost btn-sm" onClick={() => onBatchRestore(selectedIds)}>Restaurar selecionados</button>
                      )}
                    </div>
                  )}

                  <div className="fc-flow-row fc-discarded-cards">
                    {descartados.slice(0, discardLimit).map((funil) => (
                      <FunnelCard
                        key={funil.id}
                        funil={funil}
                        selected={!!selected[funil.id]}
                        onSelect={toggleSelect}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>

                  {discardLimit < descartados.length && (
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDiscardLimit((l) => l + 20)}>Ver mais +20</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Página principal
export default function FunnelCanvasPage({
  db,
  onEdit,
  onDelete,
  onNew,
  onBatchDelete,
  onBatchRestore,
}: FunnelCanvasPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"canvas" | "compact">("canvas");

  const filtered = db.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const hay = (f.codigo + f.nome + f.oferta + f.pais).toLowerCase();
      return hay.includes(search.toLowerCase());
    }
    return true;
  });

  const groups = groupFunis(filtered);

  const statusChips = [
    { val: "", label: "Todos" },
    { val: "Ativo", label: "✅ Ativo" },
    { val: "Em teste", label: "🔬 Em teste" },
    { val: "Pausado", label: "⏸ Pausado" },
    { val: "Descartado", label: "🗑 Descartado" },
  ];

  return (
    <div className="fc-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Mapa de Funis</div>
          <div className="page-sub">
            Visualização por grupos — {groups.size} grupo{groups.size !== 1 ? "s" : ""} · {filtered.length} funis
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="fc-view-toggle">
            <button className={`fc-view-btn ${viewMode === "canvas" ? "active" : ""}`} onClick={() => setViewMode("canvas")}>⊞ Canvas</button>
            <button className={`fc-view-btn ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>☰ Compacto</button>
          </div>
          <button className="btn btn-primary" onClick={onNew}>+ Novo funil</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="fc-toolbar">
        <div className="fc-toolbar-chips">
          {statusChips.map((c) => (
            <button
              key={c.val || "all"}
              className={`filter-chip ${statusFilter === c.val ? "on" : ""}`}
              onClick={() => setStatusFilter(c.val)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" type="search" placeholder="Buscar código, nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Canvas */}
      <div className="fc-canvas">
        {groups.size === 0 ? (
          <div className="fc-empty">
            <div className="fc-empty-icon">📭</div>
            <div className="fc-empty-text">Nenhum funil encontrado</div>
            <button className="btn btn-primary" onClick={onNew} style={{ marginTop: 12 }}>+ Criar primeiro funil</button>
          </div>
        ) : viewMode === "canvas" ? (
          <div className="fc-groups">
            {[...groups.entries()].map(([key, funis]) => (
              <FolderGroup
                key={key}
                groupKey={key}
                funis={funis}
                onEdit={onEdit}
                onDelete={onDelete}
                onBatchDelete={onBatchDelete}
                onBatchRestore={onBatchRestore}
              />
            ))}
          </div>
        ) : (
          <div className="fc-compact-grid">
            {filtered.map((f) => (
              <FunnelCard key={f.id} funil={f} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}