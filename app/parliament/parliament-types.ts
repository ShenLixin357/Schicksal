/** Parliament wire contracts used exclusively by the Parliament domain.
 * Extracted byte-for-byte from the approved UI baseline; service/API must
 * remain authoritative about roles, voting, stages, quorum and audit events.
 */
export type ParliamentStage = "proposal" | "debate" | "amendment" | "voting" | "resolved" | "deferred";
export type ParliamentClassification = "ordinary" | "constitutional" | "administrative_review" | "external_agreement" | "youth_autonomy" | "pending_review" | "foundational";
export type ParliamentRouting = "parliament" | "legislative_committee" | "dual_review" | "youth_electorate" | "pending_review";
export type ProposerAgeBand = "under_8" | "8_to_11" | "12_plus" | "unknown";
export type ParliamentItem = {
  id: string;
  serialCode: string;
  kind: "proposal" | "bill" | "referendum";
  title: string;
  summary: string;
  body: string;
  stage: ParliamentStage;
  outcome: "pending" | "passed" | "rejected" | "leader_decision_required" | "withdrawn";
  classification: ParliamentClassification;
  routing: ParliamentRouting;
  proposerAgeBand: ProposerAgeBand;
  recusalRequested: number;
  stageReason: string;
  votingVersion: number | null;
  deadline: string;
  createdByCitizenId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  voteCount: number;
  pendingAmendmentCount: number;
};
export type ParliamentComment = { id: string; itemId: string; citizenId: string; commentType: string; body: string; quoteText: string; parentId: string; createdAt: string };
export type ParliamentVote = { id: string; itemId: string; citizenId: string; choice: "support" | "oppose" | "abstain"; documentVersion: number; createdAt: string; updatedAt: string };
export type ParliamentAmendment = { id: string; itemId: string; citizenId: string; targetQuote: string; proposedText: string; reason: string; status: "pending" | "accepted" | "rejected"; createdAt: string; decidedAt: string; decidedByCitizenId: string };
export type ParliamentAuditEvent = { id: string; itemId: string; actorCitizenId: string; eventType: string; description: string; metadataJson: string; createdAt: string };
export type ParliamentMeeting = { itemId: string; speakerElectionDeadline: string; speakerStatus: "not_configured" | "open" | "elected" | "tie_pending"; speakerCitizenId: string; speakerDecidedByCitizenId: string; tiedCandidateIdsJson: string; currentFloorCitizenId: string; debateStartedAt: string; seatsLocked: number; updatedAt: string };
export type ParliamentSpeakerCandidate = { id: string; itemId: string; citizenId: string; createdAt: string };
export type ParliamentSpeakerVote = { id: string; itemId: string; voterCitizenId: string; candidateCitizenId: string; createdAt: string; updatedAt: string };
export type ParliamentSeat = { id: string; itemId: string; citizenId: string; side: "proposal" | "question"; seatIndex: number; createdAt: string; updatedAt: string };
export type ParliamentFloorRequest = { id: string; itemId: string; citizenId: string; requestType: "speech" | "give_way" | "point_order"; body: string; status: "pending" | "accepted" | "rejected"; createdAt: string; decidedAt: string; decidedByCitizenId: string };
export type ParliamentResultReaction = { id: string; itemId: string; citizenId: string; reaction: "like" | "dislike"; createdAt: string; updatedAt: string };
export type ParliamentSession = { citizenId: string; stageManager: boolean; speakerManager: boolean; meetingSpeaker: boolean; platformAuthenticated: boolean };
export type ParliamentBoard = { items?: ParliamentItem[]; activeItem?: ParliamentItem | null; comments?: ParliamentComment[]; votes?: ParliamentVote[]; amendments?: ParliamentAmendment[]; auditEvents?: ParliamentAuditEvent[]; meeting?: ParliamentMeeting | null; speakerCandidates?: ParliamentSpeakerCandidate[]; speakerVotes?: ParliamentSpeakerVote[]; seats?: ParliamentSeat[]; floorRequests?: ParliamentFloorRequest[]; resultReactions?: ParliamentResultReaction[]; session?: ParliamentSession; error?: string };
