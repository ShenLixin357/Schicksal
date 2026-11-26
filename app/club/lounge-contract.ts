/** Existing Lounge wire data shapes. No DB migration or API behavior changes. */
import type { ChatCursor } from "./chat-history";

export type ClubProfile = { citizenId: string; maskName: string; avatar: string; updatedAt: string };
export type ClubMessage = { id: string; citizenId: string; body: string; sticker: string; createdAt: string };
export type ClubRoom = { id: string; vaseSelection: string; updatedByCitizenId: string; updatedAt: string };
export type LoungeSeat = { seatIndex: number; citizenId: string; seatedAt: string };
export type ClubData = { profiles?: ClubProfile[]; messages?: ClubMessage[]; nextCursor?: ChatCursor | null; room?: ClubRoom; seats?: LoungeSeat[]; error?: string };
