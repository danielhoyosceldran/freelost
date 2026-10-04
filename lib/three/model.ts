import * as THREE from "three";

/*
 * Cada GLB viene con su propio origen y su propia escala: se recentra sobre su caja envolvente y
 * se normaliza por su dimensión mayor.
 *
 * Normalizar así iguala el ANCHO de los modelos, no su presencia en pantalla: el dron es casi
 * plano (normalizado mide 2,60 de ancho pero solo 0,58 de alto, porque su dimensión mayor es la
 * envergadura de las hélices), mientras que el objetivo llena su caja (2,60 × 2,08) y el portátil
 * abierto casi (2,60 × 1,77). `scale` corrige ese desajuste por modelo, a ojo, para que todos
 * pesen visualmente lo mismo.
 */
const BASE_SIZE = 2.6;

export function fitModel(model: THREE.Object3D, group: THREE.Object3D, scaleFactor: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);
  group.scale.setScalar((BASE_SIZE * scaleFactor) / maxDim);
}

export interface Prop {
  node: THREE.Object3D;
  dir: number;
}

/*
 * El GLB del dron no trae animaciones, pero cada hélice (motor + palas) es un nodo propio cuyo
 * origen cae en el eje del motor y cuyo Y local es ese eje: basta girarlo sobre sí mismo. Los
 * nombres salen del árbol del GLB (Sketchfab) y van en la config del bloque.
 *
 * Sentido: como un cuadricóptero real, las diagonales giran igual y las contiguas al revés. Los
 * nodos no comparten orientación (los brazos traseros tienen el Y local hacia otro lado del
 * padre), así que se decide en espacio del modelo: se ordenan por ángulo alrededor del eje de la
 * primera y se alterna el signo, corrigiendo por si el eje de alguna apunta al contrario.
 */
export function findProps(model: THREE.Object3D, names: readonly string[]): Prop[] {
  model.updateMatrixWorld(true);
  const props = names.map((n) => model.getObjectByName(n)).filter((p): p is THREE.Object3D => !!p);
  if (!props.length) return [];
  const q = new THREE.Quaternion();
  const axes = props.map((p) => new THREE.Vector3(0, 1, 0).applyQuaternion(p.getWorldQuaternion(q)));
  const ref = axes[0];
  const pos = props.map((p) => p.getWorldPosition(new THREE.Vector3()));
  const centre = pos.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(pos.length);
  const u = new THREE.Vector3().subVectors(pos[0], centre).projectOnPlane(ref).normalize();
  const v = new THREE.Vector3().crossVectors(ref, u);
  const order = props
    .map((_, i) => {
      const d = new THREE.Vector3().subVectors(pos[i], centre);
      return { i, a: Math.atan2(d.dot(v), d.dot(u)) };
    })
    .sort((a, b) => a.a - b.a);
  return order.map(({ i }, k) => ({
    node: props[i],
    dir: (k % 2 ? -1 : 1) * Math.sign(axes[i].dot(ref) || 1),
  }));
}
