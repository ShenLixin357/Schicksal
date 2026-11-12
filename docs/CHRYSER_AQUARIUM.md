# Original Insaniquarium Deluxe browser port

This branch replaces the earlier feed/earn/buy prototype with a standalone browser host for the restored WinFish 1.1 game code. It is a community source port, not an official EA browser release.

## Implemented

- Pinned WinFish -> PopLib/SDL3 -> Emscripten 4.0.20 build, including the libopenmpt module-music decoder and OpenAL browser audio. The native port's optional auto-collect additions are disabled to retain the original controls.
- Single-thread adapters for resource loading and background work; Asyncify yields the original loop to the browser. Windows-only screensaver/registry installation stays disabled.
- Standalone `public/games/insaniquarium/` player embedded at `/games/aquarium`; No.2's transparent glass tank opens it.
- Local ZIP or folder import and IndexedDB resource caching. The ZIP reader uses vendored fflate 0.8.2, checks resource sizes before inflation and excludes executables, desktop DRM, userdata and unsafe paths. Original `.au` sound effects are accepted. Retail images/audio stay on the player's device. A lone installer or packed PAK is not accepted.
- Original save-file byte export/import; member-isolated D1 API `/api/insaniquarium-save`; serialized revision checks, durable pending local backups where browser storage is available, offline retry, and explicit conflict recovery.
- Fireboy/Watergirl builds replace their own imported directories while preserving the aquarium. Staging uses the destination filesystem, avoiding EXDEV failures.

## Verified locally

- C++ engine compiled and linked successfully to a roughly 10 MB WebAssembly binary and its JavaScript runtime.
- Twelve original-engine/save/import tests passed, including instantiation of the real binary, a byte-identical round trip through its actual MEMFS, stored/deflated ZIP imports and rejection of oversized or malformed archives.
- Browser runtime check passed using the same binary with `noInitialRun`; no substitute game or fake gameplay was used.
- On 2026-11-12 the supplied game ZIP imported 602 original resource files. The actual engine reached the original title, new-user dialog, main menu, tutorial and Adventure 1-1. Feeding deducted money, and the native game produced its original registry, adventure, profile and users files (421 / 896 / 232 / 22 bytes in that test).
- Real input exposed an Emscripten 4.0.20 OpenAL crash when resetting a stopped sound with `AL_SEC_OFFSET`. The adapter now calls `alSourceRewind`, resetting the processed-buffer index before replay. The rebuilt engine passed the same menu clicks and first-level input without that error.
- Reopened the browser game, restored all four native save files, recognized the existing player and continued Adventure 1-1 with its fish and the saved $185 balance. A separate Windows-created save and real cross-device continuation remain untested.
- Four Fireboy/Watergirl regression tests passed.
- Complete existing website production build passed with the generated native engine present.
- The existing full `npm test` command passed, including member privacy, photos, parliament, minigames and the Fireboy/Watergirl import regression.
- Standalone repository-wide `tsc --noEmit` currently fails on existing Cloudflare environment declarations and readonly potion-sort test fixtures. Those broader issues were not changed by this port.

## Still required before merge or deployment

1. Finish the first level and check growth/coins, pets, alien attacks and the remaining game modes. Entering Adventure 1-1 is not full gameplay verification. Audio loaded without errors after the rewind fix; audible playback has not been independently confirmed.
2. Test a Windows-created save separately, then test two real devices and conflicting concurrent sessions with the real engine running. API tests alone do not establish these outcomes.
3. Let the packaging workflow finish and verify its generated runtime/source commit before merging. It compiles the pinned engine, runs save/import tests and saves only the engine and matching source archive into the same private branch. It checks the branch head before pushing and does not force-push. Fresh Cloudflare checkouts then have the files required by `npm run build`; retail artwork/audio remain local imports.
4. Verify desktop Chrome/Safari and iOS/Android touch behavior. Mouse emulation is not a complete phone input test.
5. Build the engine with the recipe below, deploy its matching runtime AND source bundle, apply migration `0009_member_insaniquarium_saves.sql` to the correct D1 database, and validate real member sessions. Production migration has not been applied.

Do not merge or deploy this draft until the resource-dependent checks pass. The earlier `member_aquarium_saves` table/API is retained as legacy data; it is not compatible with original game saves and is no longer used by the game page.

## Build

Activate the official Emscripten 4.0.20 SDK, install CMake >=3.26 and Ninja, then run:

```sh
npm run game:build-native
npm run test:insaniquarium
npm run build
```

`ports/insaniquarium/upstream.lock.json` records the exact upstream commits. The script checks out a dedicated ignored `work/` tree, normalizes the source line endings required by upstream fixups, fails on partial patches, applies browser adapters, stages the generated engine and bundles its matching source. The packaging workflow commits verified engine/source release files to the same private branch so Cloudflare can build a fresh checkout. Edit the port sources and let the workflow refresh these files. The build rejects a runtime whose browser-adapter hash differs from the current sources.

The dedicated GitHub Actions workflow publishes an engine + matching source artifact. It does not deploy or migrate production. To rebuild from its prepared source archive, extract it, activate Emscripten, and configure `ports/insaniquarium` with `-DINSANIQUARIUM_SOURCE=<absolute extracted upstream directory>`, then build with CMake/Ninja.

## Source and resource distribution

WinFish restored code, PopLib and third-party dependencies retain their upstream license status. PopLib/native-port modifications use AGPL-3.0. Keep attribution and supply the matching engine source to recipients of the compiled engine. The source-bundle script excludes build products and retail data. The surrounding website communicates with the separate engine through a file/save API. No redistribution permission for PopCap graphics or audio is asserted by this project.

