"use client";

import { Funil } from "@/types/funil";

interface LeadsPageProps {
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function LeadsPage({ db, onEdit, onDelete, onNew }: LeadsPageProps) {
  // Filtrar apenas funis do tipo Lead
  const leads = db.filter(f => f.tipo === "Lead");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Leads</div>
          <div className="page-sub">Páginas de captura de leads - {leads.length} páginas</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Novo Lead
        </button>
      </div>

      <div className="funnel-flow-container">
        {leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">Campaign</div>
            <div className="empty-text">Nenhuma página de lead encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira página de lead
            </button>
          </div>
        ) : (
          <div className="flow-steps">
            {leads.map((funil, index) => (
              <div key={funil.id} className="flow-step-wrapper">
                <div className={`flow-step lead-step`}>
                  <div className="step-card">
                    <div className="card-header">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-type">LEAD</span>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
