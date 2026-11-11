"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Fish = { id: string; hunger: number; age: number };
type Save = { version: 1; coins: number; fish: Fish[] };
const initial = (): Save => ({ version: 1, coins: 10, fish: [{ id: "starter", hunger: 75, age: 0 }] });
const keyFor = (member: string) => `schicksal:aquarium:${member}:backup:v1`;
function parseBackup(member: string): Save | null {
  try { const value = JSON.parse(localStorage.getItem(keyFor(member)) || "null"); return value?.version === 1 && Array.isArray(value.fish) && Number.isSafeInteger(value.coins) ? value as Save : null; } catch { return null; }
}
export function AquariumGame() {
  const [member, setMember] = useState("");
  const [save, setSave] = useState<Save>(initial);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("正在确认登录身份…");
  const [ready, setReady] = useState(false);
  const revisionRef = useRef(0);
  const pendingRef = useRef(false);
  const busyRef = useRef(false);
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);

  const upload = useCallback(async (id: string, state: Save) => {
    if (busyRef.current) { pendingRef.current = true; return; }
    busyRef.current = true;
    try {
      const response = await fetch("/api/aquarium-save", {
        method: "PUT", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-schicksal-member": id },
        body: JSON.stringify({ revision: revisionRef.current, state }),
      });
      const data = await response.json();
      if (response.status === 409) {
        setStatus("云端有更新，已停止自动覆盖。请刷新页面读取另一设备存档。");
        setReady(false);
        return;
      }
      if (!response.ok) throw new Error(data.error || "无法保存");
      revisionRef.current = data.revision;
      setRevision(data.revision);
      setStatus("已同步至云端 · " + new Date().toLocaleTimeString());
    } catch {
      setStatus("云端暂不可用，进度已留在本机；请勿清理浏览器数据。");
    } finally {
      busyRef.current = false;
      if (pendingRef.current && ready) {
        pendingRef.current = false;
        void upload(id, saveRef.current);
      }
    }
  }, [ready]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const identity = await fetch("/api/member-session", { credentials: "same-origin", cache: "no-store" });
        const data = await identity.json();
        const id = typeof data.citizenId === "string" ? data.citizenId : typeof data.member === "string" ? data.member : "";
        if (!id) throw new Error("未登录");
        const response = await fetch("/api/aquarium-save", { headers: { "x-schicksal-member": id }, credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error("无法加载云端存档");
        const cloud = await response.json();
        if (!active) return;
        setMember(id);
        const value = cloud.state || parseBackup(id) || initial();
        revisionRef.current = cloud.revision;
        setRevision(cloud.revision);
        setSave(value);
        setStatus(cloud.state ? "已读取成员专属云端存档" : "新水族馆已准备好");
        setReady(true);
      } catch { if (active) setStatus("无法验证成员身份或读取云端存档。请从天命网站登录后再进入。"); }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !member) return;
    try { localStorage.setItem(keyFor(member), JSON.stringify(save)); } catch {}
    setStatus("正在同步…");
    const timer = window.setTimeout(() => void upload(member, save), 650);
    return () => window.clearTimeout(timer);
  }, [save, member, ready, upload]);

  const feed = (id: string) => setSave(current => current.coins < 1 ? current : ({
    ...current, coins: current.coins - 1,
    fish: current.fish.map(f => f.id === id ? { ...f, hunger: Math.min(100, f.hunger + 25), age: f.age + 1 } : f),
  }));
  const collect = () => setSave(current => ({ ...current, coins: Math.min(1_000_000_000, current.coins + current.fish.filter(f => f.hunger >= 25).length) }));
  const buy = () => setSave(current => current.coins < 8 || current.fish.length >= 60 ? current : ({
    ...current, coins: current.coins - 8, fish: [...current.fish, { id: crypto.randomUUID(), hunger: 60, age: 0 }],
  }));

  return <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 20%, #153c43, #081b27 75%)", color: "#f5ead2", fontFamily: "Georgia, serif", padding: "24px" }}>
    <header style={{ maxWidth: 940, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div><small>ROOM NO. 02 · LORD CHRYSER</small><h1 style={{ margin: "4px 0" }}>翡翠深海 · The Jade Aquarium</h1><small>独立水族馆原型 · 非《怪怪水族馆》原版引擎</small></div>
      <a href="/" style={{ color: "#e8c889" }}>返回天命 Lounge</a>
    </header>
    <div style={{ maxWidth: 940, margin: "auto" }}>
      <p role="status">{status}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span>金币 {save.coins}</span><span>鱼儿 {save.fish.length}</span><span>存档版本 {revision}</span>
        <button disabled={!ready} onClick={collect}>收集金币</button>
        <button disabled={!ready || save.coins < 8} onClick={buy}>购买鱼儿 · 8 金币</button>
        <button disabled={!ready} onClick={() => void upload(member, saveRef.current)}>立即同步</button>
      </div>
      <div aria-label="透明鱼缸" style={{ position: "relative", minHeight: 430, border: "10px solid rgba(156,219,216,.38)", borderRadius: 24, boxShadow: "inset 0 0 55px #44cbbd50, 0 24px 55px #0007", background: "linear-gradient(180deg,#126c8180,#0a3a5080 65%,#b6a781 100%)", overflow: "hidden", display: "flex", alignContent: "center", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 22, padding: 36 }}>
        {save.fish.map((fish, i) => <button key={fish.id} disabled={!ready || save.coins < 1} onClick={() => feed(fish.id)} title="点击喂食：花费 1 金币" style={{ fontSize: 44, background: "transparent", border: "none", cursor: "pointer", transform: i % 2 ? "scaleX(-1)" : "none", filter: fish.hunger < 25 ? "grayscale(.65)" : "none" }} aria-label={`喂第 ${i + 1} 条鱼，饱食度 ${fish.hunger}`}>🐠<span style={{ display: "block", fontSize: 12, color: "#fff" }}>♥ {fish.hunger}</span></button>)}
        <div aria-hidden="true" style={{ position: "absolute", bottom: 12, left: 12, right: 12, textAlign: "center", fontSize: 22 }}>🪸　🫧　🌿　🪸　🫧　🌿</div>
      </div>
      <p style={{ opacity: .75 }}>点击鱼儿喂食，收集金币并添置新鱼。成员存档按登录身份隔离；换设备时请以同一成员身份登录。离线和冲突处理仍属于原型阶段。</p>
    </div>
  </main>;
}
