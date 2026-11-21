"use client";

import { useEffect, useState, type FormEvent } from "react";
import "./account-switcher.css";

type AccountMode = "citizen" | "technology";
type ApiReply = { error?: string; configured?: boolean; accountMode?: AccountMode; requiresPassword?: boolean };
async function post(path: string, method: "POST" | "PUT", body: object): Promise<{ok:boolean; data:ApiReply}> {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache:"no-store" });
  return { ok:response.ok, data: await response.json() as ApiReply };
}

/** This switcher never handles primary session cookies. Only the server can
 * activate minister identity, and its separate password is never persisted in JS storage.
 */
export function AccountModeSwitcher({ mode, onChanged, onClose }: {
  mode: AccountMode;
  onChanged: (mode:AccountMode)=>void;
  onClose:()=>void;
}) {
  const [configured, setConfigured] = useState<boolean|null>(null);
  const [password, setPassword] = useState("");
  const [personalPassword, setPersonalPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/technology/credentials", { cache:"no-store" }).then(async response => {
      if(!response.ok) throw new Error("无法查询部长账号状态。");
      const data = await response.json() as ApiReply;
      if(active) setConfigured(Boolean(data.configured));
    }).catch(reason => { if(active) setMessage(reason instanceof Error ? reason.message : "无法读取部长账号。"); });
    return () => { active = false; };
  }, []);
  const change = async (target: AccountMode, secret?:string) => {
    if(busy) return;
    setBusy(true); setMessage("");
    try {
      const reply = await post("/api/member-session/switch", "POST", { target, ...(secret !== undefined ? {password:secret}: {}) });
      if(!reply.ok) {
        if (reply.data.requiresPassword) setRequiresPassword(true);
        throw Error(reply.data.error || "切换未完成。");
      }
      setPassword("");
      onChanged(target);
    } catch(error) { setMessage(error instanceof Error ? error.message : "切换失败。"); }
    finally { setBusy(false); }
  };
  const setup = async (event:FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const reply = await post("/api/technology/credentials", "PUT", { personalPassword, ministryPassword:newPassword });
      if (!reply.ok) throw Error(reply.data.error || "部长密码设置失败。");
      setConfigured(true);
      setPersonalPassword(""); setNewPassword(""); setRequiresPassword(true);
      setMessage("科技部独立密码已设置。现在可以使用它进入部长身份。");
    } catch(error) {setMessage(error instanceof Error ? error.message : "操作失败。");}
    finally {setBusy(false);}
  };
  return <div className="minister-switcher-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="minister-switcher" role="dialog" aria-modal="true" aria-label="切换个人与科技部长身份">
      <header><div><small>ACCOUNT SWITCH · 身份切换</small><h2>个人 / 科技部长</h2></div><button type="button" aria-label="关闭身份切换" onClick={onClose}>×</button></header>
      <p>当前身份：<strong>{mode==="technology"?"科技部部长 · 管理模式":"个人公民 · 日常模式"}</strong></p>
      {configured === null ? <p role="status">{message || "正在验证身份设置…"}</p> :
        !configured ? <form onSubmit={setup} className="minister-switcher-form">
          <p>首次启用部长身份，请验证个人密码并设定一套独立部长密码。不会新增公民。</p>
          <label>个人账号密码<input type="password" autoComplete="current-password" value={personalPassword} onChange={e=>setPersonalPassword(e.target.value)} required /></label>
          <label>新的科技部部长密码（至少 12 位）<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required /></label>
          <button type="submit" disabled={busy}>{busy?"正在开通…":"开通独立部长身份"}</button>
        </form> : mode==="technology" ?
          <button className="minister-switcher-primary" type="button" disabled={busy} onClick={()=>void change("citizen")}>切回个人身份</button> :
          <div className="minister-switcher-form">
            <button type="button" disabled={busy} onClick={()=>void change("technology")}>快速切换至科技部长</button>
            {requiresPassword && <form onSubmit={event=>{event.preventDefault();void change("technology",password);}}>
              <label>科技部独立密码<input autoFocus type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
              <button className="minister-switcher-primary" type="submit" disabled={busy}>验证并切换</button>
            </form>}
            <small>已验证授权有效期内直接切换；过期后需再次输入部长密码。</small>
          </div>}
      <p className="minister-switcher-feedback" role="status">{message}</p>
    </section>
  </div>;
}
