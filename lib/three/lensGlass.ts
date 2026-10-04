import * as THREE from "three";

/*
 * El objetivo llega como UNA sola malla con UN solo material alphaMode BLEND: el canal alfa de
 * su baseColor vale 0 justo en los dos elementos ópticos (el 2,5% del UV) y 1 en el resto del
 * cuerpo. Eso da dos problemas a la vez:
 *   1) GLTFLoader fuerza depthWrite=false en todo material BLEND, así que la malla entera se
 *      mezcla sin escribir profundidad y se ve su geometría interna.
 *   2) Donde va el cristal el alfa es 0, o sea un agujero: no hay cristal que ver.
 * Se separa en dos pasadas: cuerpo 100% opaco + una capa de cristal encima recortada por una
 * máscara derivada de ese mismo alfa.
 */

function buildGlassMask(baseColorTexture: THREE.Texture | null) {
  const img = baseColorTexture?.image as CanvasImageSource & { width?: number } | undefined;
  if (!img || !img.width) return null;

  const SIZE = 512;
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  const px = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const glass = 255 - d[i + 3];
    d[i] = d[i + 1] = d[i + 2] = glass;
    d[i + 3] = 255;
  }
  ctx.putImageData(px, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false; // las UV de glTF ya vienen sin invertir
  // Sin mipmaps: al reducirse promedian el borde de las islas y, con alphaTest, el cristal
  // encogería cuando el modelo se ve pequeño.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function splitLensGlass(model: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); // recoger antes de mutar el árbol
  });

  meshes.forEach((mesh) => {
    const src = mesh.material as THREE.MeshStandardMaterial;

    // El cuerpo se dibuja opaco y entero, sin recortar los elementos ópticos: bajo ellos el
    // baseColor es un gris plano (187,187,187), o sea la superficie que el cristal debe
    // refractar. Si se recorta con alphaTest queda un agujero real y se ve la escena de detrás.
    mesh.material = new THREE.MeshStandardMaterial({
      map: src.map || null,
      normalMap: src.normalMap || null,
      metalnessMap: src.metalnessMap || null,
      roughnessMap: src.roughnessMap || null,
      metalness: src.metalnessMap ? 1 : 0.85,
      roughness: src.roughnessMap ? 1 : 0.45,
      envMapIntensity: 0.9,
      transparent: false,
      depthWrite: true,
    });

    const mask = buildGlassMask(src.map);
    if (!mask) return;

    // Cristal real por transmisión: refracta el cuerpo que tiene detrás en vez de mezclarse con
    // él, así que se ve transparente y con profundidad sin dejar ver la escena. Se recorta con
    // alphaTest (no con mezcla) para que no haya problemas de orden, y polygonOffset lo separa
    // del cuerpo para evitar z-fighting. attenuationColor casi negro + attenuationDistance corta
    // fuerzan absorción total (Beer-Lambert) del fondo transmitido, así se ve negro en vez del
    // gris del cuerpo; los highlights especulares (clearcoat + entorno) no pasan por transmisión
    // y siguen brillando encima.
    const glass = new THREE.Mesh(
      mesh.geometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 2.4,
        transmission: 1,
        ior: 1.5,
        thickness: 0.4,
        attenuationColor: new THREE.Color(0x030303),
        attenuationDistance: 0.15,
        alphaMap: mask,
        alphaTest: 0.5,
        transparent: false,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    glass.renderOrder = 1;
    mesh.add(glass);
  });
}
