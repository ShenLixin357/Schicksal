import { env } from "cloudflare:workers";
import { assertSchema } from "./schema-check.ts";
export function ensurePhotoSchema() {
 return assertSchema(env.DB, [["archive_photos", "object_key,subjects_json,subject_key,uploader_citizen_id,size_bytes"]]);
}
