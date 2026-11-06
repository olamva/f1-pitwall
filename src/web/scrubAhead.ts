import { useSyncExternalStore } from "react";
import { save, subscribe } from "./synced.ts";

export const setScrubAhead = (on: boolean) => save("scrubAhead", on);

export const useScrubAhead = () =>
  useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("scrubAhead") === "true",
  );
