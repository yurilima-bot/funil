"use client";

import { Funil } from "@/types/funil";

interface SalesPageProps {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function SalesPage({ funis, onEdit, onDelete, onNew }: SalesPageProps) {
  // Filtrar apenas funis do tipo Lead (páginas de captura/venda)
  const salesPages = funis.filter(f => f.tipo === "Lead");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Sales Pages</div>
          <div className="page-sub">Páginas de venda e captura de leads</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Nova Sales Page
        </button>
      </div>

      <div className="funnel-flow-container">
        {salesPages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"> ShoppingCart</div>
            <div className="empty-text">Nenhuma sales page encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira sales page
            </button>
          </div>
        ) : (
          <div className="funnel-flow">
            {salesPages.map((funil, index) => (
              <div key={funil.id} className="funnel-step">
                <div className="step-card sales-card">
                  <div className="card-header">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-type">SALES</span>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{funil.nome}</h3>
                    <p className="card-code">{funil.codigo}</p>
                    <div className="card-meta">
                      <span className={`status-badge ${funil.status.toLowerCase()}`}>
                        {funil.status}
                      </span>
                      {funil.pais && <span className="country-tag">{funil.pais}</span>}
                    </div>
                    {funil.url && (
                      <a 
                        href={funil.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="card-link"
                      >
                        Visitar página
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
                {index < salesPages.length - 1 && (
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
