"use client";

import { startTransition, useEffect, useState, type CSSProperties, type ReactNode, type FormEvent } from "react";
import { CITIZENS, citizenRepresentativeColor, type Citizen } from "../citizens";
import { PageHead } from "../shell/page-head";
import { SpeakerManagement } from "../speaker-management";
import type {
  ParliamentStage, ParliamentClassification, ParliamentRouting,
  ProposerAgeBand, ParliamentItem, ParliamentComment, ParliamentVote,
  ParliamentAmendment, ParliamentAuditEvent, ParliamentMeeting,
  ParliamentSpeakerCandidate, ParliamentSpeakerVote, ParliamentSeat,
  ParliamentFloorRequest, ParliamentResultReaction, ParliamentSession,
  ParliamentBoard
} from "./parliament-types";

/** Preserves the existing live parliament UI and state transitions.
 * Identity marks are injected from the canonical parent renderer in official
 * mode so relocating parliament cannot silently change member colours.
 * Do not alter D1 routes or parliamentary rules as part of this refactor.
 */
function ParliamentSection({ citizen, renderOfficialMark }: { citizen: Citizen; renderOfficialMark: (citizen: Citizen) => ReactNode }) {
  const [choice, setChoice] = useState<"support" | "oppose" | "abstain" | null>(null);
  const [hearHear, setHearHear] = useState(7);
  const [giveWay, setGiveWay] = useState(false);
  const [pointOfOrder, setPointOfOrder] = useState(false);
  const [amendments, setAmendments] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("国家基础制度框架案");
  const [proposalSummary, setProposalSummary] = useState("正文与具体条款将在后续制宪课程完成后装入；当前先验证完整议事流程。");
  const [draftTitle, setDraftTitle] = useState(proposalTitle);
  const [draftSummary, setDraftSummary] = useState(proposalSummary);
  const [events, setEvents] = useState([
    { id: 1, tag: "议长", text: "本次会议进入 Debate（辩论）阶段。" },
    { id: 2, tag: "书记席", text: "当前议案为网站交互原型，不产生正式法律效力。" },
  ]);

  const addEvent = (tag: string, text: string) => {
    setEvents((current) => [...current, { id: Date.now() + Math.random(), tag, text }].slice(-6));
  };

  const castVote = (next: "support" | "oppose" | "abstain") => {
    setChoice(next);
    const labels = { support: "支持", oppose: "反对", abstain: "弃权" };
    addEvent("正式表决", `${citizen.codename} 投下“${labels[next]}”演示票。`);
  };

  const base = { support: 2, oppose: 2, abstain: 1 };
  const support = base.support + (choice === "support" ? 1 : 0);
  const oppose = base.oppose + (choice === "oppose" ? 1 : 0);
  const abstain = base.abstain + (choice === "abstain" ? 1 : 0);
  const valid = support + oppose;
  const total = valid + abstain;
  const threshold = Math.floor(valid / 2) + 1;
  const result = choice === null
    ? "等待当前登录公民投出演示票"
    : support > oppose
      ? "支持票超过半数 · 提案通过"
      : oppose > support
        ? "反对票超过半数 · 提案未通过"
        : "票数相同 · 交由最高领导人裁决";

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = draftTitle.trim() || "未命名提案";
    const nextSummary = draftSummary.trim() || "正文与条款待后续录入。";
    setProposalTitle(nextTitle);
    setProposalSummary(nextSummary);
    setEditorOpen(false);
    addEvent("提案更新", `${citizen.codename} 更新了议案标题与摘要。`);
  };

  const chamberSides = [CITIZENS.slice(0, 4), CITIZENS.slice(4, 8)];

  return <>
    <PageHead eyebrow="Parliament · 议会" title="国家议事厅" copy="像真正的议场一样允许喝彩、插话、程序挑战、修正和正式表决；中文始终是主界面语言。" />

    <section className="parliament-rules" aria-label="议会表决规则">
      <article><span>01</span><div><small>MAJORITY · 多数</small><h2>超过半数即通过</h2><p>正式表决中，支持票超过有效表决票的一半，议案即通过。</p></div></article>
      <article><span>02</span><div><small>CASTING DECISION · 平票裁决</small><h2>平票交由最高领导人</h2><p>支持票与反对票相同时，由最高领导人作出最终裁决。</p></div></article>
      <article><span>03</span><div><small>PROTOTYPE · 原型</small><h2>先建程序，再装条款</h2><p>当前表决和文本均为交互演示，不进入正式国家记录。</p></div></article>
    </section>

    <ol className="legislative-flow" aria-label="一项议案的完整流程">
      {["草案", "正式提案", "辩论", "修正", "公投", "正式法案"].map((step, index) => <li key={step} className={index === 2 ? "active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < 5 && <i>→</i>}</li>)}
    </ol>

    <section className="live-parliament">
      <article className="chamber-shell">
        <header><div><i /><span>CHAMBER LIVE · 议场进行中</span></div><small>INTERACTIVE DEMO · 互动原型</small></header>
        <div className="chamber-room">
          <div className="speaker-dais"><small>本次会议议长 · SPEAKER</small><strong>待会议选出</strong><span>主持发言顺序与程序问题</span></div>
          {chamberSides.map((side, sideIndex) => <div className={`chamber-benches side-${sideIndex + 1}`} key={sideIndex}>{side.map((member) => <div className={`${member.id === citizen.id ? "current" : ""} ${member.locked ? "sealed" : ""}`} key={member.id} style={{ "--citizen": citizenRepresentativeColor(member) } as CSSProperties}>{renderOfficialMark(member)}<span><strong>{member.username}</strong><small>{member.locked ? "席位待确认" : member.id === citizen.id ? "当前登录" : "在席"}</small></span></div>)}</div>)}
          <div className="dispatch-table"><span>议案文本</span><b>S</b><small>AMENDMENTS<br />修正案 {String(amendments).padStart(2, "0")}</small></div>
        </div>

        <section className="floor-speech">
          <div className="speaker-identity">{renderOfficialMark(citizen)}<span><small>正在发言 · ON THE FLOOR</small><strong>{citizen.codename}</strong></span></div>
          <blockquote>“{proposalSummary}”</blockquote>
          <div className="chamber-actions">
            <button type="button" onClick={() => { setHearHear((count) => count + 1); addEvent("议场反应", `${citizen.codename} 喊出“说得好！”`); }}><span>说得好！</span><small>HEAR, HEAR! · {hearHear}</small></button>
            <button type="button" className={giveWay ? "active" : ""} onClick={() => { const next = !giveWay; setGiveWay(next); addEvent("请求插话", next ? `${citizen.codename} 请求发言人让出短暂发言权。` : `${citizen.codename} 撤回插话请求。`); }}><span>请求插话</span><small>GIVE WAY</small></button>
            <button type="button" className={pointOfOrder ? "active urgent" : ""} onClick={() => { const next = !pointOfOrder; setPointOfOrder(next); addEvent("程序问题", next ? `${citizen.codename} 提出程序问题，议事暂时中止。` : "程序问题已经处理，议事恢复。" ); }}><span>程序问题</span><small>POINT OF ORDER</small></button>
            <button type="button" onClick={() => { setAmendments((count) => count + 1); addEvent("修正案", `${citizen.codename} 提交了一项文字修正占位。`); }}><span>提出修正案</span><small>AMENDMENT</small></button>
          </div>
        </section>
      </article>

      <aside className="session-feed">
        <header><p className="eyebrow">Live Record · 实时记录</p><span>{events.length} EVENTS</span></header>
        <div>{events.map((item) => <article key={item.id}><small>{item.tag}</small><p>{item.text}</p><time>NOW</time></article>)}</div>
        <footer><i /><span>{pointOfOrder ? "程序暂停 · 议长处理中" : giveWay ? "插话请求等待发言人回应" : "议事程序正常进行"}</span></footer>
      </aside>
    </section>

    <section className="bill-workspace">
      <article className="active-bill">
        <header><div><span>PROPOSAL DEMO–001</span><i>DEBATE · 辩论中</i></div><button type="button" onClick={() => { setEditorOpen(!editorOpen); setDraftTitle(proposalTitle); setDraftSummary(proposalSummary); }}>{editorOpen ? "关闭编辑" : "编辑标题与摘要"}</button></header>
        <small>CONTENTS TO BE ADDED LATER · 具体条款稍后加入</small>
        <h2>{proposalTitle}</h2>
        <p>{proposalSummary}</p>
        <div className="bill-meta"><span><small>PROPOSED BY · 提案人</small><strong>{citizen.codename}</strong></span><span><small>VERSION · 版本</small><strong>v0.{amendments + 1}</strong></span><span><small>AMENDMENTS · 修正</small><strong>{amendments}</strong></span></div>
        {editorOpen && <form className="proposal-editor" onSubmit={saveDraft}><label><span>提案标题</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={100} /></label><label><span>提案摘要</span><textarea value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} maxLength={420} rows={4} /></label><button className="primary" type="submit">保存到演示议案 <span>→</span></button></form>}
        <footer><strong>立法史将保留</strong><span>原始提案</span><span>逐条引用</span><span>修正版本</span><span>讨论线程</span><span>最终票数</span></footer>
      </article>

      <aside className="division-lobby">
        <header><p className="eyebrow">Division · 正式表决</p><span>DEMO BALLOT</span></header>
        <h2>演示计票台</h2>
        <p>下列基础票数仅用于展示结果变化，不代表任何真实公民立场。</p>
        <div className="division-tally"><span><b>{support}</b><small>支持</small></span><i /><span><b>{oppose}</b><small>反对</small></span><i /><span><b>{abstain}</b><small>弃权</small></span></div>
        <div className="vote-meter" aria-label={`支持 ${support}，反对 ${oppose}`}><i style={{ width: `${valid ? support / valid * 100 : 50}%` }} /><b /></div>
        <div className="threshold"><span>通过所需</span><strong>{threshold} / {valid} 有效票</strong><small>弃权不计入支持或反对；平票进入最高领导人裁决。</small></div>
        <div className="division-actions">
          <button type="button" className={choice === "support" ? "chosen support" : ""} onClick={() => castVote("support")}><span>AYE</span><strong>支持</strong></button>
          <button type="button" className={choice === "oppose" ? "chosen oppose" : ""} onClick={() => castVote("oppose")}><span>NO</span><strong>反对</strong></button>
          <button type="button" className={choice === "abstain" ? "chosen abstain" : ""} onClick={() => castVote("abstain")}><span>ABSTAIN</span><strong>弃权</strong></button>
        </div>
        <p className={`division-result ${choice ? "decided" : ""}`} role="status"><small>CURRENT RESULT · 当前结果</small><strong>{result}</strong><span>{total} 张演示选票 · 不写入国家档案</span></p>
      </aside>
    </section>

    <article className="restoration-record"><div><span>R–001</span><small>ARCHIVED REFERENDUM · 历史公投</small></div><section><h2>第一帝国复辟公投</h2><p>2026 年 8 月 15 日 13:43，立法委员会共 3 票，宇宙霸主与 No.2 支持，以 2/3 过半通过。</p></section><strong>RATIFIED<br />已认证</strong></article>
  </>;
}

const PARLIAMENT_STAGE_META: Record<ParliamentStage, { cn: string; en: string; copy: string }> = {
  proposal: { cn: "提案库", en: "PROPOSALS", copy: "异步阅读、引用条文、评论与回复" },
  debate: { cn: "辩论厅", en: "DEBATE", copy: "选举议长、选择阵营席位并现场质询" },
  amendment: { cn: "修正中心", en: "AMENDMENTS", copy: "保留议场，在面对面辩论中逐字修正" },
  voting: { cn: "表决厅", en: "DIVISION", copy: "赞成、反对、弃权及公开个人标志" },
  resolved: { cn: "结果与档案", en: "ACTS & RECORDS", copy: "公示结果、永久记录、评论与赞踩" },
  deferred: { cn: "搁置库", en: "DEFERRED", copy: "保留暂缓、撤回和等待材料的议案" },
};

const COMMENT_TYPE_META: Record<string, { cn: string; en: string }> = {
  comment: { cn: "评论", en: "COMMENT" },
  speech: { cn: "发言", en: "SPEECH" },
  amendment: { cn: "修正建议", en: "AMENDMENT" },
  "point-order": { cn: "程序问题", en: "POINT OF ORDER" },
  "routing-objection": { cn: "分流异议", en: "ROUTING OBJECTION" },
  reaction: { cn: "议场反应", en: "HEAR, HEAR" },
  system: { cn: "程序记录", en: "PROCEDURE" },
};

const CLASSIFICATION_META: Record<ParliamentClassification, string> = {
  ordinary: "普通立法",
  constitutional: "宪制事项",
  administrative_review: "行政审查",
  external_agreement: "对外协议",
  youth_autonomy: "少年自治事项",
  pending_review: "待分类审查",
  foundational: "建国认证",
};

const ROUTING_META: Record<ParliamentRouting, string> = {
  parliament: "议会全体程序",
  legislative_committee: "立法委员会",
  dual_review: "宪制双重审查",
  youth_electorate: "少年成员选民团",
  pending_review: "等待程序分流",
};

const AGE_BAND_META: Record<ProposerAgeBand, string> = {
  under_8: "8 岁以下",
  "8_to_11": "8–11 岁",
  "12_plus": "12 岁及以上",
  unknown: "尚未确认",
};

export function PersistentParliamentSection({ citizen, requestedItemId = "", requestedFocus = "vote", focusReferendums = false, renderOfficialMark }: { citizen: Citizen; requestedItemId?: string; requestedFocus?: "proposal" | "speaker" | "debate" | "vote"; focusReferendums?: boolean; renderOfficialMark: (citizen: Citizen) => ReactNode }) {
  const [items, setItems] = useState<ParliamentItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [comments, setComments] = useState<ParliamentComment[]>([]);
  const [votes, setVotes] = useState<ParliamentVote[]>([]);
  const [amendments, setAmendments] = useState<ParliamentAmendment[]>([]);
  const [auditEvents, setAuditEvents] = useState<ParliamentAuditEvent[]>([]);
  const [meeting, setMeeting] = useState<ParliamentMeeting | null>(null);
  const [speakerCandidates, setSpeakerCandidates] = useState<ParliamentSpeakerCandidate[]>([]);
  const [speakerVotes, setSpeakerVotes] = useState<ParliamentSpeakerVote[]>([]);
  const [seats, setSeats] = useState<ParliamentSeat[]>([]);
  const [floorRequests, setFloorRequests] = useState<ParliamentFloorRequest[]>([]);
  const [resultReactions, setResultReactions] = useState<ParliamentResultReaction[]>([]);
  const [session, setSession] = useState<ParliamentSession>({ citizenId: citizen.id, stageManager: false, speakerManager: false, meetingSpeaker: false, platformAuthenticated: false });
  const [filter, setFilter] = useState<"all" | ParliamentStage>(focusReferendums ? "resolved" : "all");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [casePanel, setCasePanel] = useState<"stage" | "text" | "procedure" | "history">("stage");
  const [liveRecordOpen, setLiveRecordOpen] = useState(false);
  const [resolvedShelf, setResolvedShelf] = useState<"all" | "passed" | "rejected" | "referendum">(focusReferendums ? "referendum" : "all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"proposal" | "bill">("proposal");
  const [createTitle, setCreateTitle] = useState("");
  const [createSummary, setCreateSummary] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [createClassification, setCreateClassification] = useState<ParliamentClassification>("pending_review");
  const [createAgeBand, setCreateAgeBand] = useState<ProposerAgeBand>("unknown");
  const [createRecusal, setCreateRecusal] = useState(false);
  const [createDeadline, setCreateDeadline] = useState("");
  const [commentType, setCommentType] = useState("comment");
  const [commentBody, setCommentBody] = useState("");
  const [commentQuote, setCommentQuote] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [quickCommentItemId, setQuickCommentItemId] = useState("");
  const [quickCommentBody, setQuickCommentBody] = useState("");
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentQuote, setAmendmentQuote] = useState("");
  const [amendmentText, setAmendmentText] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [stageTarget, setStageTarget] = useState<ParliamentStage>("proposal");
  const [stageReason, setStageReason] = useState("");
  const [finalOutcome, setFinalOutcome] = useState("pending");
  const [classificationTarget, setClassificationTarget] = useState<ParliamentClassification>("pending_review");
  const [routingTarget, setRoutingTarget] = useState<ParliamentRouting>("pending_review");
  const [ageBandTarget, setAgeBandTarget] = useState<ProposerAgeBand>("unknown");
  const [recusalTarget, setRecusalTarget] = useState(false);
  const [deadlineTarget, setDeadlineTarget] = useState("");
  const [classificationReason, setClassificationReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editBody, setEditBody] = useState("");
  const [floorRequestBody, setFloorRequestBody] = useState("");

  const applyBoard = (board: ParliamentBoard) => {
    setItems(board.items ?? []);
    setComments(board.comments ?? []);
    setVotes(board.votes ?? []);
    setAmendments(board.amendments ?? []);
    setAuditEvents(board.auditEvents ?? []);
    setMeeting(board.meeting ?? null);
    setSpeakerCandidates(board.speakerCandidates ?? []);
    setSpeakerVotes(board.speakerVotes ?? []);
    setSeats(board.seats ?? []);
    setFloorRequests(board.floorRequests ?? []);
    setResultReactions(board.resultReactions ?? []);
    if (board.activeItem) setActiveId(board.activeItem.id);
    if (board.session) setSession(board.session);
  };

  const applyLiveBoard = (board: ParliamentBoard) => {
    startTransition(() => {
      if (board.votes) setVotes(board.votes);
      setMeeting(board.meeting ?? null);
      setSpeakerCandidates(board.speakerCandidates ?? []);
      setSpeakerVotes(board.speakerVotes ?? []);
      setSeats(board.seats ?? []);
      setFloorRequests(board.floorRequests ?? []);
      setResultReactions(board.resultReactions ?? []);
      if (board.session) setSession(board.session);
    });
  };

  const loadBoard = async (requestedId = "") => {
    const params = new URLSearchParams({ citizenId: citizen.id });
    if (requestedId) params.set("itemId", requestedId);
    const response = await fetch(`/api/parliament?${params.toString()}`);
    const board = await response.json() as ParliamentBoard;
    if (!response.ok) throw new Error(board.error || "议会资料暂时无法读取。");
    applyBoard(board);
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ citizenId: citizen.id });
    if (requestedItemId) params.set("itemId", requestedItemId);
    fetch(`/api/parliament?${params.toString()}`)
      .then(async (response) => {
        const board = await response.json() as ParliamentBoard;
        if (!response.ok) throw new Error(board.error || "议会资料暂时无法读取。");
        if (active) {
          if (requestedItemId && board.activeItem?.id !== requestedItemId) {
            setStatus("原待办对应的议案已无法找到，请从议事清单重新选择。");
            setWorkspaceOpen(false);
          } else {
            applyBoard(board);
            if (requestedItemId) { setWorkspaceOpen(true); setCasePanel("stage"); }
          }
        }
      })
      .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "议会资料暂时无法读取。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [citizen.id, requestedItemId]);

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  useEffect(() => {
    if (!requestedItemId || !workspaceOpen || !activeItem || activeItem.id !== requestedItemId) return;
    const anchor = { proposal: "parliament-proposal-discussion", speaker: "parliament-speaker-election", debate: "parliament-debate-session", vote: "parliament-vote-actions" }[requestedFocus];
    const frame = window.requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "center", behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [requestedItemId, requestedFocus, workspaceOpen, activeItem?.id, activeItem?.stage, meeting?.speakerStatus, meeting?.debateStartedAt]);

  useEffect(() => {
    if (!activeItem) return;
    // Keep the procedural controls synchronized when a different persisted item is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStageTarget(activeItem.stage);
    setFinalOutcome(activeItem.outcome === "passed" || activeItem.outcome === "rejected" ? activeItem.outcome : "pending");
    setEditTitle(activeItem.title);
    setEditSummary(activeItem.summary);
    setEditBody(activeItem.body);
    setClassificationTarget(activeItem.classification);
    setRoutingTarget(activeItem.routing);
    setAgeBandTarget(activeItem.proposerAgeBand);
    setRecusalTarget(Boolean(activeItem.recusalRequested));
    setDeadlineTarget(activeItem.deadline || "");
    setStageReason("");
    setClassificationReason("");
    setCommentQuote("");
    setCommentType("comment");
    setReplyTo("");
    setAmendmentOpen(false);
    setEditOpen(false);
    setFloorRequestBody("");
    setCasePanel("stage");
    setLiveRecordOpen(false);
    // Reset editors only when another persisted item is opened, not on live election polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id]);

  useEffect(() => {
    if (!workspaceOpen || !activeItem || !["debate", "amendment", "voting"].includes(activeItem.stage)) return;
    const timer = window.setInterval(() => {
      const params = new URLSearchParams({ citizenId: citizen.id, itemId: activeItem.id, scope: "live" });
      fetch(`/api/parliament?${params.toString()}`)
        .then((response) => response.json())
        .then((board: ParliamentBoard) => applyLiveBoard(board))
        .catch(() => undefined);
    }, 4_000);
    return () => window.clearInterval(timer);
    // Live views refresh only the meeting and division payload, never the full docket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, activeItem?.stage, citizen.id, workspaceOpen]);

  const sendAction = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/parliament", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-schicksal-citizen": citizen.id },
        body: JSON.stringify({ ...payload, citizenId: citizen.id }),
      });
      const board = await response.json() as ParliamentBoard;
      if (!response.ok) throw new Error(board.error || "议会操作失败。");
      if (board.items) applyBoard(board);
      else applyLiveBoard(board);
      setStatus(success);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "议会操作失败，请稍后重试。");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openItem = async (id: string) => {
    setActiveId(id);
    setWorkspaceOpen(true);
    setCasePanel("stage");
    setLoading(true);
    setStatus("");
    try { await loadBoard(id); }
    catch (error) { setStatus(error instanceof Error ? error.message : "议案无法打开。"); }
    finally { setLoading(false); }
  };

  const createItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await sendAction({ action: "create_item", kind: createKind, title: createTitle, summary: createSummary, body: createBody, classification: createClassification, proposerAgeBand: createAgeBand, recusalRequested: createRecusal, deadline: createDeadline }, "新议案已进入提案库，并生成了程序分流建议。");
    if (ok) {
      setCreateOpen(false); setWorkspaceOpen(true); setCasePanel("stage"); setCreateTitle(""); setCreateSummary(""); setCreateBody(""); setCreateClassification("pending_review"); setCreateAgeBand("unknown"); setCreateRecusal(false); setCreateDeadline(""); setFilter("proposal");
    }
  };

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType, body: commentBody, quoteText: commentQuote, parentId: replyTo }, "发言已经写入这项议案的讨论记录。");
    if (ok) { setCommentBody(""); setCommentType("comment"); setCommentQuote(""); setReplyTo(""); }
  };

  const addResultComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "comment", body: commentBody, quoteText: "", parentId: replyTo }, "评论已经发布在正式结果下方。");
    if (ok) { setCommentBody(""); setReplyTo(""); }
  };

  const addFloorSpeech = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "speech", body: commentBody, quoteText: commentQuote, parentId: "" }, "正式发言已经写入本次会议记录。");
    if (ok) { setCommentBody(""); setCommentQuote(""); }
  };

  const addQuickComment = async (event: FormEvent<HTMLFormElement>, item: ParliamentItem) => {
    event.preventDefault();
    const ok = await sendAction({ action: "add_comment", itemId: item.id, commentType: "comment", body: quickCommentBody, quoteText: "", parentId: "" }, `评论已经写入 ${item.serialCode} 的讨论记录。`);
    if (ok) {
      setQuickCommentBody("");
      setQuickCommentItemId("");
      setActiveId(item.id);
    }
  };

  const castVote = async (choice: "support" | "oppose" | "abstain") => {
    if (!activeItem) return;
    const previousVotes = votes;
    const now = new Date().toISOString();
    setVotes((current) => [...current.filter((vote) => vote.citizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, choice, documentVersion: activeItem.votingVersion ?? activeItem.version, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "cast_vote", itemId: activeItem.id, choice }, "你的选票已经保存；再次选择可以改票。");
    if (!ok) setVotes(previousVotes);
  };

  const transitionStage = async () => {
    if (!activeItem) return;
    await sendAction({ action: "transition_stage", itemId: activeItem.id, stage: stageTarget, outcome: stageTarget === "resolved" ? finalOutcome : "pending", reason: stageReason }, `议案已经进入“${PARLIAMENT_STAGE_META[stageTarget].cn}”，程序理由已写入审计记录。`);
  };

  const classifyItem = async () => {
    if (!activeItem) return;
    await sendAction({ action: "classify_item", itemId: activeItem.id, classification: classificationTarget, routing: routingTarget, proposerAgeBand: ageBandTarget, recusalRequested: recusalTarget, deadline: deadlineTarget, reason: classificationReason }, "议案分类与程序路线已经正式确认。");
  };

  const submitAmendment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "submit_amendment", itemId: activeItem.id, targetQuote: amendmentQuote, proposedText: amendmentText, reason: amendmentReason }, "正式修正案已提交到修正中心。");
    if (ok) { setAmendmentQuote(""); setAmendmentText(""); setAmendmentReason(""); setAmendmentOpen(false); }
  };

  const decideAmendment = async (amendmentId: string, decision: "accepted" | "rejected") => {
    if (!activeItem) return;
    await sendAction({ action: "decide_amendment", itemId: activeItem.id, amendmentId, decision }, decision === "accepted" ? "修正案已并入新版本正文。" : "修正案已否决，原文保持不变。");
  };

  const updateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "update_item", itemId: activeItem.id, title: editTitle, summary: editSummary, body: editBody }, "议案正文与版本记录已经更新。");
    if (ok) setEditOpen(false);
  };

  const standForSpeaker = async () => {
    if (!activeItem) return;
    await sendAction({ action: "stand_for_speaker", itemId: activeItem.id }, "你已经登记参选本次会议议长。");
  };

  const castSpeakerVote = async (candidateCitizenId: string) => {
    if (!activeItem) return;
    const previousVotes = speakerVotes;
    const now = new Date().toISOString();
    setSpeakerVotes((current) => [...current.filter((vote) => vote.voterCitizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, voterCitizenId: citizen.id, candidateCitizenId, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "cast_speaker_vote", itemId: activeItem.id, candidateCitizenId }, "你的公开议长选票已经登记；截止前可以改票。");
    if (!ok) setSpeakerVotes(previousVotes);
  };

  const resolveSpeakerTie = async (candidateCitizenId: string) => {
    if (!activeItem) return;
    await sendAction({ action: "resolve_speaker_tie", itemId: activeItem.id, candidateCitizenId }, "委员已完成议长选举平票裁决。");
  };

  const chooseSeat = async (side: "proposal" | "question", seatIndex: number) => {
    if (!activeItem) return;
    const previousSeats = seats;
    const now = new Date().toISOString();
    setSeats((current) => [...current.filter((seat) => seat.citizenId !== citizen.id && !(seat.side === side && seat.seatIndex === seatIndex)), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, side, seatIndex, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "choose_seat", itemId: activeItem.id, side, seatIndex }, `你的个人标志已经进入${side === "proposal" ? "提案方" : "质询方"}第 ${seatIndex} 席。`);
    if (!ok) setSeats(previousSeats);
  };

  const startDebateSession = async () => {
    if (!activeItem) return;
    await sendAction({ action: "start_debate_session", itemId: activeItem.id }, "议长已经宣布开会；双方席位现已锁定。");
  };

  const requestFloor = async (requestType: "speech" | "give_way" | "point_order") => {
    if (!activeItem) return;
    const labels = { speech: "请求发言", give_way: "请求插话", point_order: "程序问题" };
    const ok = await sendAction({ action: "create_floor_request", itemId: activeItem.id, requestType, body: floorRequestBody }, `${labels[requestType]}已送交本次会议议长。`);
    if (ok) setFloorRequestBody("");
  };

  const decideFloorRequest = async (requestId: string, decision: "accepted" | "rejected") => {
    if (!activeItem) return;
    await sendAction({ action: "decide_floor_request", itemId: activeItem.id, requestId, decision }, `议场请求已${decision === "accepted" ? "接受" : "拒绝"}。`);
  };

  const setResultReaction = async (reaction: "like" | "dislike") => {
    if (!activeItem) return;
    const previousReactions = resultReactions;
    const now = new Date().toISOString();
    setResultReactions((current) => [...current.filter((entry) => entry.citizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, reaction, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "set_result_reaction", itemId: activeItem.id, reaction }, `你已经对正式结果${reaction === "like" ? "点赞" : "点踩"}；这不会改变法律效力。`);
    if (!ok) setResultReactions(previousReactions);
  };

  const visibleItems = (filter === "all" ? items : items.filter((item) => item.stage === filter)).filter((item) => {
    if (filter !== "resolved" || resolvedShelf === "all") return true;
    if (resolvedShelf === "referendum") return item.kind === "referendum";
    return item.kind !== "referendum" && item.outcome === resolvedShelf;
  });
  const currentVotes = activeItem?.votingVersion ? votes.filter((vote) => vote.documentVersion === activeItem.votingVersion) : votes;
  const support = currentVotes.filter((vote) => vote.choice === "support").length;
  const oppose = currentVotes.filter((vote) => vote.choice === "oppose").length;
  const abstain = currentVotes.filter((vote) => vote.choice === "abstain").length;
  const myVote = currentVotes.find((vote) => vote.citizenId === citizen.id)?.choice;
  const validVotes = support + oppose;
  const resultText = support > oppose ? "支持票领先" : oppose > support ? "反对票领先" : validVotes ? "当前平票" : "等待投票";
  const stageCount = (stage: ParliamentStage) => items.filter((item) => item.stage === stage).length;
  const citizenFor = (id: string) => CITIZENS.find((item) => item.id === id);
  const electedSpeaker = meeting?.speakerCitizenId ? citizenFor(meeting.speakerCitizenId) : null;
  const currentFloorCitizen = meeting?.currentFloorCitizenId ? citizenFor(meeting.currentFloorCitizenId) : null;
  const mySpeakerVote = speakerVotes.find((vote) => vote.voterCitizenId === citizen.id)?.candidateCitizenId;
  const mySpeakerCandidacy = speakerCandidates.some((candidate) => candidate.citizenId === citizen.id);
  const mySeat = seats.find((seat) => seat.citizenId === citizen.id);
  const myResultReaction = resultReactions.find((reaction) => reaction.citizenId === citizen.id)?.reaction;
  const likeReactions = resultReactions.filter((reaction) => reaction.reaction === "like");
  const dislikeReactions = resultReactions.filter((reaction) => reaction.reaction === "dislike");
  const tiedSpeakerCandidates = (() => { try { return meeting ? JSON.parse(meeting.tiedCandidateIdsJson) as string[] : []; } catch { return []; } })();
  const journeyStages: ParliamentStage[] = ["proposal", "debate", "amendment", "voting", "resolved"];
  const journeyIndex = activeItem ? journeyStages.indexOf(activeItem.stage) : -1;
  const renderMarks = (citizenIds: string[], emptyCopy = "尚无人") => citizenIds.length
    ? <div className="public-mark-list">{citizenIds.map((id) => { const member = citizenFor(id); return member ? <span key={id}>{renderOfficialMark(member)}<small>{member.username}</small></span> : null; })}</div>
    : <p className="mark-list-empty">{emptyCopy}</p>;
  const renderCommentThread = () => <div className="comment-thread">{comments.length ? comments.map((comment) => { const author = citizenFor(comment.citizenId); const meta = COMMENT_TYPE_META[comment.commentType] ?? COMMENT_TYPE_META.comment; const parent = comment.parentId ? comments.find((entry) => entry.id === comment.parentId) : null; return <article key={comment.id} className={comment.commentType === "system" ? "system-event" : ""}><div>{author ? {renderOfficialMark(author)} : <span className="system-mark">S</span>}</div><section><header><strong>{comment.commentType === "system" ? "议会书记席" : author?.username ?? comment.citizenId}</strong><span>{meta.cn} · {meta.en}</span><time>{new Date(comment.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></header>{parent && <small className="parent-reference">回复：{parent.body.slice(0, 80)}</small>}{comment.quoteText && <blockquote className="comment-quote">{comment.quoteText}</blockquote>}<p>{comment.body}</p>{comment.commentType !== "system" && <button className="reply-action" type="button" onClick={() => setReplyTo(comment.id)}>回复此发言</button>}</section></article>; }) : <div className="docket-empty">还没有讨论，写下第一条评论。</div>}</div>;
  const renderSeat = (side: "proposal" | "question", seatIndex: number) => {
    const seat = seats.find((entry) => entry.side === side && entry.seatIndex === seatIndex);
    const occupant = seat ? citizenFor(seat.citizenId) : null;
    const selectable = !meeting?.seatsLocked && !meeting?.debateStartedAt && meeting?.speakerCitizenId !== citizen.id && (!occupant || occupant.id === citizen.id);
    return <button type="button" key={`${side}-${seatIndex}`} className={`${seat?.citizenId === citizen.id ? "mine" : ""} ${meeting?.currentFloorCitizenId === seat?.citizenId ? "floor" : ""} ${occupant ? "occupied" : "empty"}`} disabled={busy || !selectable} onClick={() => chooseSeat(side, seatIndex)}>{occupant ? <>{renderOfficialMark(occupant)}<span><strong>{occupant.username}</strong><small>{meeting?.currentFloorCitizenId === occupant.id ? "正在发言" : `第 ${seatIndex} 席`}</small></span></> : <><b>＋</b><span><strong>选择此席</strong><small>第 {seatIndex} 席</small></span></>}</button>;
  };

  return <>
    {!workspaceOpen && <PageHead eyebrow="Parliament · 议会" title="国家议事厅" copy="每项提案都有自己的文稿、阶段、讨论线程、选票与程序记录；内容会跨设备保存。" />}

    {!workspaceOpen && <section className="parliament-stage-rail" aria-label="按议事阶段筛选">
      <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><small>ALL</small><strong>全部</strong><b>{items.length}</b></button>
      {(Object.keys(PARLIAMENT_STAGE_META) as ParliamentStage[]).map((stage) => {
        const meta = PARLIAMENT_STAGE_META[stage];
        return <button type="button" key={stage} className={filter === stage ? "active" : ""} onClick={() => setFilter(stage)}><small>{meta.en}</small><strong>{meta.cn}</strong><b>{stageCount(stage)}</b></button>;
      })}
    </section>}

    {!workspaceOpen && <section className="parliament-toolbar streamlined">
      <div><strong>{filter === "all" ? "全部议案" : PARLIAMENT_STAGE_META[filter].cn}</strong><span>选择一项议案，进入它当前所处的场景。</span></div>
      <button className="primary" type="button" onClick={() => setCreateOpen(!createOpen)}>{createOpen ? "关闭提交区" : "提出新提案 / 法案"}<span>{createOpen ? "×" : "＋"}</span></button>
    </section>}

    {!workspaceOpen && filter === "resolved" && <nav className="resolved-shelves" aria-label="结案资料分类"><button type="button" className={resolvedShelf === "all" ? "active" : ""} onClick={() => setResolvedShelf("all")}>全部结案</button><button type="button" className={resolvedShelf === "passed" ? "active" : ""} onClick={() => setResolvedShelf("passed")}>正式法案 / 通过案</button><button type="button" className={resolvedShelf === "rejected" ? "active" : ""} onClick={() => setResolvedShelf("rejected")}>否决案</button><button type="button" className={resolvedShelf === "referendum" ? "active" : ""} onClick={() => setResolvedShelf("referendum")}>历史公投</button></nav>}

    {!workspaceOpen && createOpen && <form className="parliament-create" onSubmit={createItem}>
      <header><div><p className="eyebrow">New Submission · 新提交</p><h2>把一项想法放入提案库</h2></div><p>所有已识别公民都能提出；只有宇宙霸主能改变其正式议事阶段。</p></header>
      <div className="submission-kind"><button type="button" className={createKind === "proposal" ? "active" : ""} onClick={() => setCreateKind("proposal")}><strong>提案</strong><span>先提出问题或制度方向</span></button><button type="button" className={createKind === "bill" ? "active" : ""} onClick={() => setCreateKind("bill")}><strong>法案草案</strong><span>已经有较完整的规范文本</span></button></div>
      <div className="submission-routing">
        <label><span>议案性质</span><select value={createClassification} onChange={(event) => setCreateClassification(event.target.value as ParliamentClassification)}>{(Object.keys(CLASSIFICATION_META) as ParliamentClassification[]).filter((value) => value !== "foundational").map((value) => <option key={value} value={value}>{CLASSIFICATION_META[value]}</option>)}</select></label>
        <label><span>提案人年龄组</span><select value={createAgeBand} onChange={(event) => setCreateAgeBand(event.target.value as ProposerAgeBand)}>{(Object.keys(AGE_BAND_META) as ProposerAgeBand[]).map((value) => <option key={value} value={value}>{AGE_BAND_META[value]}</option>)}</select></label>
        <label><span>希望完成日期</span><input type="date" value={createDeadline} onChange={(event) => setCreateDeadline(event.target.value)} /></label>
        <label className="recusal-check"><input type="checkbox" checked={createRecusal} onChange={(event) => setCreateRecusal(event.target.checked)} /><span>请求 12 岁以上成员回避</span></label>
      </div>
      <label><span>标题 *</span><input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} maxLength={140} placeholder="例如：第一帝国公民身份制度案" required /></label>
      <label><span>摘要 *</span><textarea value={createSummary} onChange={(event) => setCreateSummary(event.target.value)} maxLength={500} rows={2} placeholder="这项提案想解决什么？" required /></label>
      <label className="submission-body"><span>正文 / 条款</span><textarea value={createBody} onChange={(event) => setCreateBody(event.target.value)} maxLength={12_000} rows={7} placeholder="可以先留空，之后由宇宙霸主继续补入文稿和条款。" /></label>
      <footer><small>提交后立即进入「提案库」，不会自动成为法律。</small><button className="primary" type="submit" disabled={busy}>正式放入提案库 <span>→</span></button></footer>
    </form>}

    <section className={`parliament-library-grid ${workspaceOpen ? "workspace-open" : "overview-open"}`}>
      {!workspaceOpen && <aside className="docket-list streamlined-docket">
        <header><div><p className="eyebrow">Order Paper · 议事清单</p><h2>{filter === "all" ? "全部议案" : PARLIAMENT_STAGE_META[filter].cn}</h2></div><span>{visibleItems.length} ITEMS</span></header>
        {loading && !items.length ? <div className="docket-empty">正在打开议事记录…</div> : visibleItems.length ? visibleItems.map((item) => <article key={item.id} className={`docket-card ${activeItem?.id === item.id ? "active" : ""}`}>
          <button type="button" className="docket-open" onClick={() => openItem(item.id)}>
            <span className={`docket-kind ${item.kind}`}>{item.kind === "proposal" ? "提案" : item.kind === "bill" ? "法案" : "公投"}</span>
            <small>{item.serialCode} · {PARLIAMENT_STAGE_META[item.stage].cn}</small><strong>{item.title}</strong><p>{item.summary}</p><div className="docket-route"><span>{CLASSIFICATION_META[item.classification]}</span><span>{ROUTING_META[item.routing]}</span>{item.pendingAmendmentCount > 0 && <b>{item.pendingAmendmentCount} 项待审修正</b>}</div><footer><span>{item.commentCount} 评论</span><span>{item.voteCount} 票</span><b>v{item.version}</b></footer>
          </button>
          <button type="button" className="docket-comment-toggle" aria-expanded={quickCommentItemId === item.id} onClick={() => { setQuickCommentItemId((current) => current === item.id ? "" : item.id); setQuickCommentBody(""); }}><span>在这项{item.kind === "proposal" ? "提案" : item.kind === "bill" ? "法案" : "公投"}下评论</span><b>{quickCommentItemId === item.id ? "收起" : "＋"}</b></button>
          {quickCommentItemId === item.id && <form className="docket-quick-comment" onSubmit={(event) => addQuickComment(event, item)}><label><span>以 {citizen.codename} 身份发言</span><textarea value={quickCommentBody} onChange={(event) => setQuickCommentBody(event.target.value)} rows={3} maxLength={1_500} placeholder="写下你的意见；评论会留在这一条议案下面。" autoFocus required /></label><footer><small>公开在该议案讨论记录中</small><button type="submit" disabled={busy || !quickCommentBody.trim()}>提交评论 →</button></footer></form>}
        </article>) : <div className="docket-empty">这个阶段还没有议案。</div>}
      </aside>}

      {workspaceOpen && <section className={`parliament-document parliament-case stage-${activeItem?.stage ?? "proposal"}`}>
        {!activeItem ? <div className="docket-empty large">选择一项议案，或先提出第一项新提案。</div> : <>
          <nav className="casebar" aria-label="议案工作区导航"><button type="button" onClick={() => { setWorkspaceOpen(false); setCreateOpen(false); }}>← 返回议案清单</button><span>{activeItem.serialCode}</span><small>当前阶段 · {PARLIAMENT_STAGE_META[activeItem.stage].cn}</small></nav>
          <ol className="case-journey" aria-label="议案办理进度">
            {journeyStages.map((stage, index) => <li key={stage} className={`${activeItem.stage === stage ? "current" : ""} ${journeyIndex > index || activeItem.stage === "resolved" ? "complete" : ""} ${journeyIndex >= 0 && index > journeyIndex ? "future" : ""}`}><i>{journeyIndex > index || activeItem.stage === "resolved" ? "✓" : index + 1}</i><span>{PARLIAMENT_STAGE_META[stage].cn}</span></li>)}
            {activeItem.stage === "deferred" && <li className="current deferred"><i>Ⅱ</i><span>搁置</span></li>}
          </ol>
          <header className="document-head"><div><span>{activeItem.serialCode}</span><i>{activeItem.kind === "proposal" ? "PROPOSAL" : activeItem.kind === "bill" ? "BILL" : "REFERENDUM"}</i></div><b className={`stage-badge ${activeItem.stage}`}>{PARLIAMENT_STAGE_META[activeItem.stage].cn}</b></header>
          <div className="document-title"><small>VERSION {activeItem.version} · 提案人 {citizenFor(activeItem.createdByCitizenId)?.username ?? activeItem.createdByCitizenId}</small><h2>{activeItem.title}</h2><p>{activeItem.summary}</p></div>
          <nav className="case-panel-nav" aria-label="议案内容切换"><button type="button" className={casePanel === "stage" ? "active" : ""} onClick={() => setCasePanel("stage")}>当前阶段</button><button type="button" className={casePanel === "text" ? "active" : ""} onClick={() => setCasePanel("text")}>议案全文</button><button type="button" className={casePanel === "procedure" ? "active" : ""} onClick={() => setCasePanel("procedure")}>程序管理</button><button type="button" className={casePanel === "history" ? "active" : ""} onClick={() => setCasePanel("history")}>历史记录</button></nav>

          {casePanel === "procedure" && <section className="procedure-dossier">
            <header><div><p className="eyebrow">Admissibility · 受理与分流</p><h3>这项议案走哪条程序</h3></div><span>{activeItem.routing === "pending_review" ? "REVIEW NEEDED" : "ROUTE RECORDED"}</span></header>
            <div className="procedure-facts"><article><small>议案性质</small><strong>{CLASSIFICATION_META[activeItem.classification]}</strong></article><article><small>程序路线</small><strong>{ROUTING_META[activeItem.routing]}</strong></article><article><small>提案人年龄组</small><strong>{AGE_BAND_META[activeItem.proposerAgeBand]}</strong></article><article><small>回避请求 / 期限</small><strong>{activeItem.recusalRequested ? "已请求 12+ 回避" : "未请求回避"}{activeItem.deadline ? ` · ${activeItem.deadline}` : ""}</strong></article></div>
            {session.stageManager ? <div className="classification-control"><label><span>分类</span><select value={classificationTarget} onChange={(event) => setClassificationTarget(event.target.value as ParliamentClassification)}>{(Object.keys(CLASSIFICATION_META) as ParliamentClassification[]).filter((value) => value !== "foundational" || activeItem.classification === "foundational").map((value) => <option key={value} value={value}>{CLASSIFICATION_META[value]}</option>)}</select></label><label><span>路线</span><select value={routingTarget} onChange={(event) => setRoutingTarget(event.target.value as ParliamentRouting)}>{(Object.keys(ROUTING_META) as ParliamentRouting[]).map((value) => <option key={value} value={value}>{ROUTING_META[value]}</option>)}</select></label><label><span>年龄组</span><select value={ageBandTarget} onChange={(event) => setAgeBandTarget(event.target.value as ProposerAgeBand)}>{(Object.keys(AGE_BAND_META) as ProposerAgeBand[]).map((value) => <option key={value} value={value}>{AGE_BAND_META[value]}</option>)}</select></label><label><span>期限</span><input type="date" value={deadlineTarget} onChange={(event) => setDeadlineTarget(event.target.value)} /></label><label className="recusal-check"><input type="checkbox" checked={recusalTarget} onChange={(event) => setRecusalTarget(event.target.checked)} /><span>记录 12+ 回避请求</span></label><label className="classification-reason"><span>确认理由 *</span><input value={classificationReason} onChange={(event) => setClassificationReason(event.target.value)} maxLength={500} placeholder="例如：涉及国家基本结构，进入宪制双重审查" /></label><button type="button" onClick={classifyItem} disabled={busy}>确认分流</button></div> : <p className="procedure-note">任何公民都可在议场提出“分流异议”；只有你的个人最高领导人账号能正式确认或更改路线。</p>}
          </section>}
          {(casePanel === "text" || (casePanel === "stage" && activeItem.stage === "proposal")) && <article className="document-body focused-document"><header><span>议案正文 · TEXT</span>{session.stageManager && casePanel === "text" && <button type="button" onClick={() => setEditOpen(!editOpen)}>{editOpen ? "关闭编辑" : "编辑正式文稿"}</button>}</header><p>{activeItem.body}</p></article>}

          {casePanel === "text" && editOpen && session.stageManager && <form className="document-editor" onSubmit={updateItem}><label><span>标题</span><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={140} /></label><label><span>摘要</span><textarea value={editSummary} onChange={(event) => setEditSummary(event.target.value)} rows={3} maxLength={500} /></label><label><span>正文与条款</span><textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={10} maxLength={12_000} /></label><button className="primary" type="submit" disabled={busy}>保存新版本 <span>→</span></button></form>}

          {casePanel === "procedure" && <section className={`stage-manager ${session.stageManager ? "authorised" : "restricted"}`}>
            <header><div><p className="eyebrow">Stage Control · 阶段控制</p><h3>{session.stageManager ? "宇宙霸主专属程序权限" : "阶段切换由最高领导人管理"}</h3></div><span>{session.stageManager ? "AUTHORISED" : "VIEW ONLY"}</span></header>
            {session.stageManager ? <><div className="stage-prerequisites"><span className={activeItem.routing !== "pending_review" ? "ready" : "blocked"}>{activeItem.routing !== "pending_review" ? "✓ 分流已确认" : "! 分流待确认"}</span><span className={activeItem.pendingAmendmentCount === 0 ? "ready" : "blocked"}>{activeItem.pendingAmendmentCount === 0 ? "✓ 无待审修正" : `! ${activeItem.pendingAmendmentCount} 项修正待审`}</span><span className={activeItem.body.length > 12 ? "ready" : "blocked"}>{activeItem.body.length > 12 ? "✓ 正文已存在" : "! 正文未完成"}</span></div><div className="stage-control-row"><label><span>将议案置于</span><select value={stageTarget} onChange={(event) => setStageTarget(event.target.value as ParliamentStage)}>{(Object.keys(PARLIAMENT_STAGE_META) as ParliamentStage[]).map((stage) => <option key={stage} value={stage}>{PARLIAMENT_STAGE_META[stage].cn}</option>)}</select></label>{stageTarget === "resolved" && <label><span>结案结果</span><select value={finalOutcome} onChange={(event) => setFinalOutcome(event.target.value)}><option value="pending">按冻结版本票数自动判定</option><option value="passed">最高领导人裁决：通过</option><option value="rejected">最高领导人裁决：未通过</option></select></label>}<label className="stage-reason"><span>阶段变化理由 *</span><input value={stageReason} onChange={(event) => setStageReason(event.target.value)} maxLength={500} placeholder="理由会进入永久审计记录" /></label><button type="button" onClick={transitionStage} disabled={busy || stageReason.trim().length < 4 || (stageTarget === activeItem.stage && stageTarget !== "resolved")}>确认切换阶段</button></div></> : <p>{citizen.id === "amberina" ? <>你的内部身份是宇宙霸主，但当前浏览器尚未完成最高领导人身份验证。<a href="/signin-with-chatgpt?return_to=%2F">验证身份后启用阶段控制</a></> : "你可以评论、提出修正并在投票阶段表决，但不能改变议案所处阶段。"}</p>}
          </section>}

          {casePanel === "stage" && activeItem.stage === "proposal" && <section className="async-proposal-discussion" id="parliament-proposal-discussion">
            <header><div><p className="eyebrow">Asynchronous Deliberation · 异步沟通</p><h3>引用条文，在提案下继续讨论</h3></div><span>{comments.filter((comment) => comment.commentType !== "system").length} COMMENTS</span></header>
            <form className="comment-composer" onSubmit={addComment}>{replyTo && <div className="replying-to"><span>正在回复：{comments.find((comment) => comment.id === replyTo)?.body.slice(0, 60)}</span><button type="button" onClick={() => setReplyTo("")}>取消</button></div>}<label className="quote-field"><span>引用当前正文（可选，必须逐字一致）</span><textarea value={commentQuote} onChange={(event) => setCommentQuote(event.target.value)} maxLength={1_500} rows={2} placeholder="粘贴你正在评论的具体条文" /></label><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={4} placeholder={`以“${citizen.codename}”身份写下评论…`} required /><footer><small>提案阶段不进入实时议场；评论和引用可以异步完成。</small><button className="primary" type="submit" disabled={busy}>提交评论 <span>→</span></button></footer></form>
            {renderCommentThread()}
          </section>}

          {casePanel === "stage" && session.speakerManager && ["proposal", "deferred", "debate", "amendment"].includes(activeItem.stage) && <SpeakerManagement key={activeItem.id} meeting={meeting} stage={activeItem.stage} busy={busy} onAction={(payload, success) => sendAction({ ...payload, itemId: activeItem.id }, success)} />}

          {casePanel === "stage" && ["debate", "amendment"].includes(activeItem.stage) && <section id="parliament-debate-session" className={`meeting-workspace ${meeting?.speakerStatus === "elected" ? "chamber-ready" : ""} ${meeting?.debateStartedAt ? "session-live" : ""}`}>
            <header><div><p className="eyebrow">The Chamber · 实时议场</p><h3>{meeting?.debateStartedAt ? "面对面辩论正在进行" : "议长选举与议场就座"}</h3></div><span>{meeting?.debateStartedAt ? "CHAMBER LIVE" : "BEFORE DEBATE"}</span></header>

            {(!meeting || meeting.speakerStatus === "not_configured") && <div className="speaker-election-empty"><p>本次议场尚未开放议长选举。三位委员可以在议长管理中开放选举，或直接指定本次会议议长。原有讨论和正式发言会保留。</p></div>}

            {meeting?.speakerStatus === "open" && <section className="speaker-election" id="parliament-speaker-election">
              <header><div><small>SPEAKER ELECTION · 实时公开</small><strong>截止 {new Date(meeting.speakerElectionDeadline).toLocaleString("zh-CN")}</strong></div><button type="button" onClick={standForSpeaker} disabled={busy || mySpeakerCandidacy}>{mySpeakerCandidacy ? "你已参选" : "参选本次议长"}</button></header>
              <div className="speaker-candidate-grid">{speakerCandidates.length ? speakerCandidates.map((candidate) => { const candidateCitizen = citizenFor(candidate.citizenId); const candidateVotes = speakerVotes.filter((vote) => vote.candidateCitizenId === candidate.citizenId); return <article key={candidate.id} className={mySpeakerVote === candidate.citizenId ? "selected" : ""}><div>{candidateCitizen && {renderOfficialMark(candidateCitizen)}}<span><small>CANDIDATE</small><strong>{candidateCitizen?.username ?? candidate.citizenId}</strong></span><b>{candidateVotes.length}</b></div>{renderMarks(candidateVotes.map((vote) => vote.voterCitizenId), "等待第一票")}<button type="button" onClick={() => castSpeakerVote(candidate.citizenId)} disabled={busy}>{mySpeakerVote === candidate.citizenId ? "已投给此人" : "公开投票"}</button></article>; }) : <p className="docket-empty">暂时还没有人参选本次会议议长。</p>}</div>
            </section>}

            {meeting?.speakerStatus === "tie_pending" && <section className="speaker-tie"><span>{tiedSpeakerCandidates.length ? "议长选举平票" : "本次选举无人参选"}</span><h3>{tiedSpeakerCandidates.length ? "等待委员裁决" : "等待重新开放选举或直接指定议长"}</h3><p>原始票数与投票者保持公开，不会被裁决覆盖。</p>{session.speakerManager && tiedSpeakerCandidates.length > 0 && <div>{tiedSpeakerCandidates.map((candidateId) => <button type="button" key={candidateId} onClick={() => resolveSpeakerTie(candidateId)} disabled={busy}>裁决由 {citizenFor(candidateId)?.username ?? candidateId} 担任议长</button>)}</div>}</section>}

            {meeting?.speakerStatus === "elected" && <>
              <div className={`schicksal-chamber ${meeting.debateStartedAt ? "live" : "seating"}`}>
                <section className="chamber-side proposal-side"><header><small>PROPOSING BENCH</small><strong>提案方</strong></header><div>{[1,2,3,4].map((index) => renderSeat("proposal", index))}</div></section>
                <section className="chamber-centre"><article><small>本次会议议长 · SPEAKER</small>{electedSpeaker && {renderOfficialMark(electedSpeaker)}}<strong>{electedSpeaker?.username ?? meeting.speakerCitizenId}</strong><span>{meeting.debateStartedAt ? "议长权限已生效" : "等待成员就座"}</span></article><div className="dispatch-box"><small>ORDER PAPER</small><b>{activeItem.serialCode}</b><span>{meeting.debateStartedAt ? `当前发言：${currentFloorCitizen?.username ?? "等待议长点名"}` : "席位将在开会时锁定"}</span></div></section>
                <section className="chamber-side question-side"><header><small>QUESTIONING BENCH</small><strong>质询方</strong></header><div>{[1,2,3,4].map((index) => renderSeat("question", index))}</div></section>
              </div>
              {!meeting.debateStartedAt && <div className="seating-status"><span>{session.meetingSpeaker ? "你是本次会议议长；确认成员就座后即可宣布开会。" : meeting.speakerCitizenId === citizen.id ? "你已经当选本次会议议长。" : mySeat ? `你已选择${mySeat.side === "proposal" ? "提案方" : "质询方"}第 ${mySeat.seatIndex} 席。` : "请选择提案方或质询方的一个空席。"}</span>{session.meetingSpeaker && <button type="button" onClick={startDebateSession} disabled={busy}>宣布开会并锁定席位</button>}</div>}

              {meeting.debateStartedAt && <section className="live-floor">
                <header><div><p className="eyebrow">Live Floor · 议场程序</p><h3>{currentFloorCitizen ? `${currentFloorCitizen.username} 正在发言` : "等待议长准许发言"}</h3></div><span>{session.meetingSpeaker ? "SPEAKER CONTROL" : "MEMBER ACTIONS"}</span></header>
                {!session.meetingSpeaker && <><div className="floor-request-actions"><button type="button" onClick={() => sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "reaction", body: "说得好！" }, "“说得好！”已经进入议场记录。")}>说得好！<small>HEAR, HEAR</small></button><button type="button" onClick={() => requestFloor("speech")}>请求发言<small>TAKE THE FLOOR</small></button><button type="button" onClick={() => requestFloor("give_way")}>请求插话<small>GIVE WAY</small></button><button type="button" onClick={() => requestFloor("point_order")}>程序问题<small>POINT OF ORDER</small></button></div><label className="floor-request-note"><span>给议长的简短说明（可选）</span><input value={floorRequestBody} onChange={(event) => setFloorRequestBody(event.target.value)} maxLength={500} placeholder="例如：我想回应第二条" /></label></>}
                {session.meetingSpeaker && <div className="speaker-console"><h4>待处理请求</h4>{floorRequests.filter((request) => request.status === "pending").length ? floorRequests.filter((request) => request.status === "pending").map((request) => <article key={request.id}><div>{citizenFor(request.citizenId) && {renderOfficialMark(citizenFor(request.citizenId)!)}}<span><strong>{citizenFor(request.citizenId)?.username ?? request.citizenId}</strong><small>{request.requestType === "speech" ? "请求发言" : request.requestType === "give_way" ? "请求插话" : "程序问题"}{request.body ? ` · ${request.body}` : ""}</small></span></div><footer><button type="button" onClick={() => decideFloorRequest(request.id, "rejected")}>拒绝</button><button type="button" onClick={() => decideFloorRequest(request.id, "accepted")}>接受</button></footer></article>) : <p>当前没有等待处理的议场请求。</p>}</div>}
                {meeting.currentFloorCitizenId === citizen.id && <form className="comment-composer floor-speech-composer" onSubmit={addFloorSpeech}><header><span>ON THE FLOOR</span><strong>你已获得正式发言权</strong></header><label className="quote-field"><span>引用当前正文（可选）</span><textarea value={commentQuote} onChange={(event) => setCommentQuote(event.target.value)} maxLength={1_500} rows={2} /></label><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={4} placeholder="写下你的正式发言…" required /><footer><small>提交后进入本次会议正式记录。</small><button className="primary" type="submit" disabled={busy}>发表正式发言 <span>→</span></button></footer></form>}
                <div className="chamber-record"><button type="button" aria-expanded={liveRecordOpen} onClick={() => setLiveRecordOpen(!liveRecordOpen)}><span>会议发言记录</span><small>{comments.filter((comment) => comment.commentType !== "system").length} 条 · {liveRecordOpen ? "收起" : "展开"}</small></button>{liveRecordOpen && renderCommentThread()}</div>
              </section>}
            </>}
          </section>}

          {casePanel === "stage" && activeItem.stage === "amendment" && meeting?.debateStartedAt && <section className="amendment-center">
            <header><div><p className="eyebrow">Amendment Centre · 修正中心</p><h3>议场保留在场，逐字提出正式修正</h3></div><button type="button" onClick={() => setAmendmentOpen(!amendmentOpen)}>{amendmentOpen ? "关闭" : "提出正式修正案"}</button></header>
            {amendmentOpen && <form className="amendment-form" onSubmit={submitAmendment}><label><span>当前正文中的原文 *</span><textarea value={amendmentQuote} onChange={(event) => setAmendmentQuote(event.target.value)} rows={3} maxLength={2_000} placeholder="逐字粘贴你想修改的一段当前正文" required /></label><label><span>建议替换为 *</span><textarea value={amendmentText} onChange={(event) => setAmendmentText(event.target.value)} rows={3} maxLength={4_000} placeholder="写出完整的新文本" required /></label><label><span>修正理由 *</span><textarea value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} rows={2} maxLength={1_000} placeholder="为什么这样修改？" required /></label><footer><small>系统会验证原文来自当前版本；接受后自动生成新版本。</small><button className="primary" type="submit" disabled={busy}>提交修正案 <span>→</span></button></footer></form>}
            <div className="amendment-list">{amendments.length ? amendments.map((amendment) => { const author = citizenFor(amendment.citizenId); return <article key={amendment.id} className={amendment.status}><header><div><strong>{author?.username ?? amendment.citizenId}</strong><time>{new Date(amendment.createdAt).toLocaleDateString("zh-CN")}</time></div><span>{amendment.status === "pending" ? "等待决定" : amendment.status === "accepted" ? "已接受" : "已否决"}</span></header><div className="amendment-diff"><blockquote><small>删除 / 原文</small><del>{amendment.targetQuote}</del></blockquote><blockquote><small>新增 / 建议</small><ins>{amendment.proposedText}</ins></blockquote></div><p><b>理由</b>{amendment.reason}</p>{session.stageManager && amendment.status === "pending" && <footer><button type="button" onClick={() => decideAmendment(amendment.id, "rejected")} disabled={busy}>否决并留档</button><button type="button" onClick={() => decideAmendment(amendment.id, "accepted")} disabled={busy}>接受并生成新版本</button></footer>}</article>; }) : <div className="docket-empty">暂无正式修正案。</div>}</div>
          </section>}

          {casePanel === "stage" && activeItem.stage === "voting" && <section className="division-public" id="parliament-vote-actions">
            <header><div><p className="eyebrow">Division · 正式表决</p><h3>选择后，个人标志实时公开</h3></div><span>FROZEN TEXT · v{activeItem.votingVersion}</span></header>
            <div className="division-public-grid">
              <article className={myVote === "support" ? "chosen support" : ""}><header><small>AYE</small><strong>赞成 · {support}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "support").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("support")} disabled={busy}>投赞成票</button></article>
              <article className={myVote === "oppose" ? "chosen oppose" : ""}><header><small>NO</small><strong>反对 · {oppose}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "oppose").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("oppose")} disabled={busy}>投反对票</button></article>
              <article className={myVote === "abstain" ? "chosen abstain" : ""}><header><small>ABSTAIN</small><strong>弃权 · {abstain}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "abstain").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("abstain")} disabled={busy}>投弃权票</button></article>
            </div>
            <footer><strong>{resultText}</strong><span>{myVote ? "投票开放期间可以改票，个人标志会移动到新选项。" : "每个账号一票；所有投票者与当前票数实时公开。"}</span><small>平票时不改写原票数，交由最高领导人另行裁决。</small></footer>
          </section>}

          {casePanel === "stage" && activeItem.stage === "resolved" && <section className="result-proclamation">
            <header><div><p className="eyebrow">Certified Result · 正式结果</p><h3>{activeItem.outcome === "passed" ? "议案已经通过" : activeItem.outcome === "rejected" ? "议案未获通过" : "等待最高领导人裁决"}</h3></div><span>{activeItem.outcome.toUpperCase()}</span></header>
            <div className="result-vote-record"><article><small>赞成</small><strong>{support}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "support").map((vote) => vote.citizenId))}</article><article><small>反对</small><strong>{oppose}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "oppose").map((vote) => vote.citizenId))}</article><article><small>弃权</small><strong>{abstain}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "abstain").map((vote) => vote.citizenId))}</article></div>
            <div className="result-feedback"><header><div><small>PUBLIC RESPONSE · 结果态度</small><strong>不影响正式法律效力</strong></div><div><button type="button" className={myResultReaction === "like" ? "active" : ""} onClick={() => setResultReaction("like")}>赞 · {likeReactions.length}</button><button type="button" className={myResultReaction === "dislike" ? "active" : ""} onClick={() => setResultReaction("dislike")}>踩 · {dislikeReactions.length}</button></div></header><div><section><small>点赞</small>{renderMarks(likeReactions.map((reaction) => reaction.citizenId))}</section><section><small>点踩</small>{renderMarks(dislikeReactions.map((reaction) => reaction.citizenId))}</section></div></div>
            <form className="comment-composer result-comment-composer" onSubmit={addResultComment}>{replyTo && <div className="replying-to"><span>正在回复：{comments.find((comment) => comment.id === replyTo)?.body.slice(0, 60)}</span><button type="button" onClick={() => setReplyTo("")}>取消</button></div>}<textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={3} placeholder="在正式结果下发表评论…" required /><footer><small>评论属于结果公布后的公共讨论；如需改变结果，应另行提出复议案。</small><button className="primary" type="submit" disabled={busy}>发布结果评论 <span>→</span></button></footer></form>
            {renderCommentThread()}
          </section>}

          {casePanel === "stage" && activeItem.stage === "deferred" && <section className="deferred-notice"><small>DEFERRED PROPOSAL</small><h3>本案目前处于搁置状态</h3><p>正文、评论、修正和历史记录均继续保存；恢复审议时不会丢失原程序。</p></section>}

          {casePanel === "history" && <section className="audit-log"><header><div><p className="eyebrow">Audit Trail · 程序审计</p><h3>不可静默改写的议事历史</h3></div><span>{auditEvents.length} EVENTS</span></header><div>{auditEvents.length ? auditEvents.map((event) => <article key={event.id}><i /><section><strong>{event.description}</strong><p>{citizenFor(event.actorCitizenId)?.username ?? event.actorCitizenId} · {event.eventType}</p></section><time>{new Date(event.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></article>) : <p className="docket-empty">旧议案尚无结构化审计事件；新的提交、分流、修正和阶段变化都会写入这里。</p>}</div></section>}
        </>}
      </section>}
    </section>
    <p className={`parliament-status ${status ? "visible" : ""}`} role="status">{status || "议会系统在线：提案、评论、阶段与选票均会保存。"}</p>
  </>;
}
