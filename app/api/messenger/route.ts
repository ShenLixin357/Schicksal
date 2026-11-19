import { env } from "cloudflare:workers";
import { currentMember } from "../../member-session";
import { sameOrigin } from "../../member-session-core";
import { conversationPartner, validPeer, validateMessageBody } from "../../messenger/message-policy";

const headers = { "Cache-Control": "private, no-store" };
type Message = { id: string; senderId: string; recipientId: string; body: string; createdAt: string };

export async function GET(request: Request) {
  try {
    const selfId = await currentMember(request);
    if (!selfId || !validPeer(selfId)) return Response.json({ error: "请先登录。" }, { status: 401, headers });
    const url = new URL(request.url);
    if (url.searchParams.get("list") === "1") {
      // Only the authenticated citizen's inbox/outbox, never another user's messages.
      const rows = await env.DB.prepare(`SELECT id, sender_id AS senderId, recipient_id AS recipientId,
        body, created_at AS createdAt FROM member_direct_messages
        WHERE sender_id = ? OR recipient_id = ?
        ORDER BY seq DESC LIMIT 500`).bind(selfId, selfId).all<Message>();
      const lastByPeer: Record<string, Message> = {};
      for (const message of rows.results) {
        const peer = conversationPartner(selfId, message);
        if (peer && !lastByPeer[peer]) lastByPeer[peer] = message;
      }
      return Response.json({ recent: lastByPeer }, { headers });
    }
    const peer = url.searchParams.get("peer");
    if (!validPeer(peer)) return Response.json({ error: "无效的通讯对象。" }, { status: 400, headers });
    const rows = await env.DB.prepare(`SELECT id, sender_id AS senderId, recipient_id AS recipientId,
      body, created_at AS createdAt FROM member_direct_messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY seq DESC LIMIT 100`).bind(selfId, peer, peer, selfId).all<Message>();
    return Response.json({ messages: rows.results.reverse() }, { headers });
  } catch {
    return Response.json({ error: "通讯记录暂时无法读取。" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403, headers });
  try {
    const selfId = await currentMember(request);
    if (!selfId || !validPeer(selfId)) return Response.json({ error: "请先登录。" }, { status: 401, headers });
    const raw = await request.text();
    if (raw.length > 2500) return Response.json({ error: "消息过长。" }, { status: 400, headers });
    let data: { peer?: unknown; body?: unknown };
    try { data = JSON.parse(raw) as typeof data; }
    catch { return Response.json({ error: "消息格式不正确。" }, { status: 400, headers }); }
    if (!validPeer(data?.peer)) return Response.json({ error: "无效的通讯对象。" }, { status: 400, headers });
    const body = validateMessageBody(data?.body);
    if (!body) return Response.json({ error: "请输入 1–500 字的消息。" }, { status: 400, headers });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO member_direct_messages
      (id, sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, selfId, data.peer, body, now).run();
    return Response.json({ message: { id, senderId: selfId, recipientId: data.peer, body, createdAt: now } }, { status: 201, headers });
  } catch {
    return Response.json({ error: "发送暂时失败，请重试。" }, { status: 503, headers });
  }
}
