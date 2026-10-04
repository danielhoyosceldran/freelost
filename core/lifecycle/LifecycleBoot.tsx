"use client";

import { useEffect } from "react";
import { scrollController } from "@/core/scroll/controller";
import { useLifecycle } from "./store";

/** Arranca el controlador de scroll una vez. Va en el layout. */
export function LifecycleBoot() {
  useEffect(() => {
    scrollController.init();
  }, []);
  return null;
}

/**
 * Lo pone PageRenderer solo si la página no tiene bloque `ownsReady`: entonces la página está
 * lista al hidratar. Decidido en el build y no por orden de efectos entre layout y página, que
 * Next puede hidratar en commits distintos.
 */
export function PageReady() {
  useEffect(() => {
    useLifecycle.getState().markReady();
  }, []);
  return null;
}
