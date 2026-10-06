// Mensajes entre GearMorph y sdfWorker. Aparte para que el hilo principal no importe el worker.

export interface SdfRequest {
  /** Triángulos de cada objeto (9 floats por triángulo), en el espacio del motor. */
  models: Float32Array<ArrayBuffer>[];
  min: [number, number, number];
  /** Lado del vóxel. El centro del vóxel i está en min + (i + 0,5)·h. */
  h: number;
  dims: [number, number, number];
}

export interface SdfResponse {
  data: Uint16Array<ArrayBuffer>;
}
