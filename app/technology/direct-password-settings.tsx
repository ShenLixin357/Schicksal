"use client";
import { ImperialLoading } from "../emblem/imperial-loading";

import { useEffect, useState, type FormEvent } from "react";
import "./direct-password-settings.css";

/** Only an authenticated incumbent in minister mode can see or modify this
 * separate login credential. The actual password is never returned, persisted
 * in client storage, logged, or committed to source control.
 */
export function TechnologyDirectPasswordSettings() {
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [personal,setPersonal]=useState("");
  const [special,setSpecial]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    let live=true;
    void fetch("/api/technology/direct-password",{cache:"no-store"})
      .then(async response=>{
        const result=await response.json() as {configured?:boolean;error?:string};
        if(!response.ok) throw Error(result.error||"无法读取部长密码设置。");
        if(live) setConfigured(Boolean(result.configured));
      }).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:"无法读取部长密码设置。");});
    return ()=>{live=false;};
  },[]);

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    if(busy) return;
    setError("");setMessage("");
    if(special!==confirm){setError("两次输入的部长专用密码不一致。");return;}
    setBusy(true);
    try {
      const response=await fetch("/api/technology/direct-password",{
        method:"PUT",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({personalPassword:personal,newPassword:special}),
      });
      const result=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok||!result.ok) throw Error(result.error||"未能完成设置。");
      setPersonal("");setSpecial("");setConfirm("");
      setConfigured(true);
      setMessage("部长登录专用密码已更新；登录页可使用新密码，旧的部长专用会话已撤销。");
    } catch(reason) {setError(reason instanceof Error?reason.message:"保存失败。");}
    finally {setBusy(false);}
  };

  return <section className="technology-password-settings" aria-label="部长专用登录密码管理">
    <h3>部长登录密码</h3>
    <p>此密码仅用于登录页的「科技部部长」专用身份卡，不会取代或修改个人账号密码。
      站内长按自己的标志切换管理模式不需要输入密码。</p>
    <p className="technology-password-status" role="status">{configured===null&&!error&&<ImperialLoading size={24}/>} {configured===null
      ? "正在核验设置状态…" : configured ? "已设置独立部长登录密码" : "尚未设置独立部长登录密码"}</p>
    <form onSubmit={submit}>
      <label>确认本人个人账号密码
        <input type="password" autoComplete="current-password" required
          value={personal} onChange={event=>setPersonal(event.target.value)} />
      </label>
      <label>新的部长登录专用密码（至少 12 位）
        <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required
          value={special} onChange={event=>setSpecial(event.target.value)} />
      </label>
      <label>再次输入部长专用密码
        <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required
          value={confirm} onChange={event=>setConfirm(event.target.value)} />
      </label>
      <button type="submit" disabled={busy}>{busy && <ImperialLoading size={24}/>} {busy?"正在保存…":configured?"更改部长专用密码":"启用部长专用登录"}</button>
    </form>
    {message&&<p className="technology-password-success" role="status">{message}</p>}
    {error&&<p className="technology-password-error" role="alert">{error}</p>}
  </section>;
}
