"use client";

import { useState, type FormEvent } from "react";
import "./account-switcher.css";

type AccountMode = "citizen" | "technology";
type SwitchReply = { error?: string; accountMode?: AccountMode; requiresPassword?: boolean };

/** A single citizen password, two independently authorized session modes.
 * Long-press only opens this dialog; role checks and password verification
 * always happen in the Worker. No password is cached in browser storage.
 */
export function AccountModeSwitcher({ mode, onChanged, onClose }: {
  mode: AccountMode;
  onChanged: (mode: AccountMode) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const change = async (target: AccountMode, secret?: string) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/member-session/switch", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, ...(secret !== undefined ? { password: secret } : {}) }),
      });
      const result = await response.json() as SwitchReply;
      if (!response.ok) {
        if (result.requiresPassword) setRequiresPassword(true);
        throw new Error(result.error || "切换身份未完成。");
      }
      setPassword("");
      setRequiresPassword(false);
      onChanged(target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "切换暂时失败。");
    } finally { setBusy(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void change("technology", password);
  };

  return <div className="minister-switcher-overlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="minister-switcher" role="dialog" aria-modal="true" aria-label="个人与科技部长身份切换">
      <header><div><small>ACCOUNT SWITCH · 身份切换</small><h2>个人 / 科技部长</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭身份切换">×</button>
      </header>
      <p>当前身份：<strong>{mode === "technology" ? "科技部部长 · 管理模式" : "个人公民 · 日常模式"}</strong></p>
      <p>部长身份使用现任科技部长的个人账号密码，无需另外设置密码；换届后权限自动转移。</p>
      {mode === "technology"
        ? <button type="button" className="minister-switcher-primary" disabled={busy} onClick={() => void change("citizen")}>
            切回个人身份
          </button>
        : <div className="minister-switcher-form">
            <button type="button" disabled={busy} onClick={() => void change("technology")}>
              快速切换至科技部长
            </button>
            {requiresPassword && <form onSubmit={submit}>
              <label>个人账号密码（重新验证）
                <input autoFocus type="password" autoComplete="current-password"
                  value={password} onChange={event => setPassword(event.target.value)} required />
              </label>
              <button className="minister-switcher-primary" type="submit" disabled={busy}>验证并切换</button>
            </form>}
            <small>当前授权有效时免重复输入；过期或换届后由服务器重新验证。</small>
          </div>}
      <p className="minister-switcher-feedback" role="status">{message}</p>
    </section>
  </div>;
}
