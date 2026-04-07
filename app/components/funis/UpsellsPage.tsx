"use client";

import { Funil } from "@/types/funil";

interface UpsellsPageProps {
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function UpsellsPage({ db, onEdit, onDelete, onNew }: UpsellsPageProps) {
  // Filtrar apenas funis do tipo Upsell
  const upsells = db.filter(f => f.tipo === "Upsell");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Upsells</div>
          <div className="page-sub">Páginas de upsell - {upsells.length} páginas</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Novo Upsell
        </button>
      </div>

      <div className="funnel-flow-container">
        {upsells.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">TrendingUp</div>
            <div className="empty-text">Nenhuma página de upsell encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira página de upsell
            </button>
          </div>
        ) : (
          <div className="flow-steps">
            {upsells.map((funil, index) => (
              <div key={funil.id} className="flow-step-wrapper">
                <div className={`flow-step upsell-step`}>
                  <div className="step-card">
                    <div className="card-header">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-type">UPSELL</span>
                      <span className={`status-indicator ${funil.status.toLowerCase()}`}></span>
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{funil.nome}</h3>
                      <p className="card-code">{funil.codigo}</p>
                      <div className="card-meta">
                        <span className={`status-badge ${funil.status.toLowerCase()}`}>
                          {funil.status}
                        </span>
                        {funil.pais && <span className="country-tag">{funil.pais}</span>}
                        {funil.versao && <span className="version-tag">v{funil.versao}</span>}
                        {funil.oferta && <span className="oferta-tag">{funil.oferta}</span>}
                      </div>
                      {funil.url && (
                        <a 
                          href={funil.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="card-link"
                        >
                          Ver upsell
                        </a>
                      )}
                    </div>
                    <div className="card-actions">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => onEdit(funil.id)}
                        title="Editar"
                      >
                        Editar
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => onDelete(funil.id)}
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
