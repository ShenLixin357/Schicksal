# Schicksal Atlas · integration notes

The atlas is isolated under `app/atlas/`. The original authentication, lounge, parliament, D1 migrations, and game state were not changed.

- `atlas-data.ts`: one canonical display registry for current office holders; the atlas, public citizen profile, and office directory all read from it. Holder IDs must reference stable `CITIZENS[].id` values. Proposed descriptions are labelled unratified in the interface.
- `CITIZEN_APPEARANCE`: per-citizen `personalColor`, optional `webColor`, `emblemSrc` and `ornamentSrc`. Art can be swapped without changing component logic. No member-supplied asset should be AI-redrawn.
- `schicksal-atlas.tsx`: one interactive eight-node atlas with a temporary code-rendered central emblem; future official emblem swap happens through the `renderEmblem` prop in `app/page.tsx`.
- `app/page.tsx`: old citizens/emblem sidebar entries merged into Atlas. The authenticated system supports viewing another citizen's **public** profile while member settings are restricted to the actual signed-in owner.
- `government-handbook.tsx`: early in-site reader, accessible from parliament and the Atlas office panel. The complete independent Library Lab is not yet connected to this repository; keep this reader until that integration is ready.

## Original-flower asset to add
From the user-supplied original crystal-glass sunflower PNG, make a **pixel-preserving** crop emphasizing the upward-curled rear blossoms without long stems. The raw image stays untouched. Place the display copy at:

`public/atlas/amberina-crystal-sunflowers.webp`

The visual configuration already points to this path. The UI suppresses the image when the asset is missing rather than substituting a false illustration. **Asset upload is pending** until a binary-capable GitHub route is available.

## Important
Current office register is a shared code config, *not* a deployed D1 appointment editor or audit ledger. Further work is required to connect governance appointment actions to the database and preserve formal history.
