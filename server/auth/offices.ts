import { env } from "cloudflare:workers";
import { ATLAS_OFFICES, type Office } from "../../app/identity/office-registry.ts";

/** The one server-side source of live appointments, shared by authorization
 * and display snapshots. Election/transition code will update this table
 * transactionally; the public registry is metadata and a historical baseline.
 */
type HolderRow = { officeId: string; citizenId: string; termId: string };
export async function readCurrentOffices(): Promise<Office[]> {
  const result = await env.DB.prepare(
    "SELECT office_id AS officeId, citizen_id AS citizenId, term_id AS termId FROM current_office_holders ORDER BY office_id,citizen_id"
  ).all<HolderRow>();
  const rows = result.results ?? [];
  const ids = new Set(ATLAS_OFFICES.map(office => office.id));
  if (rows.some(row => !ids.has(row.officeId))) throw new Error("Unknown current office");
  return ATLAS_OFFICES.map(office => ({
    ...office,
    holderIds: rows.filter(row => row.officeId === office.id).map(row => row.citizenId),
    confirmed: rows.some(row => row.officeId === office.id),
  }));
}
export async function currentTechnologyMinisterId(): Promise<string | null> {
  const result = await env.DB.prepare(
    "SELECT citizen_id AS citizenId FROM current_office_holders WHERE office_id = 'technology' LIMIT 2"
  ).all<{ citizenId: string }>();
  const rows = result.results ?? [];
  // The office must have exactly one incumbent; ambiguous/empty election
  // transfers fail closed rather than granting privileges to two people.
  return rows.length === 1 ? rows[0].citizenId : null;
}
export async function isIncumbentTechnologyMinister(citizenId: string): Promise<boolean> {
  return Boolean(citizenId) && (await currentTechnologyMinisterId()) === citizenId;
}
