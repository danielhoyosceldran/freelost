"use client";

import type { FormEvent } from "react";
import { useUI } from "@/core/ui/store";
import type { ContactProps } from "./index";

const inputClass =
  "w-full bg-abyss border border-white/10 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gold-400 font-sans transition-colors rounded-none";
const labelClass = "block font-sans text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 pl-1";

type Props = Pick<ContactProps, "fields" | "submitLabel" | "successMessage">;

export function ContactForm({ fields, submitLabel, successMessage }: Props) {
  const showToast = useUI((s) => s.showToast);

  // Mockup: no hay backend. Igual que handleContactSubmit() de v4, solo toast + reset.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    showToast(successMessage);
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className={labelClass}>{fields.name.label}</label>
          <input id="contact-name" name="name" required type="text" placeholder={fields.name.placeholder} className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>{fields.email.label}</label>
          <input id="contact-email" name="email" required type="email" placeholder={fields.email.placeholder} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>{fields.message.label}</label>
        <textarea id="contact-message" name="message" rows={4} required placeholder={fields.message.placeholder} className={inputClass} />
      </div>

      <div className="text-center pt-4">
        <button type="submit" className="btn-flat-gold w-full md:w-auto px-10 py-3.5 font-display text-xs uppercase tracking-[0.25em] font-semibold">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
