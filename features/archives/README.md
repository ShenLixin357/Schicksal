# Archives extraction pilot

- `archives-section.tsx`: original UI and local reader interactions.
- `catalogue.ts`: the same three chapters, labels and source URLs.
- `chapter-source.ts`: static text retrieval, called after the book opens.
- `markdown.ts`: unchanged escaping and Markdown rendering.

The host passes its existing PageHead and ownerMark. This feature does not import app/page, other rooms or the DB, and adds no DOM wrapper. Root CSS, artwork, chapter files, member marks and author labels remain unchanged. CSS isolation, URL routing and the future Library backend are later work.

The six-state HTML fixture was frozen from the original component at 7d1a0c2. Both sides use identical host/image stand-ins: the comparison covers exact archive structure, text, image props and slot placement. It is not a pixel screenshot or browser end-to-end test. Control/source tests cover open/close, navigation, lazy loading, late responses, errors and escaping.
