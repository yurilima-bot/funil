"use client";

import { Funil } from "@/types/funil";

interface UpsellPageProps {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function UpsellPage({ funis, onEdit, onDelete, onNew }: UpsellPageProps) {
  // Filtrar apenas funis do tipo Upsell
  const upsellPages = funis.filter(f => f.tipo === "Upsell");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Upsell Pages</div>
          <div className="page-sub">Páginas de upsell e ofertas adicionais</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Nova Upsell Page
        </button>
      </div>

      <div className="funnel-flow-container">
        {upsellPages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">TrendingUp</div>
            <div className="empty-text">Nenhuma upsell page encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira upsell page
            </button>
          </div>
        ) : (
          <div className="funnel-flow">
            {upsellPages.map((funil, index) => (
              <div key={funil.id} className="funnel-step">
                <div className="step-card upsell-card">
                  <div className="card-header">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-type">UPSELL</span>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{funil.nome}</h3>
                    <p className="card-code">{funil.codigo}</p>
                    <div className="card-meta">
                      <span className={`status-badge ${funil.status.toLowerCase()}`}>
                        {funil.status}
                      </span>
                      {funil.versao && <span className="version-tag">v{funil.versao}</span>}
                      {funil.pais && <span className="country-tag">{funil.pais}</span>}
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
                {index < upsellPages.length - 1 && (
                  <div className="flow-arrow">arrow_downward</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
