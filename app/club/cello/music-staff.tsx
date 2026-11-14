import type { MusicNote } from './music-model';
import { noteName } from './music-model';
function staffY(midi: number) { const degree = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6][midi % 12]; const d = (Math.floor(midi / 12) - 1) * 7 + degree; const g2 = 2 * 7 + 4; return 80 - (d - g2) * 5; }
export function MusicStaff({ notes, active = -1, onSelect }: {
    notes: MusicNote[];
    active?: number;
    onSelect?: (n: number) => void;
}) {
    const rows = Math.max(1, Math.ceil(notes.length / 8));
    return <div className="cello-staff" aria-label={notes.length ? notes.map((n, i) => `${i + 1} ${noteName(n.midi)} ${n.beats}拍`).join('，') : '空白五线谱'}>{Array.from({ length: rows }, (_, row) => <svg key={row} viewBox="0 0 630 148" role="img" aria-label={`第 ${row + 1} 行乐谱`}>
 {[40, 50, 60, 70, 80].map(y => <line key={y} x1="15" x2="615" y1={y} y2={y} className="staff-line"/>)}
 <path d="M32 48 C44 30 65 38 60 56 C56 69 44 78 30 84 C48 72 54 64 54 53 C54 43 42 40 36 49 C43 47 45 53 41 57 C34 63 26 55 32 48Z" fill="currentColor"/><circle cx="67" cy="45" r="2.4"/><circle cx="67" cy="57" r="2.4"/>
 {notes.slice(row * 8, row * 8 + 8).map((n, j) => {
                const index = row * 8 + j, x = 106 + j * 64, y = n.midi === null ? 60 : staffY(n.midi), ledger: number[] = [];
                if (n.midi !== null) {
                    for (let l = 90; l <= y; l += 10)
                        ledger.push(l);
                    for (let l = 30; l >= y; l -= 10)
                        ledger.push(l);
                }
                const down = y < 60;
                return <g key={index} className={active === index ? 'staff-note active' : 'staff-note'} onClick={() => onSelect?.(index)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
 {ledger.map(l => <line key={l} x1={x - 12} x2={x + 13} y1={l} y2={l}/>)}
 {n.midi === null ? <path d={n.beats === 2 ? `M${x - 5} 49h15v5h-15Z` : `M${x} 39 l7 13 -8 9 9 11 -9 10 3-12 -9-9 9-10Z`}/> : <><ellipse cx={x} cy={y} rx="7.4" ry="4.9" transform={`rotate(-20 ${x} ${y})`} fill={n.beats === 2 ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="1.6"/><line x1={x + (down ? -6 : 6)} x2={x + (down ? -6 : 6)} y1={y} y2={y + (down ? 31 : -31)} strokeWidth="1.6"/>{n.beats === .5 && <path d={down ? `M${x - 6} ${y + 31}q18-9 10-24q14 15-10 29Z` : `M${x + 6} ${y - 31}q18 9 10 24q14-15-10-29Z`}/>}</>}
 <text x={x} y="133" textAnchor="middle">{index + 1}</text><rect x={x - 27} y="12" width="54" height="126" fill="transparent" stroke="none"/>
 </g>;
            })}</svg>)}</div>;
}
