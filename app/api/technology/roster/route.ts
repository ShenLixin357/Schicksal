import {requireMember} from '../../../../server/auth/member.ts';
import {apiFailure} from '../../../../server/http.ts';
import {requireEnabled,publicRoster} from '../../../../server/ministry/store.ts';
/** Member-visible supplemental public profile fields only; no notes, accounts or permissions. */
export async function GET(request:Request){try{await requireMember(request);requireEnabled();return Response.json({members:await publicRoster()},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return apiFailure(e,'公民档案暂时不可用。');}}
