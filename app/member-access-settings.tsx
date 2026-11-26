"use client";
import { ImperialLoading } from "./emblem/imperial-loading";

import { useEffect, useState, type FormEvent } from "react";

type Member = { id: string; label: string; name: string; configured: boolean };

export function MemberAccessSettings() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [selected, setSelected] = useState("zxy");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = async () => {
    const response = await fetch("/api/member-access", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { members: Member[] };
    setMembers(data.members);
  };
  useEffect(() => { void refresh().catch(() => undefined); }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (password !== confirmation) { setStatus("两次输入的密码不一致。"); return; }
    setSaving(true); setStatus("");
    try {
      const response = await fetch("/api/member-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ citizenId: selected, password }) });
      const data = await response.json() as { error?: string; requiresLogin?: boolean };
      if (!response.ok) throw new Error(data.error || "暂时无法保存。");
      setPassword(""); setConfirmation("");
      if (data.requiresLogin) { window.location.replace("/"); return; }
      await refresh();
      setStatus("已保存。把网址和该成员的密码私下发给对方，即可选择自己的身份登录。");
    } catch (reason) { setStatus(reason instanceof Error ? reason.message : "暂时无法保存。"); }
    finally { setSaving(false); }
  };
  if (!members) return null;
  return <section className="member-access-settings" aria-labelledby="member-access-heading">
    <header><p className="eyebrow">MEMBER ACCESS · 站长设置</p><h2 id="member-access-heading">成员登录设置</h2><p>为成员设置密码后，即可邀请对方使用自己的身份登录。密码长度和字符可自行选择，不能为空。</p></header>
    <ul>{members.map((member) => <li key={member.id}><strong>{member.label}</strong><span>{member.configured ? "已开通" : "待设置密码"}</span></li>)}</ul>
    <form onSubmit={save}>
      <label>成员<select value={selected} onChange={(event) => { setSelected(event.target.value); setPassword(""); setConfirmation(""); setStatus(""); }}>{members.map((member) => <option key={member.id} value={member.id}>{member.label} · {member.id}</option>)}</select></label>
      <label>新密码<input name="new-password" type="password" autoComplete="new-password" value={password} maxLength={1024} required onChange={(event) => setPassword(event.target.value)} /></label>
      <label>再次输入密码<input name="confirm-password" type="password" autoComplete="new-password" value={confirmation} maxLength={1024} required onChange={(event) => setConfirmation(event.target.value)} /></label>
      <p className="member-password-note">保存后，该成员已有的登录会退出；为自己改密码后，请重新登录。</p>
      <button className="primary" type="submit" disabled={saving}>{saving && <ImperialLoading size={24}/>} {saving ? "正在保存…" : "保存成员密码"}</button>
      <p role="status" aria-live="polite">{status}</p>
    </form>
  </section>;
}
