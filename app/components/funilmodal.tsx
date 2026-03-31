"use client";
import { useEffect, useRef } from "react";
import { Funil } from "@/app/components/types/funil";

interface ModalProps {
  open: boolean;
  mode: "create" | "edit";
  form: Partial<Funil>;
  onChange: (field: keyof Funil, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function FunilModal({
  open,
  mode,
  form,
  onChange,
  onSave,
  onClose,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={overlayRef}
      className={`overlay ${open ? "open" : ""}`}
      onClick={handleBgClick}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {mode === "create" ? "Novo Funil" : "Editar Funil"}
            </div>
            <div className="modal-sub">
              {mode === "create"
                ? "Cadastre uma vez — aparece automaticamente em todas as abas"
                : `Editando: ${form.codigo} — alterações refletem em todas as abas`}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Código *</label>
            <input
              type="text"
              value={form.codigo || ""}
              onChange={(e) => onChange("codigo", e.target.value)}
              placeholder="ex: OF038 ou OF038-LEAD01"
            />
            <div className="form-hint">
              OF### para oferta/VSL · OF###-LEAD## para lead
            </div>
          </div>

          <div className="form-group">
            <label>Tipo *</label>
            <select
              value={form.tipo || ""}
              onChange={(e) => onChange("tipo", e.target.value)}
            >
              <option value="">Selecionar...</option>
              <option value="Oferta">Oferta / VSL</option>
              <option value="Lead">Lead</option>
              <option value="Upsell">Upsell</option>
            </select>
          </div>

          <div className="form-group">
            <label>Oferta vinculada</label>
            <input
              type="text"
              value={form.oferta || ""}
              onChange={(e) => onChange("oferta", e.target.value)}
              placeholder="ex: OF038"
            />
          </div>

          <div className="form-group">
            <label>Nome *</label>
            <input
              type="text"
              value={form.nome || ""}
              onChange={(e) => onChange("nome", e.target.value)}
              placeholder="ex: BR_Diabetes"
            />
          </div>

          <div className="form-group">
            <label>Versão</label>
            <select
              value={form.versao || ""}
              onChange={(e) => onChange("versao", e.target.value)}
            >
              <option value="">—</option>
              {["V1", "V2", "V3", "V4", "V5", "V6"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>País *</label>
            <select
              value={form.pais || ""}
              onChange={(e) => onChange("pais", e.target.value)}
            >
              <option value="">Selecionar...</option>
              <option value="BR">🇧🇷 BR</option>
              <option value="US">🇺🇸 US</option>
              <option value="DE">🇩🇪 DE</option>
              <option value="PT">🇵🇹 PT</option>
              <option value="MX">🇲🇽 MX</option>
              <option value="ES">🇪🇸 ES</option>
              <option value="FR">🇫🇷 FR</option>
              <option value="IT">🇮🇹 IT</option>
              <option value="AR">🇦🇷 AR</option>
              <option value="CO">🇨🇴 CO</option>
              <option value="GLOBAL">🌐 GLOBAL</option>
            </select>
          </div>

          <div className="form-group">
            <label>Plataforma de Checkout</label>
            <select
              value={form.checkout || ""}
              onChange={(e) => onChange("checkout", e.target.value)}
            >
              <option value="">—</option>
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
            <label>Status *</label>
            <select
              value={form.status || ""}
              onChange={(e) => onChange("status", e.target.value)}
            >
              <option value="">Selecionar...</option>
              <option value="Ativo">Ativo</option>
              <option value="Em teste">Em teste</option>
              <option value="Pausado">Pausado</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>

          <div className="form-group full">
            <label>URL do Site</label>
            <input
              type="text"
              value={form.url || ""}
              onChange={(e) => onChange("url", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>Data de Criação</label>
            <input
              type="date"
              value={form.dataCriacao || ""}
              onChange={(e) => onChange("dataCriacao", e.target.value)}
            />
          </div>

          <div className="form-group full">
            <label>Descrição / Notas</label>
            <textarea
              value={form.descricao || ""}
              onChange={(e) => onChange("descricao", e.target.value)}
              placeholder="notas, contexto, motivo do descarte..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            {mode === "create" ? "Salvar" : "Atualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}