/**
 * Briefing decorative construction system — a cream-paper field with two
 * intentional concentrations of colour at the margins. All text stays HTML.
 *
 * The *actual* Schicksal mark comes from the existing <Emblem compact />
 * component, not from the paper artwork; this file draws no new emblem.
 */
export function BriefingBackdrop() {
  const palette = ["#e0b95b","#7ca7d4","#d8878a","#78b29c","#abd2dd","#d7a1c1","#d9a26d","#9887bd"] as const;
  return <div className="imperial-briefing-canvas" aria-hidden="true">
    <svg viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      {/* Edge embroidery: a single ribbon family at the right margin.
          The news and affairs remain on an uninterrupted ivory surface. */}
      <g className="imperial-briefing-edge-ribbon" strokeWidth="1.18" strokeLinecap="round">
        {palette.map((color, i) => (
          <path key={color} stroke={color}
            d={`M 1488 ${326+i*9} C 1436 ${286+i*8} 1419 ${394+i*8} 1374 ${365+i*9} S 1328 ${300+i*9} 1274 ${358+i*9}`}/>
        ))}
      </g>
      <g className="imperial-briefing-edge-ribbon" strokeWidth="1.14" strokeLinecap="round">
        {palette.map((color, i) => (
          <path key={color} stroke={color}
            d={`M -65 ${785+i*8} C 48 ${743+i*7} 87 ${818+i*7} 154 ${775+i*8} S 237 ${751+i*8} 302 ${789+i*8}`}/>
        ))}
      </g>

      {/* One crystalline facet assembly, repeated at a reduced scale in the
          opposing margin. Three tones only per cluster. */}
      <g className="imperial-briefing-facet-group" transform="translate(1450 230) rotate(17)" strokeLinejoin="round">
        <polygon points="0,-80 60,-29 51,62 -4,89 -68,29 -56,-41"
          fill="#b9d5e1" fillOpacity=".12" stroke="#8cabc5" strokeWidth="1.15"/>
        <polygon points="0,-80 12,3 -4,89 -23,0" fill="#c1dfe6" fillOpacity=".15" stroke="#87b1c9" strokeWidth=".9"/>
        <polygon points="0,-80 60,-29 12,3" fill="#e5b5c9" fillOpacity=".14" stroke="#cfa2bd" strokeWidth=".85"/>
        <polygon points="12,3 51,62 -4,89" fill="#e9d39e" fillOpacity=".14" stroke="#c7a66a" strokeWidth=".85"/>
        <path d="M-56-41 12 3 60-29M-68 29 12 3 51 62M0-80 -23 0 -4 89"
          stroke="#c4a9bf" strokeWidth=".8" opacity=".75"/>
        <circle cx="12" cy="3" r="3.2" fill="#fffaf2" stroke="#c7ab76" strokeWidth="1"/>
      </g>
      <g className="imperial-briefing-facet-group" transform="translate(67 858) rotate(-16) scale(.7)" strokeLinejoin="round">
        <polygon points="0,-80 60,-29 51,62 -4,89 -68,29 -56,-41"
          fill="#e3c4d5" fillOpacity=".12" stroke="#c0a1b8" strokeWidth="1.3"/>
        <polygon points="0,-80 12,3 -4,89" fill="#b3d5d8" fillOpacity=".15" stroke="#87b9bd" strokeWidth=".95"/>
        <path d="M-56-41 12 3 60-29M-68 29 12 3 51 62" stroke="#93b2cf" strokeWidth="1"/>
      </g>

      {/* Fine coordinate details use the same faceted geometry, not
          unrelated stars, flowers, planets, and ornamental objects. */}
      <g className="imperial-briefing-construction-lines" strokeWidth=".9" strokeLinecap="round">
        <path d="M 126 896 H 226 M 176 867 V 924" stroke="#c3a9be" strokeDasharray="2 8"/>
        <circle cx="176" cy="896" r="18" stroke="#a0c1cc"/>
      </g>
      <g className="imperial-briefing-paper-dots">
        <circle cx="215" cy="783" r="2.6" fill="#fffaf3" stroke="#a1bbd5" strokeWidth="1"/>
      </g>
    </svg>
  </div>;
}
