#!/usr/bin/env bash
set -euo pipefail
PROJECT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
PORT="$PROJECT/ports/insaniquarium"
SOURCE="${INSANIQUARIUM_SOURCE:-$PROJECT/work/insaniquarium-source}"
BUILD="${INSANIQUARIUM_BUILD:-$PROJECT/work/insaniquarium-build}"
command -v emcmake >/dev/null || { echo 'Activate Emscripten 4.0.20 before building.' >&2; exit 1; }
command -v cmake >/dev/null
command -v ninja >/dev/null
if [ ! -d "$SOURCE/.git" ]; then
  git clone --no-checkout https://github.com/SaMeiers/insaniquarium-port.git "$SOURCE"
  git -C "$SOURCE" checkout 95d4aafe408b36e8a195982ad7acbae5fb6a0b33
fi
test "$(git -C "$SOURCE" rev-parse HEAD)" = 95d4aafe408b36e8a195982ad7acbae5fb6a0b33
git -C "$SOURCE" submodule update --init --depth 1 poplib external/winfish
git -C "$SOURCE/poplib" submodule update --init --depth 1 external/SDL external/SDL_ttf external/ogg external/vorbis external/miniaudio external/zlib external/tinyxml2
git -C "$SOURCE/poplib/external/SDL_ttf" submodule update --init --depth 1 external/freetype
python "$PORT/prepare-source.py" "$SOURCE" "$BUILD/normalized-input"
python "$PORT/prepare-web.py" "$SOURCE"
emcmake cmake -S "$PORT" -B "$BUILD" -G Ninja -DCMAKE_BUILD_TYPE=Release -DINSANIQUARIUM_SOURCE="$SOURCE"
cmake --build "$BUILD" --parallel "${INSANIQUARIUM_JOBS:-4}"
python "$PORT/stage-build.py" "$PROJECT" "$SOURCE" "$BUILD"
