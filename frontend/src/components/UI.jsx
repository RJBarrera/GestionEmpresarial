import { useEffect } from "react";
import {
  X,
  Inbox,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function Modal({ open, title, onClose, children, width = "610px" }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ text = "Todavía no hay registros", small = false }) {
  return (
    <div className={`empty ${small ? "empty-sm" : ""}`}>
      <div className="empty-icon">
        <Inbox size={25} />
      </div>
      <strong>Sin información</strong>
      <span>{text}</span>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle size={22} className="spin" /> Cargando información...
    </div>
  );
}

export function Notice({ type = "error", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice notice-${type}`}>
      {type === "success" ? (
        <CheckCircle2 size={17} />
      ) : (
        <AlertCircle size={17} />
      )}
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Cerrar aviso">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Field({ label, required = false, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">
        {label} {required && <em>*</em>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Status({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
}) {
  return (
    <span className={`status ${active ? "status-positive" : "status-muted"}`}>
      <span className="status-dot" />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
