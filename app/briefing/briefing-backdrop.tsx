/** A purely decorative ivory-paper overlay: eight independent colour filaments,
 * translucent polygonal prisms and hairline constructions. Content stays HTML.
 * Does not replace the real compact Schicksal emblem.
 */
export function BriefingBackdrop() {
  const palette = ["#e0b95b","#7ca7d4","#d8878a","#78b29c","#abd2dd","#d7a1c1","#d9a26d","#9887bd"] as const;
  return <div className="imperial-briefing-canvas" aria-hidden="true">
    <svg viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      <defs>
        <linearGradient id="ib-ribbon-sheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f7e2b0" stopOpacity=".08"/>
          <stop offset="50%" stopColor="#9ac9dc" stopOpacity=".23"/>
          <stop offset="100%" stopColor="#dcb7d7" stopOpacity=".05"/>
        </linearGradient>
        <radialGradient id="ib-facet-fill" cx="40%" cy="33%" r="68%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".83"/>
          <stop offset="68%" stopColor="#d2e7ed" stopOpacity=".18"/>
          <stop offset="100%" stopColor="#dbbed1" stopOpacity=".06"/>
        </radialGradient>
      </defs>

      {/* Long architectural ribbons that extend across the ivory canvas,
          not just inside the headline card. */}
      <g strokeWidth="1.55" strokeLinecap="round" opacity=".63">
        {palette.map((color, i) => <path
          key={color}
          d={`M -90 ${147+i*12} C 155 ${70+i*10} 170 ${248+i*7} 430 ${169+i*11} S 810 ${105+i*13} 1040 ${180+i*8} S 1270 ${305+i*9} 1540 ${165+i*11}`}
          stroke={color}/>)}
      </g>
      <g strokeWidth="1.35" strokeLinecap="round" opacity=".77">
        {palette.map((color,i)=><path
          key={color}
          d={`M -80 ${642+i*10} C 190 ${576+i*11} 266 ${779+i*8} 568 ${676+i*8} S 967 ${553+i*10} 1159 ${680+i*7} S 1370 ${801+i*8} 1535 ${696+i*10}`}
          stroke={color}/>)}
      </g>
      <path d="M-40 818 C182 732 309 890 503 813 S1010 746 1470 844" stroke="#c9a86f" strokeDasharray="3 13" strokeWidth="1.2" opacity=".46"/>

      {/* Iridescent multi-facet constructions: airy geometry, not solid blocks. */}
      <g transform="translate(1303 272) rotate(18)" strokeLinejoin="round">
        <polygon points="0,-126 91,-39 74,105 -13,148 -101,52 -84,-69" fill="url(#ib-facet-fill)" stroke="#9dacc9" strokeWidth="1.3" opacity=".75"/>
        <polygon points="0,-126 22,7 -13,148 -46,12" fill="#c3dfe4" fillOpacity=".16" stroke="#80adc9" strokeWidth=".95"/>
        <polygon points="0,-126 91,-39 22,7" fill="#e6c1d6" fillOpacity=".15" stroke="#d1a1c0" strokeWidth=".95"/>
        <polygon points="22,7 74,105 -13,148" fill="#e8d1a4" fillOpacity=".17" stroke="#d4b36b" strokeWidth=".9"/>
        <polygon points="-84,-69 -46,12 -101,52" fill="#9bb9dc" fillOpacity=".1" stroke="#93a2c9" strokeWidth=".9"/>
        <path d="M-84-69 22 7 91-39M-101 52 22 7 74 105M0-126-46 12-13 148" stroke="#c3a6bd" strokeWidth=".8" opacity=".75"/>
        <circle cx="22" cy="7" r="4" fill="#fffaf1" stroke="#d5b77b" strokeWidth="1.3"/>
      </g>
      <g transform="translate(112 728) rotate(-17)" strokeLinejoin="round">
        <polygon points="0,-103 72,-35 51,92 -8,128 -76,34 -55,-60" fill="url(#ib-facet-fill)" stroke="#c6a9c8" strokeWidth="1.25" opacity=".73"/>
        <path d="M0-103 12 6-8 128M-55-60 12 6 72-35M-76 34 12 6 51 92" stroke="#8ab9c6" strokeWidth=".9" opacity=".68"/>
        <polygon points="0,-103 72,-35 12,6" fill="#dba9ce" fillOpacity=".16" stroke="none"/>
        <polygon points="12,6 51,92 -8,128" fill="#9ecbd0" fillOpacity=".18" stroke="none"/>
        <circle cx="12" cy="6" r="3" fill="#fff" stroke="#ceb072" strokeWidth="1"/>
      </g>

      <g opacity=".64" strokeWidth="1.15" strokeLinejoin="round">
        <polygon points="79,321 126,290 170,334 123,370" stroke="#86aec8" fill="#b9d8e2" fillOpacity=".095"/>
        <path d="M79 321 170 334M126 290 123 370" stroke="#d19dbb" opacity=".8"/>
        <polygon points="1185,783 1250,741 1306,805 1242,845" stroke="#d2a4b8" fill="#e1b5c7" fillOpacity=".12"/>
        <path d="M1185 783 1306 805M1250 741 1242 845" stroke="#a8bed4" opacity=".86"/>
        <polygon points="282,893 326,864 367,911 320,940" stroke="#d2b477" fill="#e6d7aa" fillOpacity=".10"/>
        <path d="M282 893 367 911" stroke="#8fc3be"/>
        <polygon points="1056,76 1095,46 1135,91 1098,123" stroke="#97a9d0" fill="#bac6ea" fillOpacity=".11"/>
      </g>

      {/* Orbital arcs, corner compass sections, and fine structural lines. */}
      <g opacity=".47" strokeWidth="1.1">
        <path d="M-35 401 A215 215 0 0 1 209 117" stroke="#ca9d6e"/>
        <path d="M-45 422 A245 245 0 0 1 247 94" stroke="#9eabc9"/>
        <path d="M1240 902 A280 280 0 0 0 1501 607" stroke="#c58fac"/>
        <path d="M1211 902 A302 302 0 0 0 1500 576" stroke="#82b5a3"/>
        <path d="M1000 35 L1072 35M1036 0 L1036 73" stroke="#cba46e" strokeDasharray="2 8"/>
      </g>
      <g opacity=".66">
        <circle cx="1179" cy="161" r="3.6" fill="#fffaf2" stroke="#d5b06f" strokeWidth="1.2"/>
        <circle cx="271" cy="619" r="3.4" fill="#fffaf2" stroke="#a0b6d3" strokeWidth="1.1"/>
        <circle cx="1384" cy="834" r="4" fill="#fffaf2" stroke="#cc9dbb" strokeWidth="1.1"/>
        <circle cx="1038" cy="74" r="3.2" fill="#fefcf8" stroke="#91bba9" strokeWidth="1.2"/>
      </g>
    </svg>
  </div>;
}
