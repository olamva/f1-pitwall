import { useEffect, useSyncExternalStore } from "react";

const subscribe = (change: () => void) => {
  document.addEventListener("visibilitychange", change);
  return () => document.removeEventListener("visibilitychange", change);
};

export const useVisible = () =>
  useSyncExternalStore(subscribe, () => !document.hidden);

export const useAwake = () => {
  useEffect(() => {
    if (!navigator.wakeLock) return;
    let lock: Promise<WakeLockSentinel | void> | undefined;
    const drop = (next: typeof lock) => {
      if (lock === next) lock = undefined;
    };
    const request = () => {
      if (document.hidden || lock) return;
      const next: Promise<WakeLockSentinel | void> = navigator.wakeLock
        .request("screen")
        .then(
          (l) => ((l.onrelease = () => drop(next)), l),
          () => drop(next),
        );
      lock = next;
    };
    const renew = () => {
      void lock?.then((l) => l?.release());
      lock = undefined;
      request();
    };
    request();
    addEventListener("pointerup", request);
    document.addEventListener("visibilitychange", request);
    document.addEventListener("fullscreenchange", renew);
    return () => {
      removeEventListener("pointerup", request);
      document.removeEventListener("visibilitychange", request);
      document.removeEventListener("fullscreenchange", renew);
      void lock?.then((l) => l?.release());
    };
  }, []);
};
