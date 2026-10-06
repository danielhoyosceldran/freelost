// Solo para `/`, que redirige al idioma por defecto (ver page.tsx). Los idiomas tienen su propio
// layout raíz (app/[lang]/layout.tsx) porque `<html lang>` depende de la ruta. Sin globals.css:
// nadie llega a ver esta página; el fondo tinta evita el destello blanco.
export default function RootRedirectLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body style={{ background: "#060a0c" }}>{children}</body>
    </html>
  );
}
