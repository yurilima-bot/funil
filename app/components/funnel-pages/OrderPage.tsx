"use client";

import { Funil } from "@/types/funil";

interface OrderPageProps {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function OrderPage({ funis, onEdit, onDelete, onNew }: OrderPageProps) {
  // Filtrar apenas funis do tipo Oferta (páginas de pedido)
  const orderPages = funis.filter(f => f.tipo === "Oferta");

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Order Pages</div>
          <div className="page-sub">Páginas de pedido e checkout</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Nova Order Page
        </button>
      </div>

      <div className="funnel-flow-container">
        {orderPages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">ShoppingCart</div>
            <div className="empty-text">Nenhuma order page encontrada</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeira order page
            </button>
          </div>
        ) : (
          <div className="funnel-flow">
            {orderPages.map((funil, index) => (
              <div key={funil.id} className="funnel-step">
                <div className="step-card order-card">
                  <div className="card-header">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-type">ORDER</span>
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
                {index < orderPages.length - 1 && (
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
