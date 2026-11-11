# Original Insaniquarium Deluxe browser port

This branch replaces the earlier feed/earn/buy prototype with a standalone browser host for the restored WinFish 1.1 game code. It is a community source port, not an official EA browser release.

## Implemented

- Pinned WinFish -> PopLib/SDL3 -> Emscripten 4.0.20 build, including the libopenmpt module-music decoder and OpenAL browser audio. The native port's optional auto-collect additions are disabled to retain the original controls.
- Single-thread adapters for resource loading and background work; Asyncify yields the original loop to the browser. Windows-only screensaver/registry installation stays disabled.
- Standalone `public/games/insaniquarium/` player embedded at `/games/aquarium`; No.2's transparent glass tank opens it.
- Local folder import and IndexedDB resource caching. Executables and existing userdata are excluded. Retail images/audio stay on the player's device. This version requires unpacked `properties/`, `images/` and other data folders; a lone installer or packed PAK is not accepted.
- Original save-file byte export/import; member-isolated D1 API `/api/insaniquarium-save`; serialized revision checks, durable pending local backups where browser storage is available, offline retry, and explicit conflict recovery.
- Fireboy/Watergirl builds replace their own imported directories while preserving the aquarium. Staging uses the destination filesystem, avoiding EXDEV failures.

## Verified locally

- C++ engine compiled and linked successfully to a roughly 10 MB WebAssembly binary and its JavaScript runtime.
- Ten original-engine/save tests passed, including instantiation of the real binary and a byte-identical round trip through its actual MEMFS.
- Browser runtime check passed using the same binary with `noInitialRun`; no substitute game or fake gameplay was used.
- Four Fireboy/Watergirl regression tests passed.
- Complete existing website production build passed with the generated native engine present.
- The existing full `npm test` command passed, including member privacy, photos, parliament, minigames and the Fireboy/Watergirl import regression.
- Standalone repository-wide `tsc --noEmit` currently fails on existing Cloudflare environment declarations and readonly potion-sort test fixtures. Those broader issues were not changed by this port.

## Still required before merge or deployment

1. Supply retail files from a player-owned Insaniquarium Deluxe copy. No retail assets were available during development.
2. Launch and finish the first level; verify the original sprites, hunger/growth/coins, pets, alien attacks, menus and music, then exercise the remaining game modes. Compilation is not gameplay verification.
3. Test an actual original game save, local reload, two real devices and conflicting concurrent sessions with the real engine running. API tests do not establish native save-format compatibility.
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

`ports/insaniquarium/upstream.lock.json` records the exact upstream commits. The script checks out a dedicated ignored `work/` tree, normalizes the source line endings required by upstream fixups, fails on partial patches, applies browser adapters, and stages the generated engine under `public/games/insaniquarium/engine/`. Binary build products are not checked into Git. They must be generated before packaging the website.

The dedicated GitHub Actions workflow publishes an engine + matching source artifact. It does not deploy or migrate production. To rebuild from its prepared source archive, extract it, activate Emscripten, and configure `ports/insaniquarium` with `-DINSANIQUARIUM_SOURCE=<absolute extracted upstream directory>`, then build with CMake/Ninja.

## Source and resource distribution

WinFish restored code, PopLib and third-party dependencies retain their upstream license status. PopLib/native-port modifications use AGPL-3.0. Keep attribution and supply the matching engine source to recipients of the compiled engine. The source-bundle script excludes build products and retail data. The surrounding website communicates with the separate engine through a file/save API. No redistribution permission for PopCap graphics or audio is asserted by this project.
