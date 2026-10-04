import * as THREE from "three";

// Entorno de estudio procedural compartido: sin él, un material pulido solo devuelve los dos
// brillos puntuales de las luces direccionales y el cristal no se lee como cristal. Se pinta una
// vez y se reutiliza en todos los visores (cada uno lo pasa por su propio PMREMGenerator).
let envSource: THREE.CanvasTexture | null = null;

export function studioEquirect() {
  if (envSource) return envSource;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#7c8494");
  sky.addColorStop(0.42, "#181d25");
  sky.addColorStop(0.58, "#0a0d12");
  sky.addColorStop(1, "#04060a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);

  const warm = ctx.createRadialGradient(120, 52, 4, 120, 52, 115);
  warm.addColorStop(0, "rgba(250,242,211,0.95)");
  warm.addColorStop(1, "rgba(238,214,127,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, 512, 256);

  const cool = ctx.createRadialGradient(372, 84, 4, 372, 84, 120);
  cool.addColorStop(0, "rgba(186,210,255,0.55)");
  cool.addColorStop(1, "rgba(186,210,255,0)");
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, 512, 256);

  envSource = new THREE.CanvasTexture(c);
  envSource.mapping = THREE.EquirectangularReflectionMapping;
  envSource.colorSpace = THREE.SRGBColorSpace;
  return envSource;
}
