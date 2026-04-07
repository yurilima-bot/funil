"use client";

import { useEffect, useRef } from "react";
import type { Funil } from "@/types/funil";

interface PermanentDeleteConfirmModalProps {
  records: Funil[];
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PermanentDeleteConfirmModal({
  records,
  busy = false,
  onConfirm,
  onCancel,
}: PermanentDeleteConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const n = records.length;

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

  const preview = records.slice(0, 12);
  const rest = Math.max(0, n - preview.length);

  return (
    <div
      ref={overlayRef}
      className="overlay open"
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className="modal discard-confirm-modal permanent-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perm-del-title"
        aria-describedby="perm-del-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="discard-confirm-head permanent-delete-head">
          <div className="discard-confirm-icon-wrap permanent-delete-icon-wrap" aria-hidden>
            <svg
              className="discard-confirm-icon"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="discard-confirm-head-text">
            <h2 id="perm-del-title" className="discard-confirm-title">
              Excluir {n === 1 ? "este step" : `${n} steps`} permanentemente?
            </h2>
            <p id="perm-del-desc" className="discard-confirm-lead">
              Esta ação não pode ser desfeita. Os registros serão removidos do banco e some da lista de
              descartados.
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

        <div className="perm-del-preview">
          <div className="perm-del-preview-label">Códigos</div>
          <ul className="perm-del-list">
            {preview.map((r) => (
              <li key={r.id}>
                <span className="perm-del-code">{r.codigo}</span>
                <span className="perm-del-name">{r.nome}</span>
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <p className="perm-del-more">e mais {rest}…</p>
          )}
        </div>

        <div className="discard-confirm-callout perm-del-warn" role="alert">
          <span className="discard-confirm-callout-icon" aria-hidden>
            ⚠️
          </span>
          <div>
            <strong>Atenção.</strong> Use esta opção apenas para limpar lixo ou duplicatas. Para voltar um step ao
            funil, use <strong>Restaurar</strong> em vez de excluir.
          </div>
        </div>

        <div className="modal-footer discard-confirm-footer">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy || n === 0}>
            {busy ? "Excluindo…" : `Excluir ${n === 1 ? "definitivamente" : `${n} registros`}`}
          </button>
        </div>
      </div>
    </div>
  );
}
