import { useSyncExternalStore } from "react";
import { save, subscribe } from "./synced.ts";

export const setProjectedLap = (on: boolean) => save("projectedLap", on);

export const useProjectedLap = () =>
  useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("projectedLap") === "true",
  );
