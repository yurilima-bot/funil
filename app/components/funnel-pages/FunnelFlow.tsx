"use client";

import { Funil } from "@/types/funil";

interface FunnelFlowProps {
  funis: Funil[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function FunnelFlow({ funis, onEdit, onDelete, onNew }: FunnelFlowProps) {
  // Agrupar funis por oferta para criar fluxos completos
  const groupedFlows = funis.reduce((acc, funil) => {
    const key = funil.oferta || 'default';
    if (!acc[key]) acc[key] = [];
    acc[key].push(funil);
    return acc;
  }, {} as Record<string, Funil[]>);

  // Ordenar cada fluxo: Lead -> Oferta -> Upsell -> Confirmação
  Object.keys(groupedFlows).forEach(key => {
    groupedFlows[key].sort((a, b) => {
      const order = { 'Lead': 0, 'Oferta': 1, 'Upsell': 2 };
      const aOrder = order[a.tipo as keyof typeof order] ?? 99;
      const bOrder = order[b.tipo as keyof typeof order] ?? 99;
      return aOrder - bOrder;
    });
  });

  return (
    <div className="funnel-page">
      <div className="page-header">
        <div>
          <div className="page-title">Funnel Flow</div>
          <div className="page-sub">Visualização completa dos funis em fluxo</div>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + Novo Funil
        </button>
      </div>

      <div className="funnel-flows-container">
        {Object.entries(groupedFlows).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">AccountTree</div>
            <div className="empty-text">Nenhum fluxo de funil encontrado</div>
            <button className="btn btn-primary" onClick={onNew}>
              + Criar primeiro funil
            </button>
          </div>
        ) : (
          <div className="flows-grid">
            {Object.entries(groupedFlows).map(([flowKey, flowFunis]) => (
              <div key={flowKey} className="flow-section">
                <div className="flow-header">
                  <h3 className="flow-title">
                    {flowKey === 'default' ? 'Funil Principal' : flowKey}
                  </h3>
                  <div className="flow-stats">
                    <span className="stat-item">{flowFunis.length} passos</span>
                    <span className="stat-item">
                      {flowFunis.filter(f => f.status === 'Ativo').length} ativos
                    </span>
                  </div>
                </div>
                
                <div className="flow-steps">
                  {flowFunis.map((funil, index) => (
                    <div key={funil.id} className="flow-step-wrapper">
                      <div className={`flow-step ${funil.tipo.toLowerCase()}-step`}>
                        <div className="step-connector">
                          {index > 0 && <div className="connector-line"></div>}
                        </div>
                        
                        <div className="step-card">
                          <div className="step-icon">
                            {funil.tipo === 'Lead' && 'Campaign'}
                            {funil.tipo === 'Oferta' && 'ShoppingCart'}
                            {funil.tipo === 'Upsell' && 'TrendingUp'}
                            {funil.tipo !== 'Lead' && funil.tipo !== 'Oferta' && funil.tipo !== 'Upsell' && 'Description'}
                          </div>
                          
                          <div className="step-content">
                            <h4 className="step-title">{funil.nome}</h4>
                            <p className="step-code">{funil.codigo}</p>
                            
                            <div className="step-meta">
                              <span className={`step-status ${funil.status.toLowerCase()}`}>
                                {funil.status}
                              </span>
                              {funil.pais && <span className="step-country">{funil.pais}</span>}
                              {funil.checkout && <span className="step-checkout">{funil.checkout}</span>}
                            </div>
                            
                            {funil.url && (
                              <a 
                                href={funil.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="step-link"
                              >
                                Visitar página
                              </a>
                            )}
                          </div>
                          
                          <div className="step-actions">
                            <button 
                              className="step-action-btn edit"
                              onClick={() => onEdit(funil.id)}
                              title="Editar"
                            >
                              edit
                            </button>
                            <button 
                              className="step-action-btn delete"
                              onClick={() => onDelete(funil.id)}
                              title="Excluir"
                            >
                              delete
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {index < flowFunis.length - 1 && (
                        <div className="flow-arrow">
                          <div className="arrow-icon">arrow_downward</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
