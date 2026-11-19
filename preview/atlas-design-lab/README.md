# Schicksal Atlas · independent visual design lab

This directory is an **independent, public, static-only visual prototype**. It is not the Schicksal production application.

- Worker: `schicksal-atlas-design-lab` (must not equal `schicksal` or any established preview Worker).
- Static files only. The Wrangler configuration contains **no D1, R2, account authentication, Supabase, or production secrets**.
- Do not copy account data, member passwords, private chat, or photographs into this preview.
- All names, offices and colours here are demonstration data; responsibilities are explicitly draft copy.
- Art under `assets/` is kept separate and replaceable. The Simple emblem is the original official artwork; do not recolour or redraw it.
- Visual style follows the user's approved stained-glass and Art Nouveau direction while preserving the existing minimalist sidebar aesthetics.
- This is intentionally **not automatically merged into main**.

To inspect locally: open `index.html` in Safari or run a static file server from this folder.

To publish: the dedicated GitHub Actions workflow requires separate preview Cloudflare credentials. Its URL is only considered valid after a passing smoke test.
