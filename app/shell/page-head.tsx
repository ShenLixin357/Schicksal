/** Shared, unchanged page-title typography for each extracted section. */
export function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><p>{copy}</p></header>;
}
