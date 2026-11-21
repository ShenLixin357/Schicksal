import { env } from "cloudflare:workers";
import { requireTechnologyMinister } from "../../../../server/auth/member.ts";
import { ApiError, readJson } from "../../../../server/http.ts";
import { sameOrigin, verifyMemberPassword } from "../../../member-session.ts";
import { hashMemberPassword } from "../../../member-passwords.ts";

const headers = { "Cache-Control": "private, no-store" };
const response = (data:object,status=200) => Response.json(data,{status,headers});

/** Allows the incumbent to initialize/rotate the independent minister direct
 * password after entering the ministry dashboard by an authenticated personal
 * login and long hold. Never returns, logs or checks in the password itself.
 */
export async function GET(request: Request) {
  try {
    await requireTechnologyMinister(request);
    const record=await env.DB.prepare(
      "SELECT updated_at AS updatedAt FROM technology_direct_credentials WHERE office_id='technology'"
    ).first<{updatedAt:number}>();
    return response({configured:Boolean(record),updatedAt:record?.updatedAt??null});
  } catch(error) {
    return response({error:error instanceof ApiError?error.message:"无法读取部长专用密码状态。"},
      error instanceof ApiError?error.status:503);
  }
}

export async function PUT(request: Request) {
  if(!sameOrigin(request)) return response({error:"请从本站操作。"},403);
  try {
    const incumbent=await requireTechnologyMinister(request);
    const input=await readJson<{personalPassword?:unknown;newPassword?:unknown}>(request,4096);
    const personal=typeof input.personalPassword==="string"?input.personalPassword:"";
    const special=typeof input.newPassword==="string"?input.newPassword:"";
    if(special.length<12||special.length>128) return response({error:"部长专用密码应为 12–128 个字符。"},400);
    if(!personal||!await verifyMemberPassword(incumbent,personal))
      return response({error:"请使用当前个人账号密码确认此敏感设置。"},401);
    if(await verifyMemberPassword(incumbent,special))
      return response({error:"部长专用密码不能与个人账号密码相同。"},400);
    const hash=await hashMemberPassword(special),now=Date.now();
    const updates=await env.DB.batch([
      env.DB.prepare(`INSERT INTO technology_direct_credentials
        (office_id,password_hash,password_salt,updated_at,updated_by)
        SELECT 'technology',?,?,?,? FROM current_office_holders
        WHERE office_id='technology' AND citizen_id=?
          AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1
        ON CONFLICT(office_id) DO UPDATE SET
          password_hash=excluded.password_hash,password_salt=excluded.password_salt,
          updated_at=excluded.updated_at,updated_by=excluded.updated_by`)
        .bind(hash.hash,hash.salt,now,incumbent,incumbent),
      env.DB.prepare("DELETE FROM member_sessions WHERE auth_source='ministry-direct'"),
    ]);
    if(!updates[0]?.meta?.changes) return response({error:"任职信息已变化，密码未修改。"},409);
    return response({ok:true,configured:true,updatedAt:now,directSessionsRevoked:true});
  } catch(error) {
    return response({error:error instanceof ApiError?error.message:"部长专用密码设置失败，请稍后重试。"},
      error instanceof ApiError?error.status:503);
  }
}
