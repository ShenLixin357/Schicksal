import type {DigitalDB} from '../digital/large.ts';
/** Read-only database checks, deliberately not a proof of physical object integrity. */
const rules=[
 ['book-drafts',"SELECT COUNT(*) n FROM library_revisions d WHERE state='draft' AND NOT EXISTS(SELECT 1 FROM library_revisions p WHERE p.origin_draft=d.revision)",'info'],
 ['gallery-pending',"SELECT COUNT(*) n FROM gallery_blobs WHERE state='pending'",'review'],
 ['gallery-no-preview',"SELECT COUNT(*) n FROM gallery_works w JOIN gallery_versions v ON v.work_id=w.id AND v.ordinal=(SELECT MAX(ordinal) FROM gallery_versions WHERE work_id=w.id) WHERE w.trashed_at IS NULL AND NOT EXISTS(SELECT 1 FROM gallery_variants a JOIN gallery_blobs b ON b.sha256=a.sha256 WHERE a.version_id=v.id AND a.role='thumbnail' AND b.state='ready')",'review'],
 ['digital-pending',"SELECT COUNT(*) n FROM digital_blobs WHERE state='pending'",'review'],
 ['open-upload',"SELECT COUNT(*) n FROM digital_uploads WHERE state='open'",'info'],
 ['open-upload-over-24h',"SELECT COUNT(*) n FROM digital_uploads WHERE state='open' AND julianday(created_at)<julianday('now','-1 day')",'review'],
 ['gallery-without-version',"SELECT COUNT(*) n FROM gallery_works w WHERE w.trashed_at IS NULL AND NOT EXISTS(SELECT 1 FROM gallery_versions v WHERE v.work_id=w.id)",'review'],
 ['digital-without-version',"SELECT COUNT(*) n FROM digital_objects w WHERE w.trashed_at IS NULL AND NOT EXISTS(SELECT 1 FROM digital_versions v WHERE v.object_id=w.id)",'review'],
 ['broken-gallery-reference',"SELECT COUNT(*) n FROM asset_links l LEFT JOIN gallery_versions v ON v.id=l.gallery_version_id LEFT JOIN gallery_works w ON w.id=v.work_id WHERE l.removed_at IS NULL AND l.gallery_version_id IS NOT NULL AND (v.id IS NULL OR w.id IS NULL OR w.trashed_at IS NOT NULL)",'critical'],
 ['broken-digital-reference',"SELECT COUNT(*) n FROM asset_links l LEFT JOIN digital_versions v ON v.id=l.digital_version_id LEFT JOIN digital_objects w ON w.id=v.object_id WHERE l.removed_at IS NULL AND l.digital_version_id IS NOT NULL AND (v.id IS NULL OR w.id IS NULL OR w.trashed_at IS NOT NULL)",'critical'],
] as const;
export async function healthReport(db:DigitalDB){const findings=[];for(const [code,sql,severity] of rules){const row=await db.prepare(sql).bind().first<{n:number}>();findings.push({code,severity,count:Number(row?.n??0)});}return {checkedAt:new Date().toISOString(),scope:'metadata-only',findings,automaticRepair:false,deleteAllowed:false};}
