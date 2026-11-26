/** Visual-only destinations: the original Work library remains independent,
 * and the existing messenger API/data is deliberately left unchanged. */
export function ShellPlaceholder({ kind }: { kind: "library" | "messenger" | "atlas" }) {
  const title = kind === "library" ? "魔法图书馆" : kind === "atlas" ? "天命图谱" : "帝国通讯";
  return <section className="shell-placeholder" aria-label={title}>
    <h1>{title}</h1>
    <p>{kind === "atlas" ? "美术设计中 · 暂未开放" : "即将开放"}</p>
  </section>;
}
