"use client";

import { Component, Suspense, type ReactNode } from "react";

type FeatureProps = { label: string; children: ReactNode };

/** Broken asset chunks or unavailable room code must not crash the shell.
 * A rejected React.lazy import is cached, so only a full reload reliably
 * reattempts it; that reload must repeat the mandatory login briefing gate.
 */
class FeatureLoadBoundary extends Component<FeatureProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error("[Schicksal feature load]", this.props.label, error.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="feature-load-error" role="alert">
      <p>{this.props.label}暂时无法打开。</p>
      <button type="button" onClick={() => window.location.reload()}>刷新并重试</button>
    </section>;
  }
}

/** Shared loading/error boundary for separately bundled immersive views.
 * Approved art does not render until its code chunk is ready; a network
 * failure shows only a neutral retry interface, never stale artwork.
 */
export function FeatureSuspense({ label, children }: FeatureProps) {
  return <FeatureLoadBoundary key={label} label={label}>
    <Suspense fallback={<section className="feature-loading" role="status" aria-live="polite">
      <p>{label} · 正在打开…</p>
    </section>}>{children}</Suspense>
  </FeatureLoadBoundary>;
}
