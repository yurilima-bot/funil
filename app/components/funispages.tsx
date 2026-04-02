"use client";
import { useState } from "react";
import { Funil, ChangelogEntry } from "@/types/funil";
import { StatusBadge, TipoBadge } from "./badges";

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
}

function applyFilters(records: Funil[], f: Filters) {
  return records.filter((r) => {
    if (f.tipo && r.tipo !== f.tipo) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.search) {
      const hay = (r.codigo + r.nome + r.oferta + r.pais + r.checkout).toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  });
}

export function BDPage({
  db,
  changelog = [],
  onOpenChangelog,
  onEdit,
  onDelete,
  onNew,
}: BDPageProps) {
  const [filters, setFilters] = useState<Filters>(defaultFilters());

  const ativo = db.filter((r) => r.status === "Ativo").length;
  const teste = db.filter((r) => r.status === "Em teste").length;
  const pausado = db.filter((r) => r.status === "Pausado").length;
  const desc = db.filter((r) => r.status === "Descartado").length;
  const emOperacao = ativo + teste;

  const recs = applyFilters(db, filters);

  const recentLogs = [...changelog]
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, 6);

  const actionLabel: Record<string, string> = {
    create: "Cadastro",
    edit: "Edição",
    delete: "Exclusão",
    status: "Status",
  };

  function setChip(key: "tipo" | "status", val: string) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

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
    { val: "Descartado", label: "Descartado" },
  ];

  const hasFilters = Boolean(filters.tipo || filters.status || filters.search.trim());

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Base de dados</div>
          <div className="page-sub">
            Visão geral da base e lista filtrável de funis
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo funil
        </button>
      </div>
      <div className="page-body bd-page-body">
        <section className="bd-section bd-section-metrics" aria-labelledby="bd-metrics-heading">
          <div className="bd-section-head">
            <h2 id="bd-metrics-heading" className="bd-section-title">
              Visão rápida
            </h2>
            <p className="bd-section-desc">
              Indicadores da base inteira antes de aplicar filtros na tabela.
            </p>
          </div>
          <div className="bd-kpi-grid">
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Total</div>
              <div className="bd-kpi-value bd-kpi-value-accent">{db.length}</div>
            </div>
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Em operação</div>
              <div className="bd-kpi-value bd-kpi-value-accent">{emOperacao}</div>
              <div className="bd-kpi-hint">ativo + em teste</div>
            </div>
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Ativo</div>
              <div className="bd-kpi-value bd-kpi-value-green">{ativo}</div>
            </div>
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Em teste</div>
              <div className="bd-kpi-value bd-kpi-value-amber">{teste}</div>
            </div>
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Pausado</div>
              <div className="bd-kpi-value bd-kpi-value-slate">{pausado}</div>
            </div>
            <div className="bd-kpi-tile">
              <div className="bd-kpi-label">Descartado</div>
              <div className="bd-kpi-value bd-kpi-value-red">{desc}</div>
            </div>
          </div>
        </section>

        <div className="bd-split">
          <div className="bd-split-main">
            <section className="bd-panel" aria-labelledby="bd-list-heading">
              <div className="bd-panel-head">
                <div>
                  <h2 id="bd-list-heading" className="bd-panel-title">
                    Lista de funis
                  </h2>
                  <p className="bd-panel-meta">
                    Mostrando <strong>{recs.length}</strong> de <strong>{db.length}</strong> registros
                    {hasFilters ? " com os filtros aplicados" : ""}
                  </p>
                </div>
                {hasFilters ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFilters(defaultFilters())}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>

              <div className="bd-toolbar">
                <div className="bd-toolbar-inner">
                  <div className="filter-group filter-group-grow">
                    <span className="filter-group-label">Tipo</span>
                    <div className="filter-group-chips">
                      {tipoChips.map((c) => (
                        <button
                          key={c.val || "all"}
                          type="button"
                          className={`filter-chip ${filters.tipo === c.val ? "on" : ""}`}
                          onClick={() => setChip("tipo", c.val)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-group filter-group-grow">
                    <span className="filter-group-label">Status</span>
                    <div className="filter-group-chips">
                      {statusChips.map((c) => (
                        <button
                          key={c.val}
                          type="button"
                          className={`filter-chip ${filters.status === c.val ? "on" : ""}`}
                          onClick={() => setChip("status", c.val)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bd-search-block">
                    <label className="filter-group-label" htmlFor="bd-search-input">
                      Buscar
                    </label>
                    <div className="search-wrap bd-search-wrap">
                      <span className="search-icon" aria-hidden>
                        🔍
                      </span>
                      <input
                        id="bd-search-input"
                        className="search-input bd-search-input"
                        type="search"
                        placeholder="Código, nome, oferta, país..."
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-wrap bd-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Oferta</th>
                <th>Nome</th>
                <th>Versão</th>
                <th>País</th>
                <th>Checkout</th>
                <th>URL</th>
                <th>Status</th>
                <th>Data</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {recs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="no-results">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                recs.map((r) => (
                  <tr key={r.id}>
                    <td className="code-cell">{r.codigo}</td>
                    <td>
                      <TipoBadge tipo={r.tipo} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>
                        {r.oferta || "—"}
                      </span>
                    </td>
                    <td>{r.nome}</td>
                    <td>
                      <span className="version-tag">{r.versao || "—"}</span>
                    </td>
                    <td>
                      <span className="country-tag">{r.pais}</span>
                    </td>
                    <td>
                      <span className="plat-tag">{r.checkout || "—"}</span>
                    </td>
                    <td>
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="url-link"
                        >
                          {r.url.replace(/https?:\/\//, "")}
                        </a>
                      ) : (
                        <span style={{ color: "var(--text4)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text4)" }}>
                      {r.dataCriacao || "—"}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onEdit(r.id)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(r.id)}
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
            </section>
          </div>

          <aside className="bd-aside" aria-label="Atividade recente">
            <div className="bd-aside-head">
              <div>
                <div className="bd-aside-title">Atividade recente</div>
                <p className="bd-aside-sub">Últimas mudanças na base</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onOpenChangelog?.()}
              >
                Ver tudo
              </button>
            </div>
            {recentLogs.length === 0 ? (
              <p className="bd-aside-empty">Nenhuma alteração registrada ainda.</p>
            ) : (
              <ul className="bd-aside-list">
                {recentLogs.map((log, i) => (
                  <li key={`${log.codigo}-${log.timestamp}-${i}`} className="bd-aside-item">
                    <div className="bd-aside-item-title">
                      {actionLabel[log.action] || log.action} — <strong>{log.codigo}</strong>
                    </div>
                    <div className="bd-aside-item-meta">
                      {log.timestamp}
                      {log.userEmail ? (
                        <span className="bd-aside-user"> · {log.userEmail}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

export function AtivosPage({ db, onEdit, onDelete, onNew }: Omit<FunisTablePageProps, "page">) {
  const [filters, setFilters] = useState<Filters>(defaultFilters());

  const source = db.filter((r) => r.status !== "Descartado");
  const ativo = source.filter((r) => r.status === "Ativo").length;
  const teste = source.filter((r) => r.status === "Em teste").length;
  const pausado = source.filter((r) => r.status === "Pausado").length;

  const recs = applyFilters(source, filters);

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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Ativos & Em Teste</div>
          <div className="page-sub">Funis recebendo tráfego ou em A/B test</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew()}>
          + Novo Funil
        </button>
      </div>
      <div className="page-body">
        <div className="stats-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
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

        <div
          className="toolbar"
          style={{
            margin: "0 0 0",
            borderRadius: "10px 10px 0 0",
            border: "1px solid var(--border)",
          }}
        >
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

        <div
          className="table-wrap"
          style={{ borderTop: "none", borderRadius: "0 0 10px 10px" }}
        >
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Oferta</th>
                <th>Nome</th>
                <th>Versão</th>
                <th>País</th>
                <th>Checkout</th>
                <th>Status</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {recs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-results">
                    Nenhum funil ativo ou em teste
                  </td>
                </tr>
              ) : (
                recs.map((r) => (
                  <tr key={r.id}>
                    <td className="code-cell">{r.codigo}</td>
                    <td>
                      <TipoBadge tipo={r.tipo} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>
                        {r.oferta || "—"}
                      </span>
                    </td>
                    <td>{r.nome}</td>
                    <td>
                      <span className="version-tag">{r.versao || "—"}</span>
                    </td>
                    <td>
                      <span className="country-tag">{r.pais}</span>
                    </td>
                    <td>
                      <span className="plat-tag">{r.checkout || "—"}</span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onEdit(r.id)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(r.id)}
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function DescartadosPage({ db, onEdit, onDelete, onNew }: Omit<FunisTablePageProps, "page">) {
  const [filters, setFilters] = useState<Filters>(defaultFilters());

  const source = db.filter((r) => r.status === "Descartado");
  const recs = applyFilters(source, filters);

  const tipoChips = [
    { val: "", label: "Todos" },
    { val: "Oferta", label: "Oferta / VSL" },
    { val: "Lead", label: "Lead" },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Descartados</div>
          <div className="page-sub">Funis que não serão utilizados</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNew("descartado")}>
          + Adicionar
        </button>
      </div>
      <div className="page-body">
        <div
          className="toolbar"
          style={{
            margin: "0 0 0",
            borderRadius: "10px 10px 0 0",
            border: "1px solid var(--border)",
          }}
        >
          {tipoChips.map((c) => (
            <button
              key={c.val}
              className={`filter-chip ${filters.tipo === c.val ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, tipo: c.val }))}
            >
              {c.label}
            </button>
          ))}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>

        <div
          className="table-wrap"
          style={{ borderTop: "none", borderRadius: "0 0 10px 10px" }}
        >
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Oferta</th>
                <th>Nome</th>
                <th>País</th>
                <th>Data</th>
                <th>Descrição</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {recs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-results">
                    Nenhum funil descartado
                  </td>
                </tr>
              ) : (
                recs.map((r) => (
                  <tr key={r.id}>
                    <td className="code-cell">{r.codigo}</td>
                    <td>
                      <TipoBadge tipo={r.tipo} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>
                        {r.oferta || "—"}
                      </span>
                    </td>
                    <td>{r.nome}</td>
                    <td>
                      <span className="country-tag">{r.pais}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text4)" }}>
                      {r.dataCriacao || "—"}
                    </td>
                    <td className="desc-cell">{r.descricao || "—"}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => onEdit(r.id)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(r.id)}
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}