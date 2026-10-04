import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "./ContactForm";
import type { ContactProps } from "./index";

export function Contact({ anchor, eyebrow, title, titleAccent, lead, fields, submitLabel, successMessage }: ContactProps) {
  return (
    <section id={anchor} className="py-24 px-6 max-w-5xl mx-auto relative text-center pb-48">
      <Reveal className="glass-card p-8 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/5 rounded-full blur-[130px] pointer-events-none" />

        <span className="font-sans text-xs uppercase tracking-[0.4em] text-gold-300 font-semibold block mb-3">{eyebrow}</span>
        <h2 className="font-display text-4xl md:text-6xl text-white font-normal mb-6">
          {title} <span className="font-serif italic text-gold-200 font-light">{titleAccent}</span>
        </h2>
        <p className="font-serif italic text-gray-300 text-base md:text-xl max-w-xl mx-auto mb-10 font-light">{lead}</p>

        <ContactForm fields={fields} submitLabel={submitLabel} successMessage={successMessage} />
      </Reveal>
    </section>
  );
}
