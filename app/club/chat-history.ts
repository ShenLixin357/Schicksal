export type ChatCursor = { createdAt: string; id: string };

// D1's CURRENT_TIMESTAMP is UTC, even though SQLite omits the timezone suffix.
export function chatDate(value: string): Date {
  const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? value.replace(" ", "T") + "Z" : value;
  return new Date(timestamp);
}

export function chatTimestamp(value: string): string {
  const date = chatDate(value);
  if (!Number.isFinite(date.getTime())) return "时间未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(date);
}

export function readHistoryQuery(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const beforeAt = params.get("beforeAt"), beforeId = params.get("beforeId");
  if ((beforeAt === null) !== (beforeId === null) || (beforeAt !== null &&
    (beforeAt.length > 40 || !Number.isFinite(chatDate(beforeAt).getTime()) || !beforeId || beforeId.length > 80))) {
    throw new Error("聊天记录的翻页位置无效，请重新打开卷轴。");
  }
  return { query, cursor: beforeAt && beforeId ? { createdAt: beforeAt, id: beforeId } : null, pageSize: 100 };
}

export function mergeChatMessages<T extends { id: string; createdAt: string }>(previous: T[], incoming: T[]): T[] {
  const messages = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => chatDate(a.createdAt).getTime() - chatDate(b.createdAt).getTime() || a.id.localeCompare(b.id));
}
