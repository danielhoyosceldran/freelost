import "../globals.css";

// Solo para `/`, que redirige al idioma por defecto. Los idiomas tienen su propio layout raíz
// (app/[lang]/layout.tsx) porque `<html lang>` depende de la ruta.
export default function RootRedirectLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
