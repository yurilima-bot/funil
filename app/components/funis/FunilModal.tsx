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

  const vinculoAlvo = useMemo(() => {
    const c = (form.oferta || "").trim().toUpperCase();
    if (!c) return null;
    return allFunis.find((f) => f.codigo === c && f.id !== editingId) ?? null;
  }, [form.oferta, allFunis, editingId]);

  const vinculoOptions = useMemo(() => {
    const t = form.tipo as Funil["tipo"];
    if (!t) return [];
    return allFunis
      .filter(
        (f) =>
          f.tipo === t &&
          f.id !== editingId &&
          f.status === "Ativo"
      )
      .slice()
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
  }, [allFunis, form.tipo, editingId]);

  const tipoColor = tipoColors[form.tipo || "Oferta"];

  /** Linked step exists and is active or in test — relevant only during creation */
  const vinculoAtivo =
    mode === "create" &&
    vinculoAlvo &&
    (vinculoAlvo.status === "Ativo" || vinculoAlvo.status === "Em teste");

  /**
   * Auto-pause rule:
   * - New step "Ativo" → pause the linked (it becomes the only active)
   * - New step "Em teste" → keep the linked running, both coexist
   */
  const autoPauseLinked = vinculoAtivo && form.status === "Ativo";

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

        {/* Visual do Fluxo do Funil */}
        <div className="funnel-flow-preview">
          <div className="flow-step-mini lead">
            <div className={`step-icon ${form.tipo === "Lead" ? "active" : ""}`}>📈</div>
            <span>Lead</span>
          </div>
          <div className="flow-arrow-mini">→</div>
          <div className="flow-step-mini oferta">
            <div className={`step-icon ${form.tipo === "Oferta" ? "active" : ""}`}>🛒</div>
            <span>Oferta</span>
          </div>
          <div className="flow-arrow-mini">→</div>
          <div className="flow-step-mini upsell">
            <div className={`step-icon ${form.tipo === "Upsell" ? "active" : ""}`}>⬆️</div>
            <span>Upsell</span>
          </div>
        </div>

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
                <div className="tipo-selector">
                  {["Lead", "Oferta", "Upsell"].map((tipo) => (
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
                      <span className="tipo-icon">
                        {tipo === "Lead" && "📈"}
                        {tipo === "Oferta" && "🛒"}
                        {tipo === "Upsell" && "⬆️"}
                      </span>
                      {tipo === "Oferta" ? "Oferta / VSL" : tipo}
                    </button>
                  ))}
                </div>
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
                <label>Vincular a outro step</label>
                {!form.tipo ? (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Escolha o tipo do step acima para listar os vínculos possíveis.
                  </p>
                ) : (
                  <>
                    <select
                      value={(form.oferta || "").trim().toUpperCase()}
                      onChange={(e) => onChange("oferta", e.target.value)}
                      disabled={!vinculoOptions.length}
                    >
                      <option value="">Não vinculado</option>
                      {vinculoOptions.map((f) => (
                        <option key={f.id} value={f.codigo}>
                          {f.codigo} — {f.nome} ({f.status})
                        </option>
                      ))}
                    </select>
                    {form.tipo && !vinculoOptions.length && (
                      <div className="form-hint">Não há outro step do tipo «{form.tipo}» para vincular.</div>
                    )}
                    {vinculoAtivo && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `1px solid ${autoPauseLinked ? "#fca5a5" : "#86efac"}`,
                          background: autoPauseLinked ? "#fff1f2" : "#f0fdf4",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: 16, marginTop: 1 }}>
                          {autoPauseLinked ? "⏸" : "🧪"}
                        </span>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: autoPauseLinked ? "#991b1b" : "#166534" }}>
                          {autoPauseLinked ? (
                            <>
                              <strong>{vinculoAlvo!.codigo}</strong> será pausado automaticamente.
                              Este novo step ficará como o único <strong>Ativo</strong>.
                            </>
                          ) : (
                            <>
                              <strong>{vinculoAlvo!.codigo}</strong> continuará <strong>{vinculoAlvo!.status}</strong>.
                              Este novo step será criado como <strong>Em teste</strong>, ambos rodam juntos.
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="form-hint">
                      Somente steps <strong>Ativos</strong> (mesmo tipo:{" "}
                      {form.tipo === "Oferta" ? "ofertas" : form.tipo === "Lead" ? "leads" : "upsells"}). Descartados,
                      pausados e em teste não aparecem na lista.
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
                onSave(autoPauseLinked ? vinculoAlvo!.id : undefined);
              }}
              disabled={!form.tipo || !form.codigo || !form.nome || !form.pais || !form.status}
            >
              {mode === "create" ? "✓ Criar Step" : "✓ Atualizar Step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
