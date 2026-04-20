"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Funil, ChangelogEntry, FunilStatus } from "@/types/funil";
import { StatusBadge, TipoBadge } from "./badges";
import FunisFlowCanvas from "@/app/components/funis/FunisFlowCanvas";
import TipoHubCanvas from "@/app/components/funis/TipoHubCanvas";
import MapaGeralCanvas from "@/app/components/funis/MapaGeralCanvas";

type PageView = "bd" | "ativos" | "descartados";

interface Filters {
  tipo: string;
  status: string;
  search: string;
}

const defaultFilters = (): Filters => ({ tipo: "", status: "", search: "" });

interface FunisTablePageProps {
  page: PageView;
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: (ctx?: "descartado") => void;
}

interface BDPageProps extends Omit<FunisTablePageProps, "page"> {
  changelog?: ChangelogEntry[];
  onOpenChangelog?: () => void;
  onGoAtivos?: (tipo?: string) => void;
}

function applyFilters(records: Funil[], f: Filters) {
  return records.filter((r) => {
    if (f.tipo && r.tipo !== f.tipo) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.search) {
      const hay = (
        r.codigo +
        r.nome +
        r.oferta +
        r.pais +
        r.checkout +
        (r.descricao || "")
      ).toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  });
}

export function BDPage({
  db,
  changelog = [],
  onOpenChangelog,
  onGoAtivos,
  onEdit,
  onDelete,
  onNew,
}: BDPageProps) {
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);

  // Calcular estatísticas por tipo
  const stats: Record<string, { total: number; ativo: number; teste: number; descartado: number }> = {
    Oferta: {
      total: db.filter((r) => r.tipo === "Oferta").length,
      ativo: db.filter((r) => r.tipo === "Oferta" && r.status === "Ativo").length,
      teste: db.filter((r) => r.tipo === "Oferta" && r.status === "Em teste").length,
      descartado: db.filter((r) => r.tipo === "Oferta" && r.status === "Descartado").length,
    },
    Lead: {
      total: db.filter((r) => r.tipo === "Lead").length,
      ativo: db.filter((r) => r.tipo === "Lead" && r.status === "Ativo").length,
      teste: db.filter((r) => r.tipo === "Lead" && r.status === "Em teste").length,
      descartado: db.filter((r) => r.tipo === "Lead" && r.status === "Descartado").length,
    },
    Upsell: {
      total: db.filter((r) => r.tipo === "Upsell").length,
      ativo: db.filter((r) => r.tipo === "Upsell" && r.status === "Ativo").length,
      teste: db.filter((r) => r.tipo === "Upsell" && r.status === "Em teste").length,
      descartado: db.filter((r) => r.tipo === "Upsell" && r.status === "Descartado").length,
    },
  };

  const tipoConfig: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    Oferta: { icon: "🛒", color: "#1a56db", bg: "#eff4ff", border: "#1a56db" },
    Lead: { icon: "📈", color: "#10b981", bg: "#ecfdf5", border: "#10b981" },
    Upsell: { icon: "⬆️", color: "#f59e0b", bg: "#fffbeb", border: "#f59e0b" },
  };

  // Filtrar funis do tipo selecionado
  const funisDoTipo = selectedTipo ? db.filter((r) => r.tipo === selectedTipo) : [];
  const groupedByStatus = selectedTipo
    ? funisDoTipo.reduce((acc, funil) => {
        const key = funil.status || "Outro";
        if (!acc[key]) acc[key] = [];
        acc[key].push(funil);
        return acc;
      }, {} as Record<string, Funil[]>)
    : {};

  const recentLogs = [...changelog]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 5);

  const actionLabel: Record<string, string> = {
    create: "Cadastro",
    edit: "Edição",
    delete: "Exclusão",
    status: "Status",
  };

  // Dashboard View - 3 Cards
  if (!selectedTipo) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">📊 Dashboard</div>
            <div className="page-sub">Visão geral do seu funil de vendas</div>
          </div>
          <button className="btn btn-primary" onClick={() => onNew()}>
            + Novo Step
          </button>
        </div>

        <div className="funnel-flow-container">
          {/* Cards dos 3 Tipos */}
          <div className="dashboard-cards-grid">
            {["Oferta", "Lead", "Upsell"].map((tipo) => {
              const config = tipoConfig[tipo];
              const stat = stats[tipo];
              return (
                <div
                  key={tipo}
                  className="dashboard-card"
                  onClick={() => onGoAtivos?.(tipo)}
                  style={{
                    background: `linear-gradient(135deg, ${config.bg} 0%, #ffffff 100%)`,
                    border: `2px solid ${config.border}`,
                  }}
                >
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon" style={{ color: config.color }}>
                      {config.icon}
                    </span>
                    <span className="dashboard-card-title" style={{ color: config.color }}>
                      {tipo === "Oferta" ? "Ofertas / VSL" : tipo + "s"}
                    </span>
                  </div>
                  <div className="dashboard-card-total">{stat.total}</div>
                  <div className="dashboard-card-label">steps no funil</div>
                  <div className="dashboard-card-stats">
                    <div className="dstat">
                      <span className="dstat-value ativo">{stat.ativo}</span>
                      <span className="dstat-label">Ativos</span>
                    </div>
                    <div className="dstat">
                      <span className="dstat-value teste">{stat.teste}</span>
                      <span className="dstat-label">Em Teste</span>
                    </div>
                    <div className="dstat">
                      <span className="dstat-value descartado">{stat.descartado}</span>
                      <span className="dstat-label">Descartados</span>
                    </div>
                  </div>
                  <div className="dashboard-card-arrow">→</div>
                </div>
              );
            })}
          </div>

          {/* Resumo Geral */}
          <div className="dashboard-summary">
            <h3 className="summary-title">📈 Resumo Geral</h3>
            <div className="summary-stats">
              <div className="sum-stat">
                <span className="sum-value">{db.length}</span>
                <span className="sum-label">Total de Steps</span>
              </div>
              <div className="sum-stat">
                <span className="sum-value ativo">{db.filter(r => r.status === "Ativo").length}</span>
                <span className="sum-label">Ativos</span>
              </div>
              <div className="sum-stat">
                <span className="sum-value teste">{db.filter(r => r.status === "Em teste").length}</span>
                <span className="sum-label">Em Teste</span>
              </div>
              <div className="sum-stat">
                <span className="sum-value descartado">{db.filter(r => r.status === "Descartado").length}</span>
                <span className="sum-label">Descartados</span>
              </div>
            </div>
          </div>

          {/* Atividade Recente */}
          {recentLogs.length > 0 && (
            <div className="dashboard-activity">
              <h3 className="activity-title">🕐 Atividade Recente</h3>
              <ul className="activity-list">
                {recentLogs.map((log, i) => (
                  <li key={`${log.codigo}-${log.timestamp}-${i}`} className="activity-item">
                    <span className="activity-action">{actionLabel[log.action] || log.action}</span>
                    <span className="activity-codigo">{log.codigo}</span>
                    <span className="activity-time">{log.timestamp}</span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-ghost btn-sm" onClick={() => onOpenChangelog?.()}>
                Ver histórico completo →
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Detail View - Status do Tipo Selecionado
  const config = tipoConfig[selectedTipo];
  const stat = stats[selectedTipo];

  return (
    <>
      <div className="page-header">
        <div className="page-header-with-back">
          <button className="btn-back" onClick={() => setSelectedTipo(null)}>
            ← Voltar
          </button>
          <div>
            <div className="page-title" style={{ color: config.color }}>
              {config.icon} {selectedTipo === "Oferta" ? "Ofertas / VSL" : selectedTipo + "s"}
            </div>
            <div className="page-sub">
              {stat.total} steps • {stat.ativo} ativos • {stat.teste} em teste
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo {selectedTipo}
        </button>
      </div>

      <div className="funnel-flow-container">
        {/* Cards de Status */}
        <div className="status-cards-grid">
          {[
            { key: "Ativo", label: "Ativos", icon: "✓", color: "#059669", bg: "#ecfdf5" },
            { key: "Em teste", label: "Em Teste", icon: "🧪", color: "#d97706", bg: "#fffbeb" },
            { key: "Pausado", label: "Pausados", icon: "⏸", color: "#6b7280", bg: "#f3f4f6" },
            { key: "Descartado", label: "Descartados", icon: "🗑", color: "#dc2626", bg: "#fef2f2" },
          ].map((status) => {
            const funisDoStatus = groupedByStatus[status.key] || [];
            if (funisDoStatus.length === 0) return null;
            
            return (
              <div
                key={status.key}
                className="status-card"
                style={{
                  background: `linear-gradient(135deg, ${status.bg} 0%, #ffffff 100%)`,
                  border: `2px solid ${status.color}`,
                }}
              >
                <div className="status-card-header">
                  <span className="status-card-icon">{status.icon}</span>
                  <span className="status-card-title" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  <span className="status-card-count">{funisDoStatus.length}</span>
                </div>
                
                <div className="status-card-list">
                  {funisDoStatus.slice(0, 5).map((funil) => (
                    <div key={funil.id} className="status-card-item">
                      <div className="sci-info">
                        <span className="sci-codigo">{funil.codigo}</span>
                        <span className="sci-nome">{funil.nome}</span>
                      </div>
                      <div className="sci-actions">
                        <button className="sci-btn" onClick={() => onEdit(funil.id)} title="Editar">
                          ✎
                        </button>
                      </div>
                    </div>
                  ))}
                  {funisDoStatus.length > 5 && (
                    <div className="status-card-more">
                      +{funisDoStatus.length - 5} mais...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid de todos os cards */}
        {Object.entries(groupedByStatus).map(([statusKey, statusFunis]) => (
          <div key={statusKey} className="flow-section">
            <div className="flow-header">
              <h3 className="flow-title">
                {statusKey === "Ativo" && "✅ Ativos"}
                {statusKey === "Em teste" && "🧪 Em Teste"}
                {statusKey === "Pausado" && "⏸️ Pausados"}
                {statusKey === "Descartado" && "🗑️ Descartados"}
                {!['Ativo', 'Em teste', 'Pausado', 'Descartado'].includes(statusKey) && `📄 ${statusKey}`}
              </h3>
              <span className="stat-item">{statusFunis.length} steps</span>
            </div>
            
            <div className="flow-steps">
              {statusFunis.map((funil, index) => (
                <div key={funil.id} className="flow-step-wrapper">
                  <div className={`flow-step ${funil.tipo?.toLowerCase()}-step`}>
                    <div className="step-card">
                      <div className="card-header">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-type">{funil.tipo?.toUpperCase()}</span>
                        <span className={`status-indicator ${funil.status?.toLowerCase()}`}></span>
                      </div>
                      <div className="card-content">
                        <h4 className="card-title">{funil.nome}</h4>
                        <p className="card-code">{funil.codigo}</p>
                        <div className="card-meta">
                          <span className={`status-badge ${funil.status?.toLowerCase()}`}>
                            {funil.status}
                          </span>
                          {funil.pais && <span className="country-tag">{funil.pais}</span>}
                          {funil.versao && <span className="version-tag">v{funil.versao}</span>}
                        </div>
                      </div>
                      <div className="card-actions">
                        <button className="action-btn edit-btn" onClick={() => onEdit(funil.id)}>
                          Editar
                        </button>
                        <button className="action-btn delete-btn" onClick={() => onDelete(funil.id)}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AtivosPage({
  db,
  onEdit,
  onDelete,
  onNew,
  presetTipo = "",
}: Omit<FunisTablePageProps, "page"> & { presetTipo?: string }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters());

  const source = db.filter((r) => r.status !== "Descartado");
  const ativo = source.filter((r) => r.status === "Ativo").length;
  const teste = source.filter((r) => r.status === "Em teste").length;
  const pausado = source.filter((r) => r.status === "Pausado").length;

  const recs = useMemo(() => applyFilters(source, filters), [source, filters]);
  const total = recs.length;

  const tipoChips = [
    { val: "", label: "Todos" },
    { val: "Oferta", label: "Oferta / VSL" },
    { val: "Lead", label: "Lead" },
    { val: "Upsell", label: "Upsell" },
  ];
  const statusChips = [
    { val: "Ativo", label: "Ativo" },
    { val: "Em teste", label: "Em Teste" },
    { val: "Pausado", label: "Pausado" },
  ];
  useEffect(() => {
    if (!presetTipo) return;
    setFilters((f) => ({ ...f, tipo: presetTipo }));
  }, [presetTipo]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">⚡ Ativos & Em Teste</div>
          <div className="page-sub">Funis em operação recebendo tráfego</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo Step
        </button>
      </div>
      
      <div className="funnel-flow-container">
        <div className="stats-row" style={{ marginBottom: "24px" }}>
          <div className="stat-card">
            <div className="stat-label">Ativos</div>
            <div className="stat-value stat-green">{ativo}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Em Teste</div>
            <div className="stat-value stat-yellow">{teste}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pausados</div>
            <div className="stat-value stat-orange">{pausado}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Ativos</div>
            <div className="stat-value stat-blue">{ativo + teste + pausado}</div>
          </div>
        </div>

        <div className="bd-toolbar">
          {tipoChips.map((c) => (
            <button
              key={c.val}
              className={`filter-chip ${filters.tipo === c.val ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, tipo: c.val }))}
            >
              {c.label}
            </button>
          ))}
          {statusChips.map((c) => (
            <button
              key={c.val}
              className={`filter-chip ${filters.status === c.val ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, status: c.val }))}
            >
              {c.label}
            </button>
          ))}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar código, nome..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>

        {recs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">Nada encontrado</div>
            <div className="empty-text">Nenhum funil ativo ou em teste</div>
            <button className="btn btn-primary" onClick={() => onNew()}>
              + Criar primeiro funil ativo
            </button>
          </div>
        ) : (
          <>
            <div className="ativos-flow-meta">
              <span className="table-footer-info">
                {total} step{total !== 1 ? "s" : ""} no mapa (use filtros para reduzir)
              </span>
            </div>
            <FunisFlowCanvas funis={recs} onEdit={onEdit} onDelete={onDelete} />
          </>
        )}
      </div>
    </>
  );
}

const TIPO_CONFIG: Record<string, { icon: string; color: string; label: string; sub: string }> = {
  Lead: {
    icon: "📈",
    color: "#10b981",
    label: "Leads",
    sub: "Funis de captação de leads",
  },
  Oferta: {
    icon: "🛒",
    color: "#1a56db",
    label: "Ofertas / VSL",
    sub: "Páginas de venda e vídeos de vendas",
  },
  Upsell: {
    icon: "⬆️",
    color: "#f59e0b",
    label: "Upsell",
    sub: "Ofertas de aumento de ticket",
  },
};

export function TipoCanvasPage({
  tipo,
  db,
  onEdit,
  onDelete,
  onNew,
}: {
  tipo: "Lead" | "Oferta" | "Upsell";
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const cfg = TIPO_CONFIG[tipo];

  // Include ALL statuses — descartados appear on the right with red connections
  const funis = useMemo(
    () => db.filter((r) => r.tipo === tipo),
    [db, tipo]
  );

  const ativo = funis.filter((r) => r.status === "Ativo").length;
  const teste = funis.filter((r) => r.status === "Em teste").length;
  const pausado = funis.filter((r) => r.status === "Pausado").length;
  const descartado = funis.filter((r) => r.status === "Descartado").length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </div>
          <div className="page-sub">{cfg.sub}</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo {tipo}
        </button>
      </div>

      <div className="funnel-flow-container">
        <div className="stats-row" style={{ marginBottom: "20px" }}>
          <div className="stat-card">
            <div className="stat-label">Ativos</div>
            <div className="stat-value stat-green">{ativo}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Em Teste</div>
            <div className="stat-value stat-yellow">{teste}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pausados</div>
            <div className="stat-value stat-orange">{pausado}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Descartados</div>
            <div className="stat-value" style={{ color: "#dc2626" }}>{descartado}</div>
          </div>
        </div>

        {funis.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{cfg.icon}</div>
            <div className="empty-text">Nenhum {cfg.label.toLowerCase()} cadastrado</div>
            <button className="btn btn-primary" onClick={() => onNew()}>
              + Criar {tipo}
            </button>
          </div>
        ) : (
          <TipoHubCanvas tipo={tipo} funis={funis} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </>
  );
}

export function MapaGeralPage({
  db,
  onSelectTipo,
  onNew,
}: {
  db: Funil[];
  onSelectTipo: (tipo: string) => void;
  onNew: () => void;
}) {
  const total = db.length;
  const ativos = db.filter((r) => r.status === "Ativo").length;
  const teste = db.filter((r) => r.status === "Em teste").length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🗺 Mapa Geral</div>
          <div className="page-sub">Visão do funil completo · clique em um card para ver o mapa de conexões</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo Step
        </button>
      </div>

      <div className="funnel-flow-container">
        <div className="stats-row" style={{ marginBottom: "20px" }}>
          <div className="stat-card">
            <div className="stat-label">Total de Steps</div>
            <div className="stat-value stat-blue">{total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ativos</div>
            <div className="stat-value stat-green">{ativos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Em Teste</div>
            <div className="stat-value stat-yellow">{teste}</div>
          </div>
        </div>

        <MapaGeralCanvas db={db} onSelect={onSelectTipo} />
      </div>
    </>
  );
}

function parseFunilDate(d: string | undefined): number {
  if (!d?.trim()) return 0;
  const t = Date.parse(d.trim());
  return Number.isNaN(t) ? 0 : t;
}

type DiscardTimeRange = "all" | "7d";
type DiscardSortMode = "offer" | "recent";

type RestorableStatus = Exclude<FunilStatus, "Descartado" | "">;

function DiscardedSectionCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="dcc-section-check-input"
      checked={checked}
      onChange={onChange}
      aria-label={checked ? "Desmarcar grupo" : "Selecionar grupo"}
    />
  );
}

function DiscardedOfferVirtualList({
  funis,
  compact,
  onEdit,
  onRequestPermanentDelete,
  selectedIds,
  onToggleRow,
}: {
  funis: Funil[];
  compact: boolean;
  onEdit: (id: string) => void;
  onRequestPermanentDelete: (id: string) => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const estimateSize = compact ? 52 : 280;
  const virtualizer = useVirtualizer({
    count: funis.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="discarded-virtual-parent">
      <div
        className="discarded-virtual-sizer"
        style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const funil = funis[vi.index];
          return (
            <div
              key={funil.id}
              className={compact ? "discarded-compact-row" : "discarded-virtual-card-wrap"}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {compact ? (
                <>
                  <label
                    className="dcc-row-check"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(funil.id)}
                      onChange={() => onToggleRow(funil.id)}
                      aria-label={`Selecionar ${funil.codigo}`}
                    />
                  </label>
                  <span className="dcc-code">{funil.codigo}</span>
                  <span className="dcc-nome" title={funil.nome}>
                    {funil.nome}
                  </span>
                  <span className="dcc-pais">{funil.pais || "—"}</span>
                  <span className="dcc-tipo">
                    <TipoBadge tipo={funil.tipo || ""} />
                  </span>
                  <div className="dcc-actions">
                    <button type="button" className="action-btn edit-btn" onClick={() => onEdit(funil.id)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => onRequestPermanentDelete(funil.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </>
              ) : (
                <div className="flow-step discarded-step">
                  <div className="step-card discarded-card">
                    <div className="card-header">
                      <label className="dcc-card-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(funil.id)}
                          onChange={() => onToggleRow(funil.id)}
                          aria-label={`Selecionar ${funil.codigo}`}
                        />
                      </label>
                      <span className="step-number">{vi.index + 1}</span>
                      <span className="step-type">{funil.tipo?.toUpperCase()}</span>
                      <span className="status-indicator descartado"></span>
                    </div>
                    <div className="card-content">
                      <h4 className="card-title">{funil.nome}</h4>
                      <p className="card-code">{funil.codigo}</p>
                      <div className="card-meta">
                        <span className="status-badge descartado">Descartado</span>
                        {funil.pais && <span className="country-tag">{funil.pais}</span>}
                        {funil.versao && <span className="version-tag">v{funil.versao}</span>}
                        {funil.oferta && <span className="oferta-tag">{funil.oferta}</span>}
                      </div>
                      {funil.descricao && (
                        <div className="card-description">
                          <strong>Motivo:</strong> {funil.descricao}
                        </div>
                      )}
                      {funil.dataCriacao && (
                        <div className="card-date">Criado em: {funil.dataCriacao}</div>
                      )}
                    </div>
                    <div className="card-actions discarded-card-actions">
                      <button type="button" className="action-btn edit-btn" onClick={() => onEdit(funil.id)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="action-btn delete-btn"
                        onClick={() => onRequestPermanentDelete(funil.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DescartadosPageProps {
  db: Funil[];
  onEdit: (id: string) => void;
  /** Abre confirmação de exclusão permanente (um ou vários ids). */
  onRequestPermanentDelete: (ids: string[]) => void;
  onRestoreDiscarded: (ids: string[], status: RestorableStatus) => void | Promise<void>;
}

export function DescartadosPage({
  db,
  onEdit,
  onRequestPermanentDelete,
  onRestoreDiscarded,
}: DescartadosPageProps) {
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [compact, setCompact] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [timeRange, setTimeRange] = useState<DiscardTimeRange>("all");
  const [sortMode, setSortMode] = useState<DiscardSortMode>("offer");
  const [offerFilter, setOfferFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [restoreStatus, setRestoreStatus] = useState<RestorableStatus>("Pausado");

  const source = useMemo(() => db.filter((r) => r.status === "Descartado"), [db]);

  const offerOptions = useMemo(() => {
    const s = new Set<string>();
    source.forEach((r) => s.add((r.oferta || "").trim() || "Sem oferta"));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [source]);

  const afterFilters = useMemo(() => applyFilters(source, filters), [source, filters]);

  const afterOfferFilter = useMemo(() => {
    if (!offerFilter) return afterFilters;
    return afterFilters.filter((r) => ((r.oferta || "").trim() || "Sem oferta") === offerFilter);
  }, [afterFilters, offerFilter]);

  const afterTime = useMemo(() => {
    if (timeRange !== "7d") return afterOfferFilter;
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    return afterOfferFilter.filter((r) => {
      const t = parseFunilDate(r.dataCriacao);
      return t > 0 && now - t <= week;
    });
  }, [afterOfferFilter, timeRange]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        const r = db.find((x) => x.id === id);
        if (r?.status === "Descartado") next.add(id);
      }
      return next;
    });
  }, [db]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(afterTime.map((r) => r.id)));
  }, [afterTime]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const recsForGrouping = useMemo(() => {
    const list = [...afterTime];
    if (sortMode === "recent") {
      list.sort((a, b) => parseFunilDate(b.dataCriacao) - parseFunilDate(a.dataCriacao));
    } else {
      list.sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
    }
    return list;
  }, [afterTime, sortMode]);

  const groupedByOferta = useMemo(() => {
    const acc: Record<string, Funil[]> = {};
    for (const f of recsForGrouping) {
      const key = (f.oferta || "").trim() || "Sem oferta";
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
    }
    return acc;
  }, [recsForGrouping]);

  const sortedOfferEntries = useMemo(() => {
    const entries = Object.entries(groupedByOferta);
    if (sortMode === "recent") {
      entries.sort(([, a], [, b]) => {
        const maxA = Math.max(0, ...a.map((x) => parseFunilDate(x.dataCriacao)));
        const maxB = Math.max(0, ...b.map((x) => parseFunilDate(x.dataCriacao)));
        return maxB - maxA;
      });
    } else {
      entries.sort(([ka], [kb]) => {
        if (ka === "Sem oferta") return 1;
        if (kb === "Sem oferta") return -1;
        return ka.localeCompare(kb);
      });
    }
    return entries;
  }, [groupedByOferta, sortMode]);

  const offerKeys = useMemo(() => sortedOfferEntries.map(([k]) => k), [sortedOfferEntries]);

  const expandAllSections = () => {
    const next: Record<string, boolean> = {};
    offerKeys.forEach((k) => {
      next[k] = true;
    });
    setOpenSections(next);
  };

  const collapseAllSections = () => setOpenSections({});

  const tipoChips = [
    { val: "", label: "Todos" },
    { val: "Oferta", label: "Oferta / VSL" },
    { val: "Lead", label: "Lead" },
    { val: "Upsell", label: "Upsell" },
  ];

  return (
    <>
      <div className="page-header discarded-page-header">
        <div>
          <div className="page-title">Descartados</div>
          <div className="page-sub">
            Histórico de steps fora do funil ativo · {source.length} no total
            {filters.tipo || filters.search ? ` · ${afterFilters.length} após busca/tipo` : ""}
            {offerFilter ? ` · ${afterOfferFilter.length} na oferta filtrada` : ""}
            {timeRange === "7d" ? ` · ${afterTime.length} nos últimos 7 dias` : ""}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selecionado(s)` : ""}
          </div>
        </div>
      </div>

      <div className="funnel-flow-container discarded-page">
        <div className="discarded-summary">
          <span className="discarded-summary-pill oferta">
            <span className="dsp-icon">🛒</span>
            <span className="dsp-label">Ofertas</span>
            <span className="dsp-n">{source.filter((r) => r.tipo === "Oferta").length}</span>
          </span>
          <span className="discarded-summary-pill lead">
            <span className="dsp-icon">📈</span>
            <span className="dsp-label">Leads</span>
            <span className="dsp-n">{source.filter((r) => r.tipo === "Lead").length}</span>
          </span>
          <span className="discarded-summary-pill upsell">
            <span className="dsp-icon">⬆️</span>
            <span className="dsp-label">Upsells</span>
            <span className="dsp-n">{source.filter((r) => r.tipo === "Upsell").length}</span>
          </span>
          <span className="discarded-summary-pill discarded-brutal">
            <span className="dsp-icon">📌</span>
            <span className="dsp-label">Visível agora</span>
            <span className="dsp-n">{afterTime.length}</span>
            <span className="dsp-hint">de {source.length}</span>
          </span>
        </div>

        <div className="discarded-ux-bar" role="toolbar" aria-label="Atalhos descartados">
          <button
            type="button"
            className={`discarded-ux-chip ${timeRange === "all" ? "on" : ""}`}
            onClick={() => setTimeRange("all")}
          >
            Todo o período
          </button>
          <button
            type="button"
            className={`discarded-ux-chip ${timeRange === "7d" ? "on" : ""}`}
            onClick={() => setTimeRange("7d")}
          >
            Últimos 7 dias
          </button>
          <span className="discarded-ux-sep" aria-hidden />
          <button
            type="button"
            className={`discarded-ux-chip ${sortMode === "recent" ? "on" : ""}`}
            onClick={() => setSortMode("recent")}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={`discarded-ux-chip ${sortMode === "offer" ? "on" : ""}`}
            onClick={() => setSortMode("offer")}
          >
            Por oferta (A–Z)
          </button>
          <span className="discarded-ux-sep" aria-hidden />
          <button type="button" className="discarded-ux-chip discarded-ux-soon" disabled title="Em breve">
            Mais reutilizados
          </button>
        </div>

        <div className="bd-toolbar discarded-toolbar">
          {tipoChips.map((c) => (
            <button
              key={c.val}
              type="button"
              className={`filter-chip ${filters.tipo === c.val ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, tipo: c.val }))}
            >
              {c.label}
            </button>
          ))}
          <div className="discarded-offer-filter-wrap">
            <label className="discarded-offer-filter-label" htmlFor="disc-offer-filter">
              Oferta
            </label>
            <select
              id="disc-offer-filter"
              className="discarded-offer-select"
              value={offerFilter}
              onChange={(e) => setOfferFilter(e.target.value)}
              aria-label="Filtrar por oferta"
            >
              <option value="">Todas as ofertas</option>
              {offerOptions.map((o) => (
                <option key={o} value={o}>
                  {o === "Sem oferta" ? "Sem oferta" : o}
                </option>
              ))}
            </select>
          </div>
          <div className="search-wrap">
            <span className="search-icon" aria-hidden>
              🔍
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Código, nome, oferta, descrição..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <label className="discarded-compact-toggle">
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
            <span>Modo compacto</span>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllVisible}>
            Selecionar visíveis
          </button>
          <div className="discarded-section-bulk">
            <button type="button" className="btn btn-ghost btn-sm" onClick={expandAllSections}>
              Expandir todas
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={collapseAllSections}>
              Recolher todas
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="discarded-bulk-bar" role="region" aria-label="Ações em lote">
            <div className="discarded-bulk-bar-left">
              <span className="discarded-bulk-count">{selectedIds.size} selecionado(s)</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection}>
                Limpar seleção
              </button>
            </div>
            <div className="discarded-bulk-bar-actions">
              <label className="discarded-restore-label">
                <span className="discarded-restore-label-text">Restaurar como</span>
                <select
                  className="discarded-restore-select"
                  value={restoreStatus}
                  onChange={(e) => setRestoreStatus(e.target.value as RestorableStatus)}
                  aria-label="Status ao restaurar"
                >
                  <option value="Pausado">Pausado</option>
                  <option value="Em teste">Em teste</option>
                  <option value="Ativo">Ativo</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onRestoreDiscarded([...selectedIds], restoreStatus)}
              >
                Restaurar selecionados
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onRequestPermanentDelete([...selectedIds])}
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        )}

        {afterTime.length === 0 ? (
          <div className="empty-state discarded-empty">
            <div className="discarded-empty-icon" aria-hidden>
              🗑️
            </div>
            <div className="empty-text">Nada por aqui</div>
            <p className="empty-subtitle">
              Quando um step for marcado como Descartado em Ativos &amp; Teste, ele aparece nesta lista para
              consulta e edição.
            </p>
          </div>
        ) : (
          <div className="funnel-flows-container discarded-flows">
            {sortedOfferEntries.map(([offerKey, offerFunis]) => {
              const open = !!openSections[offerKey];
              const allSel =
                offerFunis.length > 0 && offerFunis.every((f) => selectedIds.has(f.id));
              const someSel = offerFunis.some((f) => selectedIds.has(f.id));
              return (
                <section
                  key={offerKey}
                  className={`flow-section discarded-offer-section${open ? " is-open" : ""}`}
                >
                  <div className="discarded-offer-header-row">
                    <label
                      className="dcc-section-check"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <DiscardedSectionCheckbox
                        checked={allSel}
                        indeterminate={someSel && !allSel}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (allSel) {
                              offerFunis.forEach((f) => next.delete(f.id));
                            } else {
                              offerFunis.forEach((f) => next.add(f.id));
                            }
                            return next;
                          });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="discarded-offer-header-main"
                      onClick={() =>
                        setOpenSections((s) => ({
                          ...s,
                          [offerKey]: !s[offerKey],
                        }))
                      }
                      aria-expanded={open}
                    >
                      <span className="discarded-offer-chevron">{open ? "▼" : "▶"}</span>
                      <h3 className="discarded-offer-title">
                        {offerKey === "Sem oferta" ? "Sem oferta" : `Oferta · ${offerKey}`}
                      </h3>
                      <span className="discarded-offer-count">
                        {offerFunis.length} step{offerFunis.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  </div>

                  {open && (
                    <DiscardedOfferVirtualList
                      funis={offerFunis}
                      compact={compact}
                      onEdit={onEdit}
                      onRequestPermanentDelete={(id) => onRequestPermanentDelete([id])}
                      selectedIds={selectedIds}
                      onToggleRow={toggleRow}
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}