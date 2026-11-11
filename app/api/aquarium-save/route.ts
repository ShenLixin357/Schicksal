import { env } from "cloudflare:workers";
import { currentMember, sameOrigin } from "../../member-session";

const headers = { "Cache-Control": "no-store" };
const maxBytes = 48_000;
type SaveRow = { stateJson: string; revision: number; updatedAt: string };

function validState(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return state.version === 1 &&
    Number.isSafeInteger(state.coins) && Number(state.coins) >= 0 && Number(state.coins) <= 1_000_000_000 &&
    Array.isArray(state.fish) && state.fish.length <= 60 &&
    state.fish.every((fish: unknown) => {
      if (!fish || typeof fish !== "object" || Array.isArray(fish)) return false;
      const f = fish as Record<string, unknown>;
      return typeof f.id === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(f.id) &&
        Number.isFinite(f.hunger) && Number(f.hunger) >= 0 && Number(f.hunger) <= 100 &&
        Number.isFinite(f.age) && Number(f.age) >= 0 && Number(f.age) <= 1_000_000;
    });
}

async function authenticate(request: Request) {
  const member = await currentMember(request);
  if (!member) return null;
  return request.headers.get("x-schicksal-member") === member ? member : null;
}

export async function GET(request: Request) {
  try {
    const member = await authenticate(request);
    if (!member) return Response.json({ error: "请重新登录当前成员身份。" }, { status: 401, headers });
    const row = await env.DB.prepare(
      "SELECT state_json AS stateJson, revision, updated_at AS updatedAt FROM member_aquarium_saves WHERE citizen_id=? AND slot_id='main'"
    ).bind(member).first<SaveRow>();
    return Response.json(row ? { state: JSON.parse(row.stateJson), revision: row.revision, updatedAt: row.updatedAt } : { state: null, revision: 0 }, { headers });
  } catch { return Response.json({ error: "暂时无法读取云端存档。" }, { status: 503, headers }); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403, headers });
  try {
    const member = await authenticate(request);
    if (!member) return Response.json({ error: "请重新登录当前成员身份。" }, { status: 401, headers });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > maxBytes) return Response.json({ error: "存档过大。" }, { status: 413, headers });
    let payload: { revision?: unknown; state?: unknown };
    try { payload = JSON.parse(raw); } catch { return Response.json({ error: "存档格式不正确。" }, { status: 400, headers }); }
    if (!payload || !Number.isSafeInteger(payload.revision) || Number(payload.revision) < 0 || !validState(payload.state)) {
      return Response.json({ error: "存档数据无效。" }, { status: 400, headers });
    }
    const serialized = JSON.stringify(payload.state);
    const revision = Number(payload.revision);
    const updatedAt = new Date().toISOString();
    const result = await env.DB.prepare(
      `INSERT INTO member_aquarium_saves(citizen_id,slot_id,state_json,revision,updated_at)
      VALUES (?, 'main', ?, 1, ?)
      ON CONFLICT(citizen_id,slot_id) DO UPDATE SET
        state_json=excluded.state_json, revision=member_aquarium_saves.revision+1, updated_at=excluded.updated_at
      WHERE member_aquarium_saves.revision=?`
    ).bind(member, serialized, updatedAt, revision).run();
    if (!result.meta.changes) return Response.json({ error: "另一台设备已更新存档。请重新读取云端进度，避免覆盖。", conflict: true }, { status: 409, headers });
    return Response.json({ revision: revision + 1, updatedAt }, { headers });
  } catch { return Response.json({ error: "云端保存失败，本机进度未上传。" }, { status: 503, headers }); }
}
