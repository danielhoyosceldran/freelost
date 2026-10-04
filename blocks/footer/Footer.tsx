import type { FooterProps } from "./index";

export function Footer({ brand, legal, links }: FooterProps) {
  return (
    <footer className="border-t border-white/[0.04] py-8 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-sans text-gray-500 pb-32">
      <div className="flex items-center gap-3">
        <span className="font-display tracking-widest text-gold-300">{brand}</span>
        <span>{legal}</span>
      </div>
      <div className="flex items-center gap-6">
        {links.map((link) => (
          <a key={link.label} href={link.href} className="hover:text-gold-200 transition-colors">
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
