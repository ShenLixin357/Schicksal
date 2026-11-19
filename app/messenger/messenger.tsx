"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import "./messenger.css";

type Member = { id: string; username: string; name: string; locked?: boolean };
type Message = { id: string; senderId: string; recipientId: string; body: string; createdAt: string };
type LoadState = "loading" | "ready" | "error";

export function Messenger({ selfId, members, peerId, onSelect, renderMark }: {
  selfId: string;
  members: readonly Member[];
  peerId: string | null;
  onSelect: (peerId: string | null) => void;
  renderMark: (memberId: string) => ReactNode;
}) {
  const contacts = members.filter(member => !member.locked);
  const peer = contacts.find(member => member.id === peerId);
  const [recent, setRecent] = useState<Record<string, Message>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const route = peerId ? "/api/messenger?peer=" + encodeURIComponent(peerId) : "/api/messenger?list=1";
        const response = await fetch(route, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("通讯暂时无法同步。");
        const data = await response.json() as { messages?: Message[]; recent?: Record<string, Message> };
        if (controller.signal.aborted) return;
        if (peerId) {
          if (!Array.isArray(data.messages)) throw new Error("通讯记录不完整。");
          setMessages(data.messages);
        } else {
          if (!data.recent || typeof data.recent !== "object") throw new Error("通讯列表不完整。");
          setRecent(data.recent);
        }
        setStatus("ready");
        setError("");
      } catch {
        if (!controller.signal.aborted) { setStatus("error"); setError("通讯暂时无法同步，请重试。"); }
      }
    };
    setStatus("loading");
    setError("");
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [peerId, refresh]);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!peer || !body || body.length > 500 || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messenger", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peer: peer.id, body }),
      });
      const result = await response.json() as { error?: string; message?: Message };
      if (!response.ok || !result.message) throw new Error(result.error ?? "发送失败");
      setDraft("");
      setMessages(current => [...current.filter(item => item.id !== result.message!.id), result.message!]);
      setRefresh(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送失败，请重试。");
    } finally { setSending(false); }
  };

  return <section className="imperial-messenger" aria-label="帝国通讯">
    <header className="imperial-messenger-heading">
      <div><small>IMPERIAL CORRESPONDENCE · 天命第一帝国</small><h1>帝国通讯</h1>
        <p>私人书信与成员私聊，不属于委员会 Lounge 公共聊天。</p></div>
      <button type="button" onClick={() => onSelect(null)} aria-label="打开通讯总页面">全部通讯</button>
    </header>
    {!peer ? <div className="imperial-messenger-directory">
      <h2>通讯录 <span>CONTACTS</span></h2>
      {contacts.map(member => {
        const latest = recent[member.id];
        return <button key={member.id} type="button" onClick={() => { setDraft(""); onSelect(member.id); }}>
          {renderMark(member.id)}
          <span className="imperial-messenger-contact-copy">
            <strong>{member.username}{member.id === selfId ? " · 我的私人笔记" : ""}</strong>
            <small>{latest ? latest.body : member.id === selfId ? "给自己写一封信" : "开始一段私人对话"}</small>
          </span>
          <span className="imperial-messenger-forward">→</span>
        </button>;
      })}
      {status === "error" && <p role="alert">{error} <button type="button" onClick={() => setRefresh(value=>value+1)}>重试</button></p>}
    </div> : <div className="imperial-messenger-thread">
      <header><button type="button" onClick={() => onSelect(null)} aria-label="返回通讯录">← 全部通讯</button>
        <div className="imperial-messenger-peer">{renderMark(peer.id)}<span><strong>{peer.username}</strong><small>{peer.id === selfId ? "PRIVATE NOTES · 私人笔记" : "DIRECT MESSAGE · 私人通讯"}</small></span></div>
      </header>
      <div className="imperial-messenger-messages" role="log" aria-label={`与${peer.username}的消息`}>
        {status === "loading" && !messages.length ? <p className="imperial-messenger-muted">正在打开书信…</p>
          : !messages.length ? <p className="imperial-messenger-muted">还没有信件，可以从这里开始。</p> : null}
        {messages.map(message => <article key={message.id} className={message.senderId === selfId ? "from-self" : "from-peer"}>
          <small>{message.senderId === selfId ? "我" : peer.username} · {new Date(message.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Singapore" })}</small>
          <p>{message.body}</p>
        </article>)}
      </div>
      {error && <p className="imperial-messenger-error" role="alert">{error} <button type="button" onClick={() => setRefresh(value=>value+1)}>重试</button></p>}
      <form className="imperial-messenger-compose" onSubmit={send}>
        <label htmlFor="imperial-message-body">书写消息</label>
        <textarea id="imperial-message-body" value={draft} maxLength={500} onChange={event => setDraft(event.target.value)}
          placeholder={peer.id === selfId ? "给未来的自己留一句话…" : "写一封私人消息…"} rows={3}/>
        <footer><span>{draft.length}/500</span><button type="submit" disabled={!draft.trim() || sending}>{sending ? "正在寄送…" : "发送书信 →"}</button></footer>
      </form>
    </div>}
  </section>;
}
