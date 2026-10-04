"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { scrollController } from "@/core/scroll/controller";
import { useUI } from "@/core/ui/store";

/**
 * Modal a pantalla completa; se abre con useUI.getState().openModal(id). Siempre montado y
 * oculto por opacidad, como en v4, para que exista la transición de entrada.
 */
export function Modal({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const open = useUI((s) => s.modal === id);
  const closeModal = useUI((s) => s.closeModal);

  useEffect(() => {
    if (!open) return;
    const owner = `modal:${id}`;
    scrollController.lockOverflow(owner);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      scrollController.unlockOverflow(owner);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, id, closeModal]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={title}
      className={`fixed inset-0 z-[100] bg-void/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="glass-card w-full max-w-5xl overflow-hidden relative p-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-400" />
            <span className="font-sans text-xs uppercase tracking-widest text-gold-200">{title}</span>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Cerrar"
            className="action-pill w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
