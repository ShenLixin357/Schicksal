import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

async function ensureColumn(table: string, column: string, definition: string) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!info.results.some((entry: { name: string }) => entry.name === column)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export function ensureParliamentSchema() {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS parliament_items (
        id text PRIMARY KEY NOT NULL,
        serial_code text NOT NULL UNIQUE,
        kind text DEFAULT 'proposal' NOT NULL,
        title text NOT NULL,
        summary text DEFAULT '' NOT NULL,
        body text DEFAULT '' NOT NULL,
        stage text DEFAULT 'proposal' NOT NULL,
        outcome text DEFAULT 'pending' NOT NULL,
        classification text DEFAULT 'pending_review' NOT NULL,
        routing text DEFAULT 'pending_review' NOT NULL,
        proposer_age_band text DEFAULT 'unknown' NOT NULL,
        recusal_requested integer DEFAULT 0 NOT NULL,
        stage_reason text DEFAULT '' NOT NULL,
        voting_version integer,
        deadline text DEFAULT '' NOT NULL,
        created_by_citizen_id text NOT NULL,
        version integer DEFAULT 1 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_items_stage_idx ON parliament_items (stage)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_items_updated_at_idx ON parliament_items (updated_at)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS parliament_comments (
        id text PRIMARY KEY NOT NULL,
        item_id text NOT NULL,
        citizen_id text NOT NULL,
        comment_type text DEFAULT 'comment' NOT NULL,
        body text NOT NULL,
        quote_text text DEFAULT '' NOT NULL,
        parent_id text DEFAULT '' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_comments_item_idx ON parliament_comments (item_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_comments_created_at_idx ON parliament_comments (created_at)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS parliament_votes (
        id text PRIMARY KEY NOT NULL,
        item_id text NOT NULL,
        citizen_id text NOT NULL,
        choice text NOT NULL,
        document_version integer DEFAULT 1 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS parliament_votes_item_citizen_unique ON parliament_votes (item_id, citizen_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_votes_item_idx ON parliament_votes (item_id)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS parliament_amendments (
        id text PRIMARY KEY NOT NULL,
        item_id text NOT NULL,
        citizen_id text NOT NULL,
        target_quote text NOT NULL,
        proposed_text text NOT NULL,
        reason text NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        decided_at text DEFAULT '' NOT NULL,
        decided_by_citizen_id text DEFAULT '' NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_amendments_item_idx ON parliament_amendments (item_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_amendments_status_idx ON parliament_amendments (status)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS parliament_audit_events (
        id text PRIMARY KEY NOT NULL,
        item_id text NOT NULL,
        actor_citizen_id text NOT NULL,
        event_type text NOT NULL,
        description text NOT NULL,
        metadata_json text DEFAULT '{}' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_audit_item_idx ON parliament_audit_events (item_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS parliament_audit_created_at_idx ON parliament_audit_events (created_at)"),
      env.DB.prepare(`INSERT OR IGNORE INTO parliament_items
        (id, serial_code, kind, title, summary, body, stage, outcome, created_by_citizen_id, version)
        VALUES ('lesson-1-state', 'P-001', 'proposal', '国家基础制度框架案',
        '讨论国家的基本结构、主权、法律秩序、对外权限与公民制衡。',
        '这里将存放 Lesson 1 的 Reference、正式 Proposal 与逐条法案文本。具体条款可在后续制宪过程中持续补入。',
        'proposal', 'pending', 'amberina', 1)`),
      env.DB.prepare(`INSERT OR IGNORE INTO parliament_items
        (id, serial_code, kind, title, summary, body, stage, outcome, created_by_citizen_id, version, created_at, updated_at)
        VALUES ('restoration-2026', 'R-001', 'referendum', '第一帝国复辟公投',
        '2026 年 8 月 15 日 13:43，立法委员会以 2/3 支持通过第一帝国复辟。',
        '宇宙霸主与 No.2 投下支持票。选票过半后，最高领导人宣布天命第一帝国正式复辟。',
        'resolved', 'passed', 'amberina', 1, '2026-08-15 13:43:00', '2026-08-15 13:43:00')`),
      env.DB.prepare(`INSERT OR IGNORE INTO parliament_items
        (id, serial_code, kind, title, summary, body, stage, outcome, created_by_citizen_id, version)
        VALUES ('lesson-2-citizenship', 'P-002', 'proposal', '第一帝国公民身份制度案',
        '定义第一帝国创始世代公民身份，以及后代与更广义天命共同体的关系。',
        '本案仍处于制宪讨论阶段。已确认方向与 Deferred Proposal 将在后续形成正式条款。',
        'proposal', 'pending', 'amberina', 1)`),
      env.DB.prepare(`INSERT OR IGNORE INTO parliament_items
        (id, serial_code, kind, title, summary, body, stage, outcome, classification, routing, proposer_age_band, created_by_citizen_id, version)
        VALUES ('lesson-2-restoration', 'P-003', 'proposal', '政治权利恢复与共同体身份制度案',
        '讨论政治权利逐项暂停、正当程序、强制恢复审查、公民身份恢复与“家人永远欢迎你回家”。',
        '本案来自 Lesson 2（第二课·下）的制宪讨论。正式条款可继续在修正中心逐条补入；当前文本不是已经生效的法律。',
        'proposal', 'pending', 'constitutional', 'dual_review', '12_plus', 'amberina', 1)`),
    ]).then(async () => {
      await ensureColumn("parliament_items", "classification", "text DEFAULT 'pending_review' NOT NULL");
      await ensureColumn("parliament_items", "routing", "text DEFAULT 'pending_review' NOT NULL");
      await ensureColumn("parliament_items", "proposer_age_band", "text DEFAULT 'unknown' NOT NULL");
      await ensureColumn("parliament_items", "recusal_requested", "integer DEFAULT 0 NOT NULL");
      await ensureColumn("parliament_items", "stage_reason", "text DEFAULT '' NOT NULL");
      await ensureColumn("parliament_items", "voting_version", "integer");
      await ensureColumn("parliament_items", "deadline", "text DEFAULT '' NOT NULL");
      await ensureColumn("parliament_comments", "quote_text", "text DEFAULT '' NOT NULL");
      await ensureColumn("parliament_comments", "parent_id", "text DEFAULT '' NOT NULL");
      await ensureColumn("parliament_votes", "document_version", "integer DEFAULT 1 NOT NULL");
      await env.DB.batch([
        env.DB.prepare("UPDATE parliament_items SET classification = 'constitutional', routing = 'dual_review', proposer_age_band = '12_plus' WHERE id = 'lesson-1-state' AND classification = 'pending_review'"),
        env.DB.prepare("UPDATE parliament_items SET classification = 'constitutional', routing = 'dual_review', proposer_age_band = '12_plus' WHERE id = 'lesson-2-citizenship' AND classification = 'pending_review'"),
        env.DB.prepare("UPDATE parliament_items SET title = '公民身份与年龄政治权利制度案', summary = '定义第一帝国创始世代公民身份、各年龄层政治权利、低龄自治与立法委员会程序。' WHERE id = 'lesson-2-citizenship' AND title = '第一帝国公民身份制度案'"),
        env.DB.prepare("UPDATE parliament_items SET classification = 'foundational', routing = 'parliament', proposer_age_band = '12_plus', voting_version = 1 WHERE id = 'restoration-2026' AND classification = 'pending_review'"),
        env.DB.prepare(`INSERT OR IGNORE INTO parliament_audit_events
          (id, item_id, actor_citizen_id, event_type, description, metadata_json, created_at)
          VALUES ('audit-restoration-certified', 'restoration-2026', 'amberina', 'certified', '第一帝国复辟公投通过并完成认证。', '{"result":"2/3 passed"}', '2026-08-15 13:43:00')`),
      ]);
    }).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
