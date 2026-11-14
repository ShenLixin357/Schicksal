/** Shared wire format: pitches use scientific MIDI (C4=60), never audio-file octaves. */
export type MusicNote = {
    midi: number | null;
    beats: .5 | 1 | 2;
};
export type Melody = {
    id: string;
    creatorId: string;
    notes: MusicNote[];
    tempo: number;
    message: string;
    createdAt: string;
};
export type MusicAsset = {
    id: string;
    kind: 'image' | 'audio';
    name: string;
    mime: string;
    size: number;
    createdAt: string;
};
export type Score = {
    id: string;
    title: string;
    composer: string;
    content: string;
    privateNote?: string;
    revision: number;
    updatedAt: string;
    assets: MusicAsset[];
};
export type MusicLibrary = {
    member: string;
    canEdit: boolean;
    canManage: boolean;
    canAuthorize: boolean;
    editors: string[];
    scores: Score[];
    melodies: Melody[];
    nextCursor: string | null;
};
export const OPEN_STRINGS = [
    { name: 'C2', midi: 36, frequency: 65.40639132514966, key: '1' },
    { name: 'G2', midi: 43, frequency: 97.99885899543733, key: '2' },
    { name: 'D3', midi: 50, frequency: 146.8323839587038, key: '3' },
    { name: 'A3', midi: 57, frequency: 220, key: '4' },
] as const;
export const DEMO_NOTES: MusicNote[] = OPEN_STRINGS.map(n => ({ midi: n.midi, beats: 2 }));
export const COMPOSER_PITCHES = [48, 50, 52, 53, 55, 57, 59, 60];
export const MAX_NOTES = 32;
export const ROOM_MEMBERS = ['amberina', 'zxy', 'truth'] as const;
export function noteName(midi: number | null) { return midi === null ? '休止' : `${['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`; }
export function frequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
export function validNotes(value: unknown): value is MusicNote[] {
    return Array.isArray(value) && value.length > 0 && value.length <= MAX_NOTES && value.every(n => n && typeof n === 'object' && Object.keys(n).every(k => k === 'midi' || k === 'beats') && (n.midi === null || (Number.isInteger(n.midi) && n.midi >= 36 && n.midi <= 72)) && [.5, 1, 2].includes(n.beats));
}
export function validTempo(n: unknown): n is number { return Number.isInteger(n) && Number(n) >= 50 && Number(n) <= 160; }
export function cleanText(n: unknown, max: number, required = false): n is string { return typeof n === 'string' && n.length <= max && (!required || n.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(n); }
export function musicTimestamp(value: string) { return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value)); }
export const MEMBER_NAMES: Record<string, string> = { amberina: 'Amberina', zxy: 'Lord Chryser', truth: 'Nishujiade' };
