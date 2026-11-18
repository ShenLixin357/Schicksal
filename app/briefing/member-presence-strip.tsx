"use client";

import type { MemberPresence } from "./use-member-presence";
import "./member-presence.css";

type Member = { id: string; username: string; accent: string; locked?: boolean };

export function MemberPresenceStrip({ presence, members, compact = false }: {
  presence: MemberPresence; members: readonly Member[]; compact?: boolean;
}) {
  const eligible = members.filter(member => !member.locked);
  const ids = new Set(presence.online);
  const online = eligible.filter(member => ids.has(member.id));
  return <div className={`schicksal-presence ${compact ? "schicksal-presence-compact" : ""}`}
    role="status" aria-live="polite" title="在线表示最近 90 秒内有经过验证、可见的浏览器会话；不是阅读状态或已登录人数。">
    <span className="schicksal-presence-caption"><i aria-hidden="true" className={presence.status === "ready" ? "live" : ""}/>
      {presence.status === "ready" ? `在线 ${online.length}/${eligible.length}`
        : presence.status === "loading" ? "在线同步中" : "在线状态不可用"}
    </span>
    {presence.status === "ready" &&
      <span className="schicksal-presence-list">
        {online.length ? online.map(member =>
          <span className="schicksal-presence-member" key={member.id}
            style={{ "--member-accent": member.accent } as React.CSSProperties}>
            <i aria-hidden="true"/>{member.username}
          </span>)
          : <span className="schicksal-presence-empty">暂时无人在线</span>}
      </span>}
  </div>;
}
