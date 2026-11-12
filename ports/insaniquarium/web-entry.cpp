#include "WinFishApp.h"
#include "Board.h"
#include "ProfileMgr.h"
#include <SDL3/SDL_main.h>
#include <emscripten.h>

static PopLib::WinFishApp* webApp = nullptr;
static bool saveRequested = false;
static bool readyReported = false;

extern "C" EMSCRIPTEN_KEEPALIVE void schicksal_request_save()
{
    // Execute on the game loop, never re-enter a suspended Asyncify stack.
    saveRequested = true;
}

extern "C" void schicksal_web_pump()
{
    if (!webApp || webApp->mShutdown) return;
    if (!readyReported && webApp->mLoaded) {
        readyReported = true;
        EM_ASM({ if (Module['schicksalOnReady']) Module['schicksalOnReady'](); });
    }
    if (!saveRequested || !webApp->mLoaded) return;
    saveRequested = false;
    webApp->SaveCurrentUserData();
    if (webApp->mCurrentProfile && webApp->mBoard)
        webApp->mBoard->SaveCurrentGame();
    if (webApp->mProfileMgr) webApp->mProfileMgr->SaveUsersDat();
    webApp->WriteToRegistry();
    EM_ASM({ if (Module['schicksalOnSave']) Module['schicksalOnSave'](); });
}

int main(int, char**)
{
    webApp = new PopLib::WinFishApp();
    if (webApp->mShutdown) return 1;
    webApp->mIsWindowed = true;
    webApp->Init();
    webApp->Start();
    webApp->Shutdown();
    delete webApp;
    webApp = nullptr;
    return 0;
}
