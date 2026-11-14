import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const memberCredentials = sqliteTable("member_credentials", {
  citizenId: text("citizen_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  updatedAt: integer("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const memberSessions = sqliteTable("member_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  citizenId: text("citizen_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("member_sessions_expiry_idx").on(table.expiresAt)]);

export const memberLoginWindows = sqliteTable("member_login_windows", {
  windowKey: text("window_key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
});

export const loungeGameBests = sqliteTable("lounge_game_bests", {
  gameId: text("game_id").notNull(), boardId: text("board_id").notNull(), citizenId: text("citizen_id").notNull(),
  runId: text("run_id").notNull(), score: integer("score").notNull(), moves: integer("moves").notNull(),
  durationMs: integer("duration_ms").notNull(), rounds: integer("rounds").notNull(), maxTier: integer("max_tier").notNull(),
  rankPrimary: integer("rank_primary").notNull(), rankSecondary: integer("rank_secondary").notNull(), achievedAt: text("achieved_at").notNull(),
}, (table) => [uniqueIndex("lounge_game_best_member_unique").on(table.gameId, table.boardId, table.citizenId), index("lounge_game_best_board_idx").on(table.gameId, table.boardId, table.rankPrimary, table.rankSecondary)]);

export const archivePhotos = sqliteTable(
  "archive_photos",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    era: text("era").notNull().default(""),
    capturedAt: text("captured_at").notNull().default(""),
    subjectsJson: text("subjects_json").notNull(),
    subjectKey: text("subject_key").notNull(),
    uploaderCitizenId: text("uploader_citizen_id").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("archive_photos_subject_key_idx").on(table.subjectKey),
    index("archive_photos_created_at_idx").on(table.createdAt),
  ],
);

export const parliamentItems = sqliteTable(
  "parliament_items",
  {
    id: text("id").primaryKey(),
    serialCode: text("serial_code").notNull().unique(),
    kind: text("kind").notNull().default("proposal"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    stage: text("stage").notNull().default("proposal"),
    outcome: text("outcome").notNull().default("pending"),
    classification: text("classification").notNull().default("pending_review"),
    routing: text("routing").notNull().default("pending_review"),
    proposerAgeBand: text("proposer_age_band").notNull().default("unknown"),
    recusalRequested: integer("recusal_requested").notNull().default(0),
    stageReason: text("stage_reason").notNull().default(""),
    votingVersion: integer("voting_version"),
    deadline: text("deadline").notNull().default(""),
    createdByCitizenId: text("created_by_citizen_id").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("parliament_items_stage_idx").on(table.stage),
    index("parliament_items_updated_at_idx").on(table.updatedAt),
  ],
);

export const parliamentComments = sqliteTable(
  "parliament_comments",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    commentType: text("comment_type").notNull().default("comment"),
    body: text("body").notNull(),
    quoteText: text("quote_text").notNull().default(""),
    parentId: text("parent_id").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("parliament_comments_item_idx").on(table.itemId),
    index("parliament_comments_created_at_idx").on(table.createdAt),
  ],
);

export const parliamentAmendments = sqliteTable(
  "parliament_amendments",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    targetQuote: text("target_quote").notNull(),
    proposedText: text("proposed_text").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    decidedAt: text("decided_at").notNull().default(""),
    decidedByCitizenId: text("decided_by_citizen_id").notNull().default(""),
  },
  (table) => [
    index("parliament_amendments_item_idx").on(table.itemId),
    index("parliament_amendments_status_idx").on(table.status),
  ],
);

export const parliamentAuditEvents = sqliteTable(
  "parliament_audit_events",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    actorCitizenId: text("actor_citizen_id").notNull(),
    eventType: text("event_type").notNull(),
    description: text("description").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("parliament_audit_item_idx").on(table.itemId),
    index("parliament_audit_created_at_idx").on(table.createdAt),
  ],
);

export const parliamentVotes = sqliteTable(
  "parliament_votes",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    choice: text("choice").notNull(),
    documentVersion: integer("document_version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("parliament_votes_item_citizen_unique").on(table.itemId, table.citizenId),
    index("parliament_votes_item_idx").on(table.itemId),
  ],
);

export const parliamentMeetingSessions = sqliteTable(
  "parliament_meeting_sessions",
  {
    itemId: text("item_id").primaryKey(),
    speakerElectionDeadline: text("speaker_election_deadline").notNull().default(""),
    speakerStatus: text("speaker_status").notNull().default("not_configured"),
    speakerCitizenId: text("speaker_citizen_id").notNull().default(""),
    speakerDecidedByCitizenId: text("speaker_decided_by_citizen_id").notNull().default(""),
    tiedCandidateIdsJson: text("tied_candidate_ids_json").notNull().default("[]"),
    currentFloorCitizenId: text("current_floor_citizen_id").notNull().default(""),
    debateStartedAt: text("debate_started_at").notNull().default(""),
    seatsLocked: integer("seats_locked").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("parliament_meeting_status_idx").on(table.speakerStatus)],
);

