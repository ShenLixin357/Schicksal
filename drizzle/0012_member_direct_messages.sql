-- Additive private member-to-member and self messages. Existing records are untouched.
CREATE TABLE IF NOT EXISTS member_direct_messages (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS member_direct_messages_sender_recent
  ON member_direct_messages(sender_id, seq DESC);
CREATE INDEX IF NOT EXISTS member_direct_messages_recipient_recent
  ON member_direct_messages(recipient_id, seq DESC);
