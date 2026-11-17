export function archiveInlineMarkdown(value: string) {
  const escaped = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
}

export function archiveMarkdownToHtml(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | "" = "";
  let quoteLines: string[] = [];
  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = ""; } };
  const closeQuote = () => { if (quoteLines.length) { html.push(`<blockquote>${quoteLines.map(archiveInlineMarkdown).join("<br />")}</blockquote>`); quoteLines = []; } };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) { closeList(); closeQuote(); return; }
    if (line === "---") { closeList(); closeQuote(); html.push("<hr />"); return; }
    if (line.startsWith(">")) { closeList(); quoteLines.push(line.replace(/^>\s?/, "")); return; }
    closeQuote();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, heading[1].length + 1);
      html.push(`<h${level}>${archiveInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      if (listType !== "ul") { closeList(); listType = "ul"; html.push("<ul>"); }
      html.push(`<li>${archiveInlineMarkdown(unordered[1])}</li>`);
      return;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      if (listType !== "ol") { closeList(); listType = "ol"; html.push("<ol>"); }
      html.push(`<li>${archiveInlineMarkdown(ordered[1])}</li>`);
      return;
    }
    closeList();
    html.push(`<p>${archiveInlineMarkdown(line)}</p>`);
  });
  closeList();
  closeQuote();
  return html.join("");
}

