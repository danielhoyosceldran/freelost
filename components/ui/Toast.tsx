"use client";

import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { useUI } from "@/core/ui/store";

const VISIBLE_MS = 4000;

export function Toast() {
  const toast = useUI((s) => s.toast);
  // Se guarda qué seq ya caducó en vez de un booleano "visible": así un toast nuevo se enseña
  // en el mismo render en que llega, sin setState síncrono dentro del efecto.
  const [expiredSeq, setExpiredSeq] = useState(0);
  const visible = toast !== null && toast.seq !== expiredSeq;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setExpiredSeq(toast.seq), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 right-8 z-[100] glass-card px-6 py-3 font-sans text-xs text-gold-200 border-gold-400/40 flex items-center gap-3 transform transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      <CircleCheck className="w-4 h-4 text-gold-300" />
      <span>{toast?.message ?? ""}</span>
    </div>
  );
}
