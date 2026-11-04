import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

export function ensurePhotoSchema() {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS archive_photos (
        id text PRIMARY KEY NOT NULL,
        object_key text NOT NULL UNIQUE,
        original_name text NOT NULL,
        title text NOT NULL,
        description text DEFAULT '' NOT NULL,
        era text DEFAULT '' NOT NULL,
        captured_at text DEFAULT '' NOT NULL,
        subjects_json text NOT NULL,
        subject_key text NOT NULL,
        uploader_citizen_id text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS archive_photos_subject_key_idx ON archive_photos (subject_key)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS archive_photos_created_at_idx ON archive_photos (created_at)"),
    ]).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
