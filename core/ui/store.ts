import { create } from "zustand";

/**
 * Estado de la chrome global (modales, toast). Sustituye a openModal()/closeModal() y al toast
 * manipulado por clases de v4: cualquier bloque lo dispara sin conocer el DOM del otro.
 */
interface UIState {
  modal: string | null;
  toast: { message: string; seq: number } | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  showToast: (message: string) => void;
}

export const useUI = create<UIState>((set) => ({
  modal: null,
  toast: null,
  openModal: (id) => set({ modal: id }),
  closeModal: () => set({ modal: null }),
  // seq distingue dos toasts seguidos con el mismo texto, para reiniciar el temporizador.
  showToast: (message) => set((s) => ({ toast: { message, seq: (s.toast?.seq ?? 0) + 1 } })),
}));
