#include "workerthread.hpp"
using namespace PopLib;
WorkerThread::WorkerThread(const std::string& name)
  : mName(name), mThread(nullptr), mMutex(nullptr), mCond(nullptr),
    mSignalEvent(nullptr), mDoneEvent(nullptr), mTask(nullptr), mTaskArg(nullptr),
    mStopped(false), mTaskPending(false) {}
WorkerThread::~WorkerThread() = default;
void WorkerThread::DoTask(void (*task)(void*), void* arg) {
    mTaskPending = true;
    if (task) task(arg);
    mTaskPending = false;
}
void WorkerThread::WaitForTask() {}
bool WorkerThread::IsProcessingTask() { return mTaskPending; }
int WorkerThread::StaticThreadProc(void*) { return 0; }
void WorkerThread::ThreadProc() {}
