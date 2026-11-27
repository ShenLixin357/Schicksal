import {requireMember} from '../../../../server/auth/member.ts';
import {currentSession} from '../../../member-session.ts';
import {apiFailure} from '../../../../server/http.ts';
import {requireEnabled,accessSettings} from '../../../../server/ministry/store.ts';
import {FEATURES,decide} from '../../../../server/ministry/policy.ts';
export async function GET(request:Request){try{const id=await requireMember(request);requireEnabled();const s=await currentSession(request);const features=await Promise.all(FEATURES.map(async f=>{const p=await accessSettings(id,f.id);return {id:f.id,...p,read:decide(p.mode,p.policy,'GET',s?.accountMode==='technology'),write:decide(p.mode,p.policy,'POST',s?.accountMode==='technology')};}));return Response.json({features},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return apiFailure(e,'访问权限暂时不可用。');}}
