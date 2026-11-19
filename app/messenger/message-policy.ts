import { CITIZENS } from "../citizens";

export const MESSENGER_MEMBER_IDS = new Set(CITIZENS.filter(member => !member.locked).map(member => member.id));
export const MAX_MESSAGE_CHARS = 500;

export function validPeer(peer: unknown): peer is string {
  return typeof peer === "string" && MESSENGER_MEMBER_IDS.has(peer);
}

export function validateMessageBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  return body && body.length <= MAX_MESSAGE_CHARS ? body : null;
}

export function conversationPartner(selfId: string, message: { senderId: string; recipientId: string }): string | null {
  if (message.senderId === selfId && validPeer(message.recipientId)) return message.recipientId;
  if (message.recipientId === selfId && validPeer(message.senderId)) return message.senderId;
  return null;
}
