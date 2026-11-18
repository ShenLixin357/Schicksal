export type BriefingTarget = "home" | "parliament" | "archives" | "photos" | "club" | "games" | "referendum" | "profile" | "honors" | "calendar" | "market" | "citizens" | "emblem";

export type BriefingTask = {
  id: string;
  title: string;
  detail: string;
  deadline: string | null;
  deadlineKind?: "expected" | "deadline";
  createdAt?: string;
  category?: "proposal" | "speaker-election" | "speaker-vote" | "debate" | "parliament-vote" | "referendum";
  participation?: "required" | "available";
  focus?: "proposal" | "speaker" | "debate" | "vote";
  actionable: boolean;
  completed: boolean;
  target: BriefingTarget;
  targetId?: string;
};

export type BriefingMessage = {
  id: string;
  sender: string;
  preview: string;
  receivedAt: string;
  conversationId: string;
};

export type BriefingNews = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  target: BriefingTarget | null;
  targetId?: string;
};

// This is an existing, historically recorded event, not an invented live update.
// Future news must come from verified published events, not page render time.
export const foundingNews: readonly BriefingNews[] = [
  {
    id: "restoration-2026-08-15",
    title: "天命帝国正式复辟",
    summary: "2026 年 8 月 15 日，第一帝国复辟公投获得通过，帝国恢复运作。",
    category: "国家纪事",
    publishedAt: "2026-08-15T13:43:00+08:00",
    target: "archives",
  },
];

export const briefingDateTime = (date: string | null): number => {
  if (!date) return Number.POSITIVE_INFINITY;
  // YYYY-MM-DD is a calendar-day deadline in Schicksal's UTC+8 local time.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date + "T23:59:59.999+08:00" : date;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

export function briefingDeadlineInfo(date: string | null, now = Date.now()) {
  if (!date || !Number.isFinite(briefingDateTime(date))) return { label: "无指定日期", passed: false };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const label = day ? date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y: string, m: string, d: string) => y + "年" + Number(m) + "月" + Number(d) + "日") :
    new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Singapore" });
  return { label, passed: briefingDateTime(date) < now };
}


/**
 * UI countdowns are computed in real time, never written to D1 or inferred
 * from audit timestamps. The server still determines if an action is open.
 */
export function briefingCountdown(date: string | null, now: number): string {
  const target = briefingDateTime(date);
  if (!Number.isFinite(target)) return "—";
  if (target <= now) return "已到期";
  const seconds = Math.ceil((target - now) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return days > 0
    ? `${days}天 ${hours}小时 ${minutes}分`
    : hours > 0
      ? `${hours}小时 ${minutes}分 ${remainingSeconds}秒`
      : `${minutes}分 ${remainingSeconds}秒`;
}

// Ineligible, completed, or already-closed actions never appear as live tasks.
// The future authenticated task API remains authoritative for eligibility.
export function orderedBriefingTasks(tasks: readonly BriefingTask[]): BriefingTask[] {
  return tasks.filter((task) => task.actionable && !task.completed)
    .sort((a, b) => briefingDateTime(a.deadline) - briefingDateTime(b.deadline) || briefingDateTime(a.createdAt || null) - briefingDateTime(b.createdAt || null) || a.id.localeCompare(b.id));
}

export function latestUnreadMessages(messages: readonly BriefingMessage[]): BriefingMessage[] {
  return [...messages].sort((a, b) => briefingDateTime(b.receivedAt) - briefingDateTime(a.receivedAt)).slice(0, 2);
}

export function latestNews(news: readonly BriefingNews[]): BriefingNews[] {
  return [...news].sort((a, b) => briefingDateTime(b.publishedAt) - briefingDateTime(a.publishedAt));
}

// A per-login, non-authentication fingerprint is supplied only for a verified
// member session. This stores no password, session cookie, or session token.
export const BRIEFING_SEEN_SESSION_KEY = "schicksal:briefing-seen-session";

export function markBriefingViewed(storage: Pick<Storage, "getItem" | "setItem">, sessionKey: string): boolean {
  if (storage.getItem(BRIEFING_SEEN_SESSION_KEY) === sessionKey) return false;
  storage.setItem(BRIEFING_SEEN_SESSION_KEY, sessionKey);
  return true;
}
