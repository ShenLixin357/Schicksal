import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureParliamentSchema } from "../../../db/parliament-schema";
import { parliamentAuditEvents, parliamentItems, parliamentVotes } from "../../../db/schema";
import { currentMember } from "../../member-session";
import { foundingNews, latestNews, orderedBriefingTasks } from "../../briefing/briefing-data";
import { verifiedReleaseNews } from "../../briefing/feature-news";
import { parliamentAuditNews, parliamentVotingTasks } from "../../briefing/briefing-feed";

const headers = { "Cache-Control": "private, no-store" };

// Every member's inbox is resolved from the server-validated session.
// Never accept citizenId from query parameters, headers, or client JSON.
export async function GET(request: Request) {
  try {
    const citizenId = await currentMember(request);
    if (!citizenId) {
      return Response.json({ error: "请先登录天命成员身份。" }, { status: 401, headers });
    }
    await ensureParliamentSchema();
    const db = getDb();
    const [items, ownVotes, events] = await Promise.all([
      db.select({
        id: parliamentItems.id, serialCode: parliamentItems.serialCode,
        title: parliamentItems.title, summary: parliamentItems.summary,
        stage: parliamentItems.stage, votingVersion: parliamentItems.votingVersion,
        version: parliamentItems.version, deadline: parliamentItems.deadline,
        createdAt: parliamentItems.createdAt, updatedAt: parliamentItems.updatedAt,
      }).from(parliamentItems),
      db.select({
        itemId: parliamentVotes.itemId, citizenId: parliamentVotes.citizenId,
        documentVersion: parliamentVotes.documentVersion,
      }).from(parliamentVotes).where(eq(parliamentVotes.citizenId, citizenId)),
      db.select({
        id: parliamentAuditEvents.id, itemId: parliamentAuditEvents.itemId,
        eventType: parliamentAuditEvents.eventType, description: parliamentAuditEvents.description,
        createdAt: parliamentAuditEvents.createdAt,
      }).from(parliamentAuditEvents).orderBy(desc(parliamentAuditEvents.createdAt)),
    ]);
    const tasks = orderedBriefingTasks(parliamentVotingTasks(items, ownVotes, citizenId));
    const news = latestNews([...foundingNews, ...verifiedReleaseNews, ...parliamentAuditNews(events, items)]);
    return Response.json({ tasks, news, messageState: "not-connected" }, { headers });
  } catch {
    // Do not expose database errors or the existence of other members' records.
    return Response.json({ error: "简报暂时无法同步，请稍后重试。" }, { status: 503, headers });
  }
}
