"use client";

import { useState } from "react";
import { CITIZENS } from "./citizens";

type Meeting = { speakerStatus: string; speakerCitizenId: string };
type Props = { meeting: Meeting | null; stage: string; busy: boolean; onAction: (payload: Record<string, unknown>, success: string) => Promise<boolean> };

export function SpeakerManagement({ meeting, stage, busy, onAction }: Props) {
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("23");
  const [minute, setMinute] = useState("59");
  const [candidate, setCandidate] = useState("");
  const [startNow, setStartNow] = useState(true);
  const [confirmation, setConfirmation] = useState<"close" | "revoke" | null>(null);
  const canOpen = !meeting || meeting.speakerStatus === "not_configured";
  const electionAvailable = ["debate", "amendment"].includes(stage);
  const configure = async () => {
    const deadline = new Date(`${date}T${hour}:${minute}:00`);
    if (!date || !Number.isFinite(deadline.getTime())) return;
    await onAction({ action: "configure_speaker_election", speakerElectionDeadline: deadline.toISOString() }, "议长选举已开放，截止时间已保存到分钟。");
  };
  const confirm = async () => {
    if (!confirmation) return;
    const ok = await onAction({ action: confirmation === "close" ? "close_speaker_election" : "revoke_speaker_election" }, confirmation === "close" ? "选举已提前结束；最高票者自动当选，平票或无人参选时可在下方裁决或指定。" : "本次选举及议长权限已撤销，原始选票和正式发言保留在程序记录中。");
    if (ok) setConfirmation(null);
  };

  return <section className="speaker-management" aria-labelledby="speaker-management-title">
    <header><div><p className="eyebrow">COMMITTEE CONTROL</p><h3 id="speaker-management-title">议长管理</h3></div><span>宇宙霸主 · No.2 · 我说真的</span></header>
    {canOpen && <div className="speaker-deadline-controls">
      <label>选举截止日期<input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} /></label>
      <label>小时<select value={hour} onChange={(event) => setHour(event.target.value)} disabled={busy}>{Array.from({ length: 24 }, (_, value) => String(value).padStart(2, "0")).map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>分钟<select value={minute} onChange={(event) => setMinute(event.target.value)} disabled={busy}>{Array.from({ length: 60 }, (_, value) => String(value).padStart(2, "0")).map((value) => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={configure} disabled={busy || !date || !electionAvailable}>开放议长选举</button>
      <p>按设备当地时间，精确到分钟。{electionAvailable ? "截止时按实际票数自动选出议长。" : "请先进入辩论或修正阶段，再开放选举；也可以在下方直接指定议长。"}</p>
    </div>}
    {!canOpen && <div className="speaker-election-management-actions">
      {meeting?.speakerStatus === "open" && <button type="button" onClick={() => setConfirmation("close")} disabled={busy}>提前结束选举</button>}
      <button type="button" onClick={() => setConfirmation("revoke")} disabled={busy}>撤销本次选举及议长权限</button>
    </div>}
    {confirmation && <div className="speaker-action-confirmation" role="alert">
      <p>{confirmation === "close" ? "现在结束投票？唯一最高票者立即当选；最高票平票时等待委员裁决，无人参选时可以直接指定。" : "撤销本次选举及议长权限？当前发言权会清空，席位会解锁；已记录的正式发言和原始选票会保留。"}</p>
      <button type="button" onClick={() => void confirm()} disabled={busy}>{confirmation === "close" ? "确认提前结束" : "确认撤销"}</button><button type="button" onClick={() => setConfirmation(null)} disabled={busy}>取消</button>
    </div>}
    <div className="speaker-appointment-controls">
      <label>直接指定本次会议议长<select value={candidate} onChange={(event) => setCandidate(event.target.value)} disabled={busy}><option value="">选择成员</option>{CITIZENS.filter((citizen) => !citizen.locked).map((citizen) => <option key={citizen.id} value={citizen.id}>{citizen.username}</option>)}</select></label>
      <label className="speaker-start-now"><input type="checkbox" checked={startNow} onChange={(event) => setStartNow(event.target.checked)} disabled={busy} />立即开始辩论并锁定现有席位</label>
      <button type="button" disabled={busy || !candidate} onClick={() => void onAction({ action: "assign_speaker", candidateCitizenId: candidate, startDebateNow: startNow }, startNow ? "议长已指定，辩论已开始。" : "议长已指定；成员就座后，由议长宣布开会。")}>指定议长并进入辩论</button>
      <p>跳过选举。取消勾选可先安排成员就座；更换议长不会删除原有发言和程序记录。</p>
    </div>
  </section>;
}