export const parliamentSpeakerCandidates = sqliteTable(
  "parliament_speaker_candidates",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("parliament_speaker_candidate_unique").on(table.itemId, table.citizenId),
    index("parliament_speaker_candidate_item_idx").on(table.itemId),
  ],
);

export const parliamentSpeakerVotes = sqliteTable(
  "parliament_speaker_votes",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    voterCitizenId: text("voter_citizen_id").notNull(),
    candidateCitizenId: text("candidate_citizen_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("parliament_speaker_vote_unique").on(table.itemId, table.voterCitizenId),
    index("parliament_speaker_vote_item_idx").on(table.itemId),
  ],
);

export const parliamentSeats = sqliteTable(
  "parliament_seats",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    side: text("side").notNull(),
    seatIndex: integer("seat_index").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("parliament_seat_citizen_unique").on(table.itemId, table.citizenId),
    uniqueIndex("parliament_seat_slot_unique").on(table.itemId, table.side, table.seatIndex),
    index("parliament_seat_item_idx").on(table.itemId),
  ],
);

export const parliamentFloorRequests = sqliteTable(
  "parliament_floor_requests",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    requestType: text("request_type").notNull(),
    body: text("body").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    decidedAt: text("decided_at").notNull().default(""),
    decidedByCitizenId: text("decided_by_citizen_id").notNull().default(""),
  },
  (table) => [
    index("parliament_floor_request_item_idx").on(table.itemId),
    index("parliament_floor_request_status_idx").on(table.status),
  ],
);

export const parliamentResultReactions = sqliteTable(
  "parliament_result_reactions",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").notNull(),
    citizenId: text("citizen_id").notNull(),
    reaction: text("reaction").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("parliament_result_reaction_unique").on(table.itemId, table.citizenId),
    index("parliament_result_reaction_item_idx").on(table.itemId),
  ],
);

export const committeeClubProfiles = sqliteTable(
  "committee_club_profiles",
  {
    citizenId: text("citizen_id").primaryKey(),
    maskName: text("mask_name").notNull().default(""),
    avatar: text("avatar").notNull().default("sigil"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("committee_club_profiles_updated_at_idx").on(table.updatedAt)],
);

export const committeeClubMessages = sqliteTable(
  "committee_club_messages",
  {
    id: text("id").primaryKey(),
    citizenId: text("citizen_id").notNull(),
    body: text("body").notNull().default(""),
    sticker: text("sticker").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("committee_club_messages_created_at_idx").on(table.createdAt),
    index("committee_club_messages_citizen_idx").on(table.citizenId),
  ],
);

export const committeeClubRoom = sqliteTable(
  "committee_club_room",
  {
    id: text("id").primaryKey(),
    vaseSelection: text("vase_selection").notNull().default("autumn"),
    updatedByCitizenId: text("updated_by_citizen_id").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("committee_club_room_updated_at_idx").on(table.updatedAt)],
);

// The original room row remains unchanged; these are append-only object memories.
export const committeeVaseHistory = sqliteTable("committee_vase_history", {
  seq: integer("seq").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().unique(),
  citizenId: text("citizen_id").notNull(),
  vaseSelection: text("vase_selection").notNull(),
  createdAt: text("created_at").notNull(),
  method: text("method").notNull(),
});

export const committeeLoungeSeats = sqliteTable(
  "committee_lounge_seats",
  {
    seatIndex: integer("seat_index").primaryKey(),
    citizenId: text("citizen_id").notNull(),
    seatedAt: text("seated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("committee_lounge_seats_citizen_unique").on(table.citizenId),
    index("committee_lounge_seats_seated_at_idx").on(table.seatedAt),
  ],
);

export const memberAquariumSaves = sqliteTable("member_aquarium_saves", {
  citizenId: text("citizen_id").notNull(),
  slotId: text("slot_id").notNull().default("main"),
  stateJson: text("state_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("member_aquarium_saves_member_slot_unique").on(table.citizenId, table.slotId),
  index("member_aquarium_saves_updated_idx").on(table.updatedAt),
]);

// Original WinFish save files, isolated from the earlier aquarium prototype.
export const memberInsaniquariumSaves = sqliteTable("member_insaniquarium_saves", {
  citizenId: text("citizen_id").primaryKey().notNull(),
  stateJson: text("state_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

