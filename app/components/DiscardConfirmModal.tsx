"use client";

import { useEffect, useRef } from "react";
import type { Funil } from "@/types/funil";
import { StatusBadge, TipoBadge } from "@/app/components/badges";

interface DiscardConfirmModalProps {
  funil: Funil;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DiscardConfirmModal({
  funil,
  busy = false,
  onConfirm,
  onCancel,
}: DiscardConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !busy) onCancel();
  }

  const alreadyDiscarded = funil.status === "Descartado";

  return (
    <div
      ref={overlayRef}
      className="overlay open"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className="modal discard-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-modal-title"
        aria-describedby="discard-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="discard-confirm-head">
          <div className="discard-confirm-icon-wrap" aria-hidden>
            <svg
              className="discard-confirm-icon"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 7H18V5C18 3.9 17.1 3 16 3H8C6.9 3 6 3.9 6 5V7H5C3.9 7 3 7.9 3 9V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V9C21 7.9 20.1 7 19 7ZM8 5H16V7H8V5ZM19 19H5V9H19V19Z"
                fill="currentColor"
              />
              <path d="M10 11H12V17H10V11ZM12 11H14V17H12V11Z" fill="currentColor" />
            </svg>
          </div>
          <div className="discard-confirm-head-text">
            <h2 id="discard-modal-title" className="discard-confirm-title">
              {alreadyDiscarded ? "Confirmar operação" : "Arquivar este step?"}
            </h2>
            <p id="discard-modal-desc" className="discard-confirm-lead">
              {alreadyDiscarded
                ? "Este step já está na área de descartados. Você pode confirmar para sincronizar o status novamente."
                : "O step deixa de aparecer no mapa de ativos e passa para a lista de descartados, com histórico preservado."}
            </p>
          </div>
          <button
            type="button"
            className="close-btn discard-confirm-close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="discard-confirm-summary">
          <div className="discard-confirm-summary-label">Step selecionado</div>
          <div className="discard-confirm-summary-main">
            <span className="discard-confirm-code">{funil.codigo}</span>
            <span className="discard-confirm-name">{funil.nome}</span>
          </div>
          <div className="discard-confirm-meta">
            <TipoBadge tipo={funil.tipo || ""} />
            <StatusBadge status={funil.status || ""} />
            {funil.pais ? (
              <span className="discard-confirm-pill">{funil.pais}</span>
            ) : null}
          </div>
        </div>

        {!alreadyDiscarded && (
          <div className="discard-confirm-callout" role="note">
            <span className="discard-confirm-callout-icon" aria-hidden>
              ℹ️
            </span>
            <div>
              <strong>Não é exclusão permanente.</strong> Você pode reativar ou editar depois na aba
              Descartados.
            </div>
          </div>
        )}

        <div className="modal-footer discard-confirm-footer">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processando…" : alreadyDiscarded ? "Confirmar" : "Mover para descartados"}
          </button>
        </div>
      </div>
    </div>
  );
}
