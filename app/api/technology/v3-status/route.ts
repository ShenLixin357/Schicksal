import { env } from "cloudflare:workers";
import { requireTechnologyMinister } from "../../../../server/auth/member.ts";
import { readJson } from "../../../../server/http.ts";
import { cookieToken,digest } from "../../../member-session-core.ts";
import { handle } from "../../../../server/imperial-v3/operations.mjs";

const tokenHash=async(request:Request)=>{const token=cookieToken(request);return token?digest(token):null;};
const dispatch=(request:Request)=>handle(request,{db:env.DB,config:env,requireMinister:requireTechnologyMinister,readBody:readJson,tokenHash});
export const GET=dispatch;
export const POST=dispatch;
