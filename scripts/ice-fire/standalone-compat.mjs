// Platform progress reporting is optional on our independent game host.
export function optionalPlatformProgress(source) {
  const call = "h5api.progress(a)";
  if (source.split(call).length !== 2) {
    throw new Error("Unexpected platform progress call; review the pinned game source");
  }
  return source.replace(call, '(window.h5api && typeof window.h5api.progress === "function" ? window.h5api.progress(a) : void 0)');
}
