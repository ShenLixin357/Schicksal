"use client";

import { Component, Suspense, type ReactNode } from "react";

type FeatureProps = { label: string; children: ReactNode; onExit: () => void };

/** A broken lazy chunk must not crash the authenticated shell. Do not force
 * a full-site reload merely because one private module failed: the fresh
 * page would replay the entry and mandatory briefing gates. Returning to the
 * home section unmounts this boundary without signing the member out.
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
      <button type="button" onClick={this.props.onExit}>返回首页 · 保留登录状态</button>
    </section>;
  }
}

/** Shared loading/error boundary for separately bundled immersive views.
 * Approved art does not render until its code chunk is ready; a network
 * failure shows only a neutral retry interface, never stale artwork.
 */
export function FeatureSuspense({ label, children, onExit }: FeatureProps) {
  return <FeatureLoadBoundary key={label} label={label} onExit={onExit}>
    <Suspense fallback={<section className="feature-loading" role="status" aria-live="polite">
      <p>{label} · 正在打开…</p>
    </section>}>{children}</Suspense>
  </FeatureLoadBoundary>;
}
