"use client";

import { Suspense, type ReactNode } from "react";

/** Shared loading boundary for separately bundled immersive views.
 * The approved page artwork is only mounted after its JavaScript is ready.
 * This neutral placeholder is transient; no global filters or recolouring.
 */
export function FeatureSuspense({ label, children }: { label: string; children: ReactNode }) {
  return <Suspense fallback={<section className="feature-loading" role="status" aria-live="polite">
    <p>{label} · 正在打开…</p>
  </section>}>{children}</Suspense>;
}
