import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático: el sitio es 100% cliente (WebGL, scroll), no hace falta servidor.
  output: "export",
  // next/image no puede optimizar sin servidor en un export estático.
  images: { unoptimized: true },
  reactStrictMode: true,
  // Sin el botón "N" de Next en dev: tapa la esquina inferior izquierda y estorba al comparar
  // con v4. Los errores de compilación y runtime se siguen mostrando.
  devIndicators: false,
};

export default nextConfig;
