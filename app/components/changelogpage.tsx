"use client";
import { useState } from "react";
import { ChangelogEntry } from "@/types/funil";

interface ChangelogPageProps {
  changelog: ChangelogEntry[];
}

type CLFilter = "" | "create" | "edit" | "delete" | "status";

export default function ChangelogPage({ changelog }: ChangelogPageProps) {
  const [filter, setFilter] = useState<CLFilter>("");
  const [search, setSearch] = useState("");

  const aLabel: Record<string, string> = {
    create: "Cadastro",
    edit: "Edição",
    delete: "Exclusão",
    status: "Mudança de status",
  };
  const aDot: Record<string, string> = {
    create: "cl-dot-create",
    edit: "cl-dot-edit",
    delete: "cl-dot-delete",
    status: "cl-dot-status",
  };

  const chips: { val: CLFilter; label: string }[] = [
    { val: "", label: "Todos" },
    { val: "create", label: "Criação" },
    { val: "edit", label: "Edição" },
    { val: "delete", label: "Exclusão" },
    { val: "status", label: "Status" },
  ];

  const logs = [...changelog]
    .reverse()
    .filter((l) => !filter || l.action === filter)
    .filter((l) =>
      !search || (l.codigo || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="page-content active" id="page-changelog">
      <div className="page-header">
        <div>
          <div className="page-title">Histórico de Alterações</div>
          <div className="page-sub">Rastreamento completo de todas as mudanças</div>
        </div>
      </div>
      <div className="page-body">
        <div
          className="toolbar"
          style={{
            margin: "0 0 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
          }}
        >
          {chips.map((c) => (
            <button
              key={c.val}
              className={`filter-chip ${filter === c.val ? "on" : ""}`}
              onClick={() => setFilter(c.val)}
            >
              {c.label}
            </button>
          ))}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar por código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="changelog-list">
          {logs.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--text4)",
                fontSize: 13,
              }}
            >
              Nenhuma alteração registrada
            </div>
          ) : (
            logs.map((l, i) => (
              <div className="cl-item" key={i}>
                <div className={`cl-dot ${aDot[l.action] || "cl-dot-edit"}`} />
                <div className="cl-body">
                  <div className="cl-title">
                    {aLabel[l.action] || l.action} —{" "}
                    <span className="cl-code">{l.codigo || "—"}</span> · {l.nome || ""}
                  </div>
                  <div className="cl-meta">
                    <span>🕐 {l.timestamp}</span>
                    {l.userEmail && <span>👤 {l.userEmail}</span>}
                    {l.oldStatus && l.newStatus && (
                      <span>
                        📌 {l.oldStatus} → {l.newStatus}
                      </span>
                    )}
                    {l.fields && <span>Campos: {l.fields}</span>}
                  </div>
                  {l.descricao && (
                    <div className="cl-detail">{l.descricao}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}