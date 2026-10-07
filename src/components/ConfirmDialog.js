"use client";

import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "ยกเลิก", extra, onConfirm, onCancel, danger }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" style={{ background: "var(--overlay)" }} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="anim-pop w-full max-w-md rounded-xl border border-line bg-bg p-6">
        <h2 id="dlg-title" className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} className="btn" onClick={onCancel}>{cancelLabel}</button>
          {extra}
          <button className={`btn btn-primary ${danger ? "" : ""}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
