# Original Insaniquarium Deluxe browser port

This branch replaces the earlier feed/earn/buy prototype with a standalone browser host for the restored WinFish 1.1 game code. It is a community source port, not an official EA browser release.

## Implemented

- Pinned WinFish -> PopLib/SDL3 -> Emscripten 4.0.20 build, including the libopenmpt module-music decoder and OpenAL browser audio. The native port's optional auto-collect additions are disabled to retain the original controls.
- Single-thread adapters for resource loading and background work; Asyncify yields the original loop to the browser. Windows-only screensaver/registry installation stays disabled.
- Standalone `public/games/insaniquarium/` player embedded at `/games/aquarium`; No.2's transparent glass tank opens it.
- Original images, music, fonts and effects are hosted by the private website and load automatically for every authenticated member. Players never select a ZIP or game folder. The owner-supplied resource pack contains 602 files (including 15 AU effects), excludes executables/desktop DRM/userdata, and is delivered in four fingerprinted parts with SHA-256 verification. Optional browser caching is keyed by that hash; missing, stale or damaged caches download again, and disabled storage does not prevent online play.
- Original save-file byte export/import; member-isolated D1 API `/api/insaniquarium-save`; serialized revision checks, durable pending local backups where browser storage is available, offline retry, and explicit conflict recovery.
- Fireboy/Watergirl builds replace their own imported directories while preserving the aquarium. Staging uses the destination filesystem, avoiding EXDEV failures.

## Verified locally

- C++ engine compiled and linked successfully to a roughly 10 MB WebAssembly binary and its JavaScript runtime.
- Twenty engine/save/resource tests pass, including two empty device caches automatically loading the hosted resources without a local file, disabled-storage startup, damaged-cache replacement, browser fetch receiver regressions and validation of the complete shipped pack. The real WebAssembly filesystem and original save bytes are also checked.
- On 2026-11-13 the actual standalone player reached the original title in Chrome by automatically downloading the hosted pack; no local file was selected and the ZIP/folder controls were absent. This local browser check used fixture member/save GET responses; it does not establish authenticated production saves or physical cross-device continuation.
- Browser runtime check passed using the same binary with `noInitialRun`; no substitute game or fake gameplay was used.
- On 2026-11-12 the supplied game ZIP imported 602 original resource files. The actual engine reached the original title, new-user dialog, main menu, tutorial and Adventure 1-1. Feeding deducted money, and the native game produced its original registry, adventure, profile and users files (421 / 896 / 232 / 22 bytes in that test).
- Real input exposed an Emscripten 4.0.20 OpenAL crash when resetting a stopped sound with `AL_SEC_OFFSET`. The adapter now calls `alSourceRewind`, resetting the processed-buffer index before replay. The rebuilt engine passed the same menu clicks and first-level input without that error.
- Reopened the browser game, restored all four native save files, recognized the existing player and continued Adventure 1-1 with its fish and the saved $185 balance. A separate Windows-created save and real cross-device continuation remain untested.
- Four Fireboy/Watergirl regression tests passed.
- Complete existing website production build passed with the generated native engine present.
- The existing full `npm test` command passed, including member privacy, photos, parliament, minigames and the Fireboy/Watergirl import regression.
- Standalone repository-wide `tsc --noEmit` currently fails on existing Cloudflare environment declarations and readonly potion-sort test fixtures. Those broader issues were not changed by this port.

## Verification limits

1. Finish the first level and check growth/coins, pets, alien attacks and the remaining game modes. Entering Adventure 1-1 is not full gameplay verification. Audio loaded without errors after the rewind fix; audible playback has not been independently confirmed.
2. Test a Windows-created save separately, then test two real devices and conflicting concurrent sessions with the real engine running. API tests alone do not establish these outcomes.
3. Native packaging verifies committed runtime/adapter/source hashes and reuses an unchanged engine. It rebuilds C++ only when those checks fail, then saves generated engine/source files to the same private branch without force-pushing. Every website build also verifies that the hosted game resources are complete.
4. Verify desktop Chrome/Safari and iOS/Android touch behavior. Mouse emulation is not a complete phone input test.
5. The Cloudflare deployment command applies pending D1 migrations before deployment. An authenticated production game/save session has not been independently exercised by the browser tests; local API tests use the real routes with SQLite and authenticated member sessions.

The earlier `member_aquarium_saves` table/API is retained as legacy data; it is not compatible with original game saves and is no longer used by the game page.

## Build

Normal website changes use the checked-in verified runtime and hosted resources: run `npm run test:insaniquarium` and `npm run build`. To change native port sources, activate Emscripten 4.0.20, install CMake >=3.26 and Ninja, then run:

```sh
npm run game:build-native
npm run test:insaniquarium
npm run build
```

`ports/insaniquarium/upstream.lock.json` records the exact upstream commits. The script checks out a dedicated ignored `work/` tree, normalizes the source line endings required by upstream fixups, fails on partial patches, applies browser adapters, stages the generated engine and bundles its matching source. The packaging workflow commits verified engine/source release files to the same private branch so Cloudflare can build a fresh checkout. Edit the port sources and let the workflow refresh these files. The build rejects a runtime whose browser-adapter hash differs from the current sources.

The dedicated GitHub Actions workflow publishes an engine + matching source artifact. It does not deploy or migrate production. To rebuild from its prepared source archive, extract it, activate Emscripten, and configure `ports/insaniquarium` with `-DINSANIQUARIUM_SOURCE=<absolute extracted upstream directory>`, then build with CMake/Ninja.

## Source and resource distribution

WinFish restored code, PopLib and third-party dependencies retain their upstream license status. PopLib/native-port modifications use AGPL-3.0. Keep attribution and supply the matching engine source to recipients of the compiled engine. The source-bundle script excludes build products and retail data. The surrounding website communicates with the separate engine through a file/save API. No redistribution permission for PopCap graphics or audio is asserted by this project.


