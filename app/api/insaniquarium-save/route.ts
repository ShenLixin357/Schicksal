import { env } from "cloudflare:workers";
import { currentMember, sameOrigin } from "../../member-session";
import { MAX_REQUEST_BYTES, validateOriginalSave } from "../../games/aquarium/save-format";

const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
type Row = { stateJson: string; revision: number; updatedAt: string };

async function authenticate(request: Request): Promise<string | Response> {
  const member = await currentMember(request);
  if (!member) return Response.json({ error: "请先登录天命成员身份。" }, { status: 401, headers });
  if (request.headers.get("x-schicksal-member") !== member)
    return Response.json({ error: "成员身份已变更，请重新进入游戏。" }, { status: 409, headers });
  return member;
}

export async function GET(request: Request) {
  try {
    const member = await authenticate(request);
    if (member instanceof Response) return member;
    const row = await env.DB.prepare("SELECT state_json AS stateJson, revision, updated_at AS updatedAt FROM member_insaniquarium_saves WHERE citizen_id=?")
      .bind(member).first<Row>();
    return Response.json(row ? { state: JSON.parse(row.stateJson), revision: row.revision, updatedAt: row.updatedAt } : { state: null, revision: 0 }, { headers });
  } catch {
    return Response.json({ error: "暂时无法读取原版存档，请稍后重试。" }, { status: 503, headers });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请从天命网站内保存。" }, { status: 403, headers });
  try {
    const member = await authenticate(request);
    if (member instanceof Response) return member;
    // Enforce the limit while reading, including chunked bodies without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "缺少存档。" }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return Response.json({ error: "存档过大，请先导出备份。" }, { status: 413, headers });
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
    let body: { revision?: unknown; state?: unknown };
    try { body = JSON.parse(new TextDecoder().decode(raw)); }
    catch { return Response.json({ error: "存档格式不正确。" }, { status: 400, headers }); }
    if (!body || !Number.isSafeInteger(body.revision) || Number(body.revision) < 0 || !validateOriginalSave(body.state))
      return Response.json({ error: "原版存档数据无效。" }, { status: 400, headers });
    const revision = Number(body.revision);
    const serialized = JSON.stringify(body.state);
    const updatedAt = new Date().toISOString();
    const statement = revision === 0
      ? env.DB.prepare("INSERT INTO member_insaniquarium_saves(citizen_id,state_json,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(citizen_id) DO NOTHING")
          .bind(member, serialized, updatedAt)
      : env.DB.prepare("UPDATE member_insaniquarium_saves SET state_json=?, revision=revision+1, updated_at=? WHERE citizen_id=? AND revision=?")
          .bind(serialized, updatedAt, member, revision);
    const result = await statement.run();
    if (!result.meta.changes)
      return Response.json({ error: "另一台设备已保存新进度，已停止上传。请先导出本机备份，再重新读取云端。", conflict: true }, { status: 409, headers });
    return Response.json({ revision: revision + 1, updatedAt }, { headers });
  } catch {
    return Response.json({ error: "上传失败，请保留本机存档并稍后重试。" }, { status: 503, headers });
  }
}
