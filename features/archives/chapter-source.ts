/** Existing static archive source, separate from the future Library backend. */
export async function loadArchiveChapter(source: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(source);
  if (!response.ok) throw new Error("这一章暂时无法打开。");
  return response.text();
}
