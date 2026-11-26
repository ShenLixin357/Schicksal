export const PASSAGE_SKIP_LABEL = "跳过动画";

export function createPassageGate({ onSwap, onFinish, onWait, onFailure }: {
  onSwap: () => void;
  onFinish: () => void;
  onWait: () => void;
  onFailure: () => void;
}, destinationReady = false) {
  let ready = destinationReady;
  let swapped = false;
  let motionFinished = false;
  let closed = false;

  function swap() {
    if (closed || !ready) return false;
    if (!swapped) {
      swapped = true;
      onSwap();
    }
    return true;
  }

  function complete() {
    if (!swap()) return;
    closed = true;
    onFinish();
  }

  return {
    swap,
    finishMotion() {
      if (closed || motionFinished) return;
      motionFinished = true;
      if (ready) complete();
      else onWait();
    },
    destinationReady() {
      if (closed) return;
      ready = true;
      if (motionFinished) complete();
    },
    destinationFailed() {
      if (closed || ready) return;
      closed = true;
      onFailure();
    },
    cancel() { closed = true; },
  };
}
