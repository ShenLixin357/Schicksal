import type { MusicNote } from './music-model';
export const SAMPLE_MAP = [{ midi: 36, url: '/cello/audio/c2.mp3' }, { midi: 43, url: '/cello/audio/g2.mp3' }, { midi: 50, url: '/cello/audio/d3.mp3' }, { midi: 57, url: '/cello/audio/a3.mp3' }] as const;
export function nearestSample(midi: number) { return SAMPLE_MAP.reduce((a, b) => Math.abs(a.midi - midi) <= Math.abs(b.midi - midi) ? a : b); }
export function sequenceTimes(notes: MusicNote[], tempo: number) { let time = 0; return notes.map((note, index) => { const event = { ...note, index, time, duration: note.beats * 60 / tempo }; time += event.duration; return event; }); }
export class CelloAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private buffers = new Map<string, Promise<AudioBuffer>>();
    private voices = new Set<AudioBufferSourceNode>();
    private timers = new Set<ReturnType<typeof setTimeout>>();
    private epoch = 0;
    private level = .65;
    private muted = false;
    private disposed = false;
    /** Called synchronously from the user's gesture, before any network await (Safari included). */
    unlock() { if (this.disposed)
        throw new Error('琴音已关闭，请重新打开。'); if (!this.context) {
        const C = window.AudioContext || (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
        if (!C)
            throw new Error('当前浏览器不支持试奏音频。');
        this.context = new C();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : this.level * .65;
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 5;
        this.master.connect(compressor).connect(this.context.destination);
    } if (this.context.state === 'suspended')
        void this.context.resume(); return this.context; }
    volume(level: number, muted: boolean) { this.level = Math.max(0, Math.min(1, level)); this.muted = muted; if (this.context && this.master)
        this.master.gain.setTargetAtTime(muted ? 0 : this.level * .65, this.context.currentTime, .025); }
    private buffer(url: string) { let cached = this.buffers.get(url); if (!cached) {
        const context = this.context!;
        cached = fetch(url, { credentials: 'same-origin' }).then(r => { if (!r.ok)
            throw new Error('琴音加载失败，请稍后重试。'); return r.arrayBuffer(); }).then(b => context.decodeAudioData(b)).catch(e => { this.buffers.delete(url); throw e; });
        this.buffers.set(url, cached);
    } return cached; }
    private voice(midi: number, buffer: AudioBuffer, at: number, duration: number) {
        const c = this.context!;
        const sample = nearestSample(midi), source = c.createBufferSource(), gain = c.createGain();
        source.buffer = buffer;
        source.playbackRate.value = 2 ** ((midi - sample.midi) / 12);
        const available = buffer.duration / source.playbackRate.value;
        const end = at + Math.min(available, Math.max(.24, duration) + .65);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(.82, at + .012);
        gain.gain.setValueAtTime(.82, Math.max(at + .013, end - .4));
        gain.gain.exponentialRampToValueAtTime(.0001, end);
        source.connect(gain).connect(this.master!);
        this.voices.add(source);
        source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
        source.start(at);
        source.stop(end + .02);
    }
    async note(midi: number) { const c = this.unlock(), token = this.epoch, s = nearestSample(midi); const b = await this.buffer(s.url); if (token !== this.epoch || this.disposed)
        return; if (this.voices.size >= 12) {
        const first = this.voices.values().next().value;
        if (first) {
            try {
                first.stop();
            }
            catch { }
            this.voices.delete(first);
        }
    } this.voice(midi, b, c.currentTime + .015, 1.8); }
    async sequence(notes: MusicNote[], tempo: number, onNote?: (index: number) => void) {
        this.stop();
        const c = this.unlock(), token = this.epoch;
        const samples = [...new Set(notes.filter(n => n.midi !== null).map(n => nearestSample(n.midi!).url))];
        await Promise.all(samples.map(url => this.buffer(url)));
        if (token !== this.epoch || this.disposed)
            return;
        const start = c.currentTime + .06, events = sequenceTimes(notes, tempo);
        for (const n of events) {
            if (n.midi !== null)
                this.voice(n.midi, await this.buffer(nearestSample(n.midi).url), start + n.time, n.duration);
            const timer = setTimeout(() => { this.timers.delete(timer); if (token === this.epoch)
                onNote?.(n.index); }, (n.time + .06) * 1000);
            this.timers.add(timer);
        }
        const last = events.at(-1);
        const timer = setTimeout(() => { this.timers.delete(timer); if (token === this.epoch)
            onNote?.(-1); }, ((last?.time || 0) + (last?.duration || 0) + .7) * 1000);
        this.timers.add(timer);
    }
    stop() { this.epoch++; for (const timer of this.timers)
        clearTimeout(timer); this.timers.clear(); for (const source of this.voices) {
        try {
            source.stop();
        }
        catch { }
    } this.voices.clear(); }
    dispose() { this.stop(); this.disposed = true; if (this.context)
        void this.context.close(); this.buffers.clear(); }
}
