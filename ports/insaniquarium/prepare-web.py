"""Apply small, checked platform adapters to the pinned native port.

Run upstream port/port.sh first. Game rules and retail resources are untouched.
"""
from pathlib import Path
import re
import shutil
import sys

root = Path(sys.argv[1]).resolve()
here = Path(__file__).resolve().parent

def edit(relative, fn):
    path = root / relative
    text = path.read_text()
    if "SCHICKSAL_WEB_ADAPTER" in text:
        return
    updated = fn(text)
    if updated == text:
        raise RuntimeError(f"No adapter applied: {relative}")
    path.write_text("// SCHICKSAL_WEB_ADAPTER\n" + updated if path.suffix != ".txt" else "# SCHICKSAL_WEB_ADAPTER\n" + updated)

def function(text, signature, body):
    begin = text.index(signature)
    start = text.index("{", begin)
    depth = 1
    end = start + 1
    while depth:
        if text[end] == "{": depth += 1
        if text[end] == "}": depth -= 1
        end += 1
    return text[:start] + "{\n" + body + "\n}" + text[end:]

def dependencies(text):
    assert text.count("add_subdirectory(external/openal EXCLUDE_FROM_ALL)") == 1
    text = text.replace("add_subdirectory(external/openal EXCLUDE_FROM_ALL)",
        "add_library(web_openal INTERFACE)\nadd_library(OpenAL::OpenAL ALIAS web_openal)\ntarget_link_libraries(web_openal INTERFACE -lopenal)")
    assert text.count("add_subdirectory(external/curl EXCLUDE_FROM_ALL)") == 1
    return text.replace("add_subdirectory(external/curl EXCLUDE_FROM_ALL)",
        "add_library(web_curl INTERFACE)\nadd_library(CURL::libcurl ALIAS web_curl)")

edit("poplib/CMakeLists.txt", dependencies)
edit("poplib/PopLib/common.hpp", lambda t: '#include <sys/types.h>\n' + t)
edit("poplib/PopLib/misc/httptransfer.hpp", lambda t: t.replace('#include "curl/curl.h"', "// Retired desktop networking is disabled in the web build."))
shutil.copyfile(here / "http-disabled.cpp", root / "poplib/PopLib/misc/httptransfer.cpp")
shutil.copyfile(here / "worker-single.cpp", root / "poplib/PopLib/misc/workerthread.cpp")

def appbase(text):
    text = '#include <emscripten.h>\nextern "C" void schicksal_web_pump();\n' + text
    text = function(text, "void AppBase::StartLoadingThread()", """
    if (!mLoadingThreadStarted) {
        mLoadingThreadStarted = true;
        mYieldMainThread = false;
        LoadingThreadProcStub(this);
    }""")
    text = function(text, "void AppBase::StartCursorThread()", "    // Browser pointer events are processed on the main thread.")
    # The source contains an old, commented-out DoMainLoop before the real one.
    pos = text.index("void AppBase::DoMainLoop()", text.index("void AppBase::DoMainLoop()") + 1)
    prefix, tail = text[:pos], text[pos:]
    tail = function(tail, "void AppBase::DoMainLoop()", """
    while (!mShutdown) {
        if (mExitToTop) mExitToTop = false;
        UpdateApp();
        schicksal_web_pump();
        emscripten_sleep(1);
    }""")
    return prefix + tail

edit("poplib/PopLib/appbase.cpp", appbase)
edit("poplib/PopLib/common.cpp", lambda t: function(t, "static std::string ComputeAppDataFolder()", '    return "/saves/";'))
shutil.copyfile(here / "web-entry.cpp", root / "port/winfish/Window.cpp")
# Upstream vendors the decoder without its generated SVN metadata header.
metadata = root / "poplib/external/libopenmpt/build/svn_version/svn_version.h"
metadata.parent.mkdir(parents=True, exist_ok=True)
metadata.write_text("/* Vendored source snapshot; no SVN working-copy metadata. */\n")
print("Prepared original WinFish code for the browser (single thread + Asyncify).")
