import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { splitLensGlass } from "./lensGlass";
import { findProps, fitModel, type Prop } from "./model";
import { studioEquirect } from "./studio";

/**
 * Visor 3D de un elemento de equipo: carga su modelo, lo encuadra y lo deja girando despacio
 * sobre su eje vertical. Al pasar el puntero, el giro casi se para y el modelo se orienta hacia
 * él. Port 1:1 de createViewer()/renderViewers() de v4.
 *
 * Este módulo arrastra three.js + GLTFLoader (~700 KB): el bloque lo importa dinámicamente cuando
 * le toca (useWarm), nunca en el bundle inicial.
 *
 * Crea su propio <canvas> dentro de `host` y lo elimina en destroy(): un canvas cuyo contexto se
 * ha perdido no se puede reutilizar, y Fast Refresh remonta efectos sobre el mismo DOM.
 */

export interface GearModel {
  src: string;
  /** Corrección de escala a ojo tras normalizar (ver fitModel). */
  scale: number;
  /** Separar el cristal del objetivo (ver splitLensGlass). */
  splitGlass: boolean;
  /** Nombres de los nodos de hélice que giran. */
  props: readonly string[];
}

const ROTATION_SPEED = 0.28; // rad/s del giro automático
const BASE_TILT_X = 0.12; // inclinación de reposo, ligeramente picado
const HOVER_SPIN_FACTOR = 0.18; // el giro casi se detiene mientras el puntero está encima
// Hélices del dron. Más rápido no se lee mejor: con dos palas, pasado ~π rad por fotograma el ojo
// ve el efecto rueda de carro y parecen girar al revés o pararse.
const PROP_SPEED = 30; // rad/s
const MAX_TILT_Y = 0.42; // rad que el modelo se gira hacia el puntero (horizontal)
const MAX_TILT_X = 0.22; // ídem en vertical
const SMOOTHING = 0.08; // 0 = no sigue al puntero, 1 = lo sigue sin inercia
// Los modelos pesan bastante (el dron ronda los 14 MB): solo se descargan cuando su bloque se
// acerca al viewport, y solo se renderiza el visor que está en pantalla.
const LOAD_MARGIN = "200px 0px";

const loader = new GLTFLoader();

export class GearViewer {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly group = new THREE.Group();
  private readonly resizeObs: ResizeObserver;
  private readonly io: IntersectionObserver;
  // El giro se lleva en spinY aparte de la inclinación para que ambos se sumen sin pisarse.
  private readonly state = { spinY: 0, tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0, hover: false };
  private props: Prop[] = [];
  private loaded = false;
  private visible = false;
  private destroyed = false;
  private raf = 0;
  private last = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly model: GearModel,
  ) {
    this.canvas = document.createElement("canvas");
    host.appendChild(this.canvas);

    this.camera.position.set(0, 0.35, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromEquirectangular(studioEquirect()).texture;
    pmrem.dispose();

    // Iluminación (tono dorado acorde a la identidad del sitio)
    this.scene.add(new THREE.HemisphereLight(0xfff6da, 0x0b0e13, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 5, 6);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xeed67f, 1.1);
    rimLight.position.set(-5, -2, -4);
    this.scene.add(rimLight);

    this.group.rotation.x = BASE_TILT_X;
    this.scene.add(this.group);

    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.loaded) this.load();
        if (this.visible) this.play();
      },
      { rootMargin: LOAD_MARGIN },
    );
    this.io.observe(host);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.scene.environment?.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private load() {
    this.loaded = true;
    this.resize();
    const { src, splitGlass, props, scale } = this.model;
    loader.load(
      src,
      (gltf) => {
        if (this.destroyed) return;
        const model = gltf.scene;
        if (splitGlass) splitLensGlass(model);
        if (props.length) this.props = findProps(model, props);
        fitModel(model, this.group, scale || 1);
        this.group.add(model);
      },
      undefined,
      (err) => console.error("No se pudo cargar", src, err),
    );
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private play() {
    if (this.raf || this.destroyed) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.destroyed || !this.visible) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const st = this.state;

    // Suavizado exponencial independiente del framerate: el modelo persigue la inclinación
    // objetivo en vez de saltar a ella. Al soltar, el objetivo es 0 y vuelve solo a su reposo.
    const k = 1 - Math.pow(1 - SMOOTHING, dt * 60);
    st.tiltX += (st.targetTiltX - st.tiltX) * k;
    st.tiltY += (st.targetTiltY - st.tiltY) * k;

    st.spinY += ROTATION_SPEED * (st.hover ? HOVER_SPIN_FACTOR : 1) * dt;
    this.group.rotation.y = st.spinY + st.tiltY;
    this.group.rotation.x = BASE_TILT_X + st.tiltX;
    this.props.forEach((p) => p.node.rotateY(p.dir * PROP_SPEED * dt));

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  // Hover: el usuario «sostiene» el modelo y puede mirar la cara que quiera. La escala no se toca.
  private onPointerMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1; // [-1, 1]
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.state.targetTiltY = nx * MAX_TILT_Y;
    this.state.targetTiltX = -ny * MAX_TILT_X;
    this.state.hover = true;
  };

  private onPointerLeave = () => {
    this.state.hover = false;
    this.state.targetTiltX = 0;
    this.state.targetTiltY = 0;
  };
}
