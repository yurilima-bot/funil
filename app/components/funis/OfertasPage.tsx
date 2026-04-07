"use client";

import { Funil } from "@/types/funil";

interface OfertasPageProps {
  db: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function OfertasPage({ db, onEdit, onDelete, onNew }: OfertasPageProps) {
  // Filtrar apenas funis do tipo Oferta
  const ofertas = db.filter(f => f.tipo === "Oferta");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Ofertas</div>
          <div className="page-sub">Páginas de oferta e checkout - {ofertas.length} páginas</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Nova Oferta
        </button>
      </div>

      <div className="funnel-flow-container">
        {ofertas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">ShoppingCart</div>
            <div className="empty-text">Nenhuma página de oferta encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira página de oferta
            </button>
          </div>
        ) : (
          <div className="flow-steps">
            {ofertas.map((funil, index) => (
              <div key={funil.id} className="flow-step-wrapper">
                <div className={`flow-step oferta-step`}>
                  <div className="step-card">
                    <div className="card-header">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-type">OFERTA</span>
                      <span className={`status-indicator ${funil.status.toLowerCase()}`}></span>
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{funil.nome}</h3>
                      <p className="card-code">{funil.codigo}</p>
                      <div className="card-meta">
                        <span className={`status-badge ${funil.status.toLowerCase()}`}>
                          {funil.status}
                        </span>
                        {funil.checkout && (
                          <span className="checkout-tag">{funil.checkout}</span>
                        )}
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
                          Acessar checkout
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
