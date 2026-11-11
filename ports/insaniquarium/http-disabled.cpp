// The desktop updater and score upload target retired PopCap services.
// Browser cloud saves use the authenticated Schicksal API outside the engine.
#include "httptransfer.hpp"
using namespace PopLib;
HTTPTransfer::HTTPTransfer()
  : mTransferId(0), mSocket(0), mPort(0), mContentLength(0),
    mTransferPending(false), mThreadRunning(false), mExiting(false),
    mAborted(false), mResult(RESULT_NOT_STARTED) {}
HTTPTransfer::~HTTPTransfer() = default;
void HTTPTransfer::Fail(int result) { mResult = result; mContent.clear(); mContentLength = 0; }
std::string HTTPTransfer::GetAbsURL(const std::string& base, const std::string& rel) { return base + rel; }
void HTTPTransfer::PrepareTransfer(const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::StartTransfer() { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::GetHelper(const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::PostHelper(const std::string&, const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::GetThreadProc() { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::GetThreadProcStub(void*) {}
void HTTPTransfer::UpdateStatus() {}
bool HTTPTransfer::SocketWait(bool, bool) { return false; }
void HTTPTransfer::Get(const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::Get(const std::string&, const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::Post(const std::string&, const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::Post(const std::string&, const std::string&, const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::SendRequestString(const std::string&, const std::string&) { Fail(RESULT_CONNECT_FAIL); }
void HTTPTransfer::Reset() { mResult = RESULT_NOT_STARTED; mContent.clear(); mContentLength = 0; }
void HTTPTransfer::Abort() { mAborted = true; Fail(RESULT_ABORTED); }
void HTTPTransfer::WaitFor() {}
int HTTPTransfer::GetResultCode() { return mResult; }
std::string HTTPTransfer::GetContent() { return mContent; }
