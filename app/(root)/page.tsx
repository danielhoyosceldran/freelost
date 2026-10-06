import { defaultLocale } from "@/content/locales";

// Sin middleware (export estático). No usa redirect(): en un export eso emite un documento de
// error que solo redirige al hidratar, tras bajar el runtime de React. El meta refresh salta en
// cuanto se parsea el HTML. En Vercel ni siquiera llega aquí: lo redirige el borde (vercel.json).
export default function Root() {
  const href = `/${defaultLocale}`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <link rel="canonical" href={href} />
      <a href={href} style={{ color: "#eef1f0" }}>
        free lost
      </a>
    </>
  );
}
