import {env} from 'cloudflare:workers';
import {ApiError} from '../http.ts';
import {cookieToken,digest} from '../../app/member-session-core.ts';
import {requireTechnologyMinister} from '../auth/member.ts';
import {requireEnabled} from '../ministry/store.ts';
export const config=env as unknown as Record<string,unknown>;
export const operationsOn=()=>config.SCHICKSAL_OPERATIONS_ENABLED==='true';
export function gate(){requireEnabled();if(!operationsOn())throw new ApiError('扩展管理功能尚未启用',404);}
export const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function authority(r:Request,p:Record<string,unknown>){const actor=await requireTechnologyMinister(r);gate();const term=p.expectedTerm,reason=p.reason,token=cookieToken(r);if(typeof term!=='string'||!term||term.length>200||typeof reason!=='string'||!reason.trim()||reason.length>500||!token)throw new ApiError('需要当前任期与变更原因',400);const now=Date.now();return {actor,term,reason:reason.trim(),now,token:await digest(token)};}
// Only interpolate this fixed SQL fragment; values are bound parameters.
export const validAuthority=`o.office_id='technology' AND o.citizen_id=? AND o.term_id=? AND (SELECT COUNT(*) FROM current_office_holders WHERE office_id='technology')=1 AND EXISTS(SELECT 1 FROM member_sessions s WHERE s.token_hash=? AND s.citizen_id=? AND s.account_mode='technology' AND s.expires_at>? AND s.minister_grant_expires_at>?)`;
export const authArgs=(a:Awaited<ReturnType<typeof authority>>)=>[a.actor,a.term,a.token,a.actor,a.now,a.now];
