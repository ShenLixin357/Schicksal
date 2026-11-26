/** Parliament classification policy.
 * Pure rules only: no Request, cookie, D1, Worker binding or React imports.
 * Keep routing decisions stable when moving API handling into services.
 */
export function suggestedRouting(classification: string, ageBand: string, recusalRequested: boolean) {
  if (classification === "constitutional") return "dual_review";
  if (classification === "pending_review" || ageBand === "unknown") return "pending_review";
  if (classification === "youth_autonomy" || (ageBand !== "12_plus" && recusalRequested)) return "youth_electorate";
  if (ageBand === "12_plus") return "legislative_committee";
  return "parliament";
}
