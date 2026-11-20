import { BRIEFING_BACKDROP_COLORS } from "../identity/visual-registry";

/**
 * Schicksal briefing paper decoration: warm ivory with two small concentrations
 * of softly tinted ellipses at the margins. No faceted/crystalline geometry.
 * The eight-colour fine waves remain separate from both the editorial content
 * and the authentic <Emblem compact /> rendered by app/page.tsx.
 */
export function BriefingBackdrop() {
  const palette = [...BRIEFING_BACKDROP_COLORS];
  return <div className="imperial-briefing-canvas" aria-hidden="true">
    <svg viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      <defs>
        <radialGradient id="briefing-oval-pearl" cx="38%" cy="35%" r="76%">
          <stop offset="0%" stopColor="#f2d8e4" stopOpacity=".46"/>
          <stop offset="48%" stopColor="#dcebf2" stopOpacity=".31"/>
          <stop offset="100%" stopColor="#e8f1ec" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="briefing-oval-ivory" cx="40%" cy="40%" r="72%">
          <stop offset="0%" stopColor="#e5e4f5" stopOpacity=".40"/>
          <stop offset="50%" stopColor="#e9d6bd" stopOpacity=".25"/>
          <stop offset="100%" stopColor="#f7f3e9" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Two matching families of eight-colour fine waves at the edges. */}
      <g className="imperial-briefing-edge-ribbon" strokeWidth="1.18" strokeLinecap="round">
        {palette.map((color, i) => (
          <path key={color} stroke={color}
            d={`M 1488 ${326 + i * 9} C 1436 ${286 + i * 8} 1419 ${394 + i * 8} 1374 ${365 + i * 9} S 1328 ${300 + i * 9} 1274 ${358 + i * 9}`}/>
        ))}
      </g>
      <g className="imperial-briefing-edge-ribbon" strokeWidth="1.14" strokeLinecap="round">
        {palette.map((color, i) => (
          <path key={color} stroke={color}
            d={`M -65 ${785 + i * 8} C 48 ${743 + i * 7} 87 ${818 + i * 7} 154 ${775 + i * 8} S 237 ${751 + i * 8} 302 ${789 + i * 8}`}/>
        ))}
      </g>

      {/* Soft, translucent ellipses replace all pointed facet polygons.
          The forms are clipped naturally by the paper edge, not by hard masks. */}
      <g className="imperial-briefing-oval-group" transform="translate(1418 230) rotate(-24)">
        <ellipse cx="0" cy="0" rx="165" ry="103" fill="url(#briefing-oval-pearl)"/>
        <ellipse cx="-13" cy="8" rx="125" ry="73" fill="#d6e7ef" fillOpacity=".12"/>
        <ellipse cx="10" cy="-5" rx="153" ry="94" stroke="#aac6d7" strokeWidth=".9" strokeOpacity=".28"/>
        <ellipse cx="10" cy="-5" rx="116" ry="68" stroke="#d4b2c8" strokeWidth=".8" strokeOpacity=".21"/>
      </g>
      <g className="imperial-briefing-oval-group" transform="translate(57 854) rotate(21)">
        <ellipse cx="0" cy="0" rx="139" ry="90" fill="url(#briefing-oval-ivory)"/>
        <ellipse cx="12" cy="-5" rx="107" ry="67" fill="#cfe6e0" fillOpacity=".11"/>
        <ellipse cx="2" cy="1" rx="130" ry="84" stroke="#cbb7d5" strokeWidth=".85" strokeOpacity=".27"/>
        <ellipse cx="2" cy="1" rx="92" ry="56" stroke="#b9d5d4" strokeWidth=".75" strokeOpacity=".20"/>
      </g>
    </svg>
  </div>;
}
