"use client";
import { useEffect, useMemo, useRef } from "react";
import { Funil } from "@/types/funil";

// ─── Version helpers ──────────────────────────────────────────────────────────

function extractVersionNumber(v: string | undefined): number {
  if (!v) return 0;
  const match = v.replace(/^v/i, "").match(/^\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function suggestNextVersion(funis: Funil[], ofertaCode: string): string {
  const code = ofertaCode.trim().toUpperCase();
  if (!code) return "";
  // Family = the linked target itself + every funil that points to the same code
  const family = funis.filter(
    (f) =>
      f.codigo.trim().toUpperCase() === code ||
      (f.oferta || "").trim().toUpperCase() === code
  );
  if (family.length === 0) return "1";
  const maxV = Math.max(0, ...family.map((f) => extractVersionNumber(f.versao)));
  return String(maxV + 1);
}

interface ModalProps {
  open: boolean;
  mode: "create" | "edit";
  form: Partial<Funil>;
  onChange: (field: keyof Funil, value: string) => void;
  /** Em criação com vínculo Ativo/Em teste: se o usuário optar por pausar o vínculo, envia o id aqui. */
  onSave: (pauseLinkedFunilId?: string) => void;
  onClose: () => void;
  /** Lista completa para o select de vínculo (filtrado pelo tipo do step). */
  allFunis: Funil[];
  editingId: string | null;
}

// Cores por tipo para o visual Funnelytics
const tipoColors: Record<string, { bg: string; border: string; text: string }> = {
  Lead: { bg: "#ecfdf5", border: "#10b981", text: "#059669" },
  Oferta: { bg: "#eff4ff", border: "#1a56db", text: "#1e40af" },
  Upsell: { bg: "#fffbeb", border: "#f59e0b", text: "#d97706" },
};

// Status config para badges
const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  Ativo: { color: "#059669", bg: "#ecfdf5", icon: "✓" },
  "Em teste": { color: "#d97706", bg: "#fffbeb", icon: "🧪" },
  Pausado: { color: "#6b7280", bg: "#f3f4f6", icon: "⏸" },
  Descartado: { color: "#dc2626", bg: "#fef2f2", icon: "🗑" },
};

export default function FunilModal({
  open,
  mode,
  form,
  onChange,
  onSave,
  onClose,
  allFunis,
  editingId,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keep onChange in a ref to avoid stale closures in effects
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Auto-suggest version when a link (oferta) is selected and version is still empty
  const ofertaCode = (form.oferta || "").trim().toUpperCase();
  const suggestedVersion = useMemo(
    () => suggestNextVersion(allFunis, ofertaCode),
    [allFunis, ofertaCode]
  );
  useEffect(() => {
    if (mode !== "create" || !ofertaCode || form.versao) return;
    onChangeRef.current("versao", suggestedVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofertaCode, suggestedVersion, mode]);

  function handleBgClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // "oferta" agora representa a Oferta (pai) do step (Lead/Upsell ficam dentro da Oferta).
  const ofertaPaiOptions = useMemo(() => {
    return allFunis
      .filter((f) => f.tipo === "Oferta" && f.id !== editingId)
      .slice()
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
  }, [allFunis, editingId]);

  const tipoColor = tipoColors[form.tipo || "Oferta"];

  const needsOfertaPai = form.tipo === "Lead" || form.tipo === "Upsell";

  const isChildQuickCreate = form.tipo === "Lead" || form.tipo === "Upsell";

  function handleTipoChange(tipo: string) {
    onChange("tipo", tipo);
    // Auto-sugerir código baseado no tipo
    if (mode === "create" && !form.codigo) {
      const sugestoes: Record<string, string> = {
        Lead: "OF000-LEAD01",
        Oferta: "OF000",
        Upsell: "OF000-UP01"
      };
      onChange("codigo", sugestoes[tipo] || "");
    }
    // Ao trocar para Oferta, limpa o campo de oferta (pai), pois ela é o root.
    if (tipo === "Oferta") onChange("oferta", "");
  }

  return (
    <div
      ref={overlayRef}
      className={`overlay ${open ? "open" : ""}`}
      onClick={handleBgClick}
    >
      <div className="modal funnel-modal">
        {/* Header com identificação visual do tipo */}
        <div 
          className="modal-header"
          style={{
            background: `linear-gradient(135deg, ${tipoColor?.bg || "#f8fafc"} 0%, #ffffff 100%)`,
            borderLeft: `4px solid ${tipoColor?.border || "#1a56db"}`,
          }}
        >
          <div className="modal-header-content">
            <div className="modal-title-row">
              <span 
                className="modal-type-badge"
                style={{
                  background: tipoColor?.bg,
                  color: tipoColor?.text,
                  border: `1px solid ${tipoColor?.border}`,
                }}
              >
                {form.tipo || "Novo"}
              </span>
              <div className="modal-title-text">
                {mode === "create" ? "Novo Step do Funil" : `Editando: ${form.codigo}`}
              </div>
            </div>
            <div className="modal-sub">
              {mode === "create"
                ? "Adicione um novo elemento ao seu funil de vendas"
                : "Edite as informações deste step do funil"}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Fluxo (sem ícones) */}
     

        {/* Formulário organizado em seções */}
        <div className="modal-body">
          {/* Seção: Identificação */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🏷️</span>
              Identificação
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo do Step *</label>
                {isChildQuickCreate ? (
                  <input type="text" value={form.tipo || ""} disabled />
                ) : (
                  <div className="tipo-selector">
                    {["Oferta"].map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        className={`tipo-option ${form.tipo === tipo ? "active" : ""}`}
                        onClick={() => handleTipoChange(tipo)}
                        style={{
                          background: form.tipo === tipo ? tipoColors[tipo]?.bg : "#fff",
                          borderColor: form.tipo === tipo ? tipoColors[tipo]?.border : "#e5e7eb",
                          color: form.tipo === tipo ? tipoColors[tipo]?.text : "#6b7280",
                        }}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Código *</label>
                <input
                  type="text"
                  value={form.codigo || ""}
                  onChange={(e) => onChange("codigo", e.target.value)}
                  placeholder="ex: OF038"
                  className="codigo-input"
                />
                <div className="form-hint">
                  Código único de identificação do step
                </div>
              </div>

              <div className="form-group full">
                <label>Nome do Step *</label>
                <input
                  type="text"
                  value={form.nome || ""}
                  onChange={(e) => onChange("nome", e.target.value)}
                  placeholder="ex: BR_Diabetes_VSL"
                />
              </div>
            </div>
          </div>

          {/* Seção: Configurações */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">⚙️</span>
              Configurações
            </div>
            <div className="form-grid">

              <div className="form-group">
                <label>Status *</label>
                <div className="status-selector">
                  {(mode === "create" 
                    ? ["Ativo", "Em teste", "Pausado"] 
                    : ["Ativo", "Em teste", "Pausado", "Descartado"]
                  ).map((status) => {
                    const config = statusConfig[status];
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`status-option ${form.status === status ? "active" : ""}`}
                        onClick={() => onChange("status", status)}
                        style={{
                          background: form.status === status ? config?.bg : "#fff",
                          borderColor: form.status === status ? config?.color : "#e5e7eb",
                          color: form.status === status ? config?.color : "#6b7280",
                        }}
                      >
                        <span>{config?.icon}</span>
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>País *</label>
                <select
                  value={form.pais || ""}
                  onChange={(e) => onChange("pais", e.target.value)}
                >
                  <option value="">Selecionar país...</option>
                  <option value="BR">🇧🇷 Brasil</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                  <option value="DE">🇩🇪 Alemanha</option>
                  <option value="PT">🇵🇹 Portugal</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="ES">🇪🇸 Espanha</option>
                  <option value="FR">🇫🇷 França</option>
                  <option value="IT">🇮🇹 Itália</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="CO">🇨🇴 Colômbia</option>
                  <option value="GLOBAL">🌐 Global</option>
                </select>
              </div>

              <div className="form-group">
                <label>Versão</label>
                <input
                  type="text"
                  value={form.versao || ""}
                  onChange={(e) => onChange("versao", e.target.value)}
                  placeholder={
                    ofertaCode && suggestedVersion
                      ? `Sugerida: ${suggestedVersion}`
                      : "ex: 1, 2, 3..."
                  }
                />
                {ofertaCode && suggestedVersion && !form.versao && (
                  <div className="form-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Próxima versão para esta oferta:</span>
                    <button
                      type="button"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#1a56db",
                        background: "#eff4ff",
                        border: "1px solid #1a56db40",
                        borderRadius: 5,
                        padding: "1px 8px",
                        cursor: "pointer",
                      }}
                      onClick={() => onChange("versao", suggestedVersion)}
                    >
                      Usar v{suggestedVersion}
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Plataforma de Checkout</label>
                <select
                  value={form.checkout || ""}
                  onChange={(e) => onChange("checkout", e.target.value)}
                >
                  <option value="">Sem checkout</option>
                  {[
                    "Yampi",
                    "Digistore24",
                    "CartPanda",
                    "Hotmart",
                    "Eduzz",
                    "Monetizze",
                    "Shopify",
                    "ClickFunnels",
                    "Outro",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{needsOfertaPai ? "Oferta (pai) *" : "Oferta (pai)"}</label>
                {!form.tipo ? (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Escolha o tipo do step acima para listar os vínculos possíveis.
                  </p>
                ) : (
                  <>
                    <select
                      value={(form.oferta || "").trim().toUpperCase()}
                      onChange={(e) => onChange("oferta", e.target.value)}
                      disabled={form.tipo === "Oferta"}
                    >
                      <option value="">
                        {form.tipo === "Oferta" ? "Oferta é o step principal" : "Selecionar oferta..."}
                      </option>
                      {ofertaPaiOptions.map((f) => (
                        <option key={f.id} value={f.codigo}>
                          {f.codigo} — {f.nome} ({f.status})
                        </option>
                      ))}
                    </select>
                    <div className="form-hint">
                      {form.tipo === "Oferta"
                        ? "Oferta é o step principal. Leads e Upsells ficam dentro dela."
                        : "Escolha a Oferta onde este step vai ficar. Depois, conecte os steps no canvas (ex: Oferta → Lead → Lead)."}
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label>Data de Criação</label>
                <input
                  type="date"
                  value={form.dataCriacao || ""}
                  onChange={(e) => onChange("dataCriacao", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seção: URL e Notas */}
          <div className="form-section">
            <div className="section-title">
              <span className="section-icon">🔗</span>
              URL e Notas
            </div>
            <div className="form-grid">

              <div className="form-group full">
                <label>URL da Página</label>
                <input
                  type="url"
                  value={form.url || ""}
                  onChange={(e) => onChange("url", e.target.value)}
                  placeholder="https://sua-pagina.com/oferta"
                />
              </div>

              <div className="form-group full">
                <label>Descrição / Notas</label>
                <textarea
                  value={form.descricao || ""}
                  onChange={(e) => onChange("descricao", e.target.value)}
                  placeholder="Adicione notas sobre este step, contexto, estratégia de teste, motivo do descarte..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer com preview */}
        <div className="modal-footer">
          <div className="footer-preview">
            {form.tipo && form.codigo && (
              <div 
                className="preview-card"
                style={{
                  background: tipoColor?.bg,
                  border: `1px solid ${tipoColor?.border}`,
                }}
              >
                <span className="preview-tipo">{form.tipo}</span>
                <span className="preview-codigo">{form.codigo}</span>
                {form.status && (
                  <span 
                    className="preview-status"
                    style={{
                      background: statusConfig[form.status]?.bg,
                      color: statusConfig[form.status]?.color,
                    }}
                  >
                    {statusConfig[form.status]?.icon} {form.status}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                onSave(undefined);
              }}
              disabled={
                !form.tipo ||
                !form.codigo ||
                !form.nome ||
                !form.pais ||
                !form.status ||
                (needsOfertaPai && !(form.oferta || "").trim())
              }
            >
              {mode === "create" ? "✓ Criar Step" : "✓ Atualizar Step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
