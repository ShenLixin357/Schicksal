# Imperial shell / preview branch

This directory owns **navigation chrome**, not the parliament, Lounge art, member identity, or the Work-authored Library Lab.

## Ownership

- `navigation.ts`: one source for the seven visible sidebar entries, their original-style tiny English subtitles, icon IDs and the two submenu lists.
- `imperial-sidebar.tsx`: logo, collapse toggle, phone shortcut (a placeholder), main navigation and preserved online-member footer.
- `sidebar-menu-group.tsx`: shared keyboard/aria-aware state for the expandable Collection and Points submenus; expanding the collapsed sidebar must not navigate to a content view.
- `navigation-icons.tsx`: approved line icons, including a **confetti party-popper cone** for Festivals, not fireworks.
- `shell.css`: isolated sidebar appearance. Respect the site-wide `--serif`/`--sans` family and the original normal navigation text colour `#738095`. English subtitles remain visually subdued. Narrow mobile menus hide English for legibility.
- `placeholder.tsx` + `placeholder.css`: only the title and **即将开放**. Do not mount the existing Messenger UI or invent a replacement Library Lab.

## Guardrails

The shared eight-ray emblem is the existing `Emblem compact`, not a redrawn or recoloured asset.
Only existing Lounge members (`amberina`, `zxy`, `truth`) may trigger the portal. The nonmember logo button must be inert, including no animation, sound or navigation. Existing permission checks also remain in the parent system. The portal transition itself lives in `../transitions/lounge-passage.tsx` and its four-second duration/skip interaction should be tested separately.

The personal profile is the seventh entry. Clicking it must show the **signed-in user's own** profile, not the last public profile visited via the Atlas.

`帝国政务` remains its own destination, entirely independent of `帝国简报台`. `积分` expands to `积分与荣誉` and `跳蚤市场`; `帝国馆藏` expands to the Library placeholder, Atlas, Photos and Archives.

**Deployment:** only preview branch/preview Worker with a separate D1. PR must stay Draft; do not merge to `main` without explicit owner approval.
