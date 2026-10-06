import { redirect } from "next/navigation";
import { defaultLocale } from "@/content/locales";

// Sin middleware (export estático): el build emite una página con redirección al idioma por defecto.
export default function Root() {
  redirect(`/${defaultLocale}`);
}
