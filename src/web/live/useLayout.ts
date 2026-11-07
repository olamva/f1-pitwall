import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { save, subscribe } from "../synced.ts";
import { tidy, type Column, type Size } from "./layout.ts";
import { DEFAULT_LAYOUT, isWidget } from "./widgets.ts";

const KEYS: Record<Size, string> = {
  phone: "layoutPhone",
  tablet: "layoutTablet",
  desktop: "layoutDesktop",
};

export const useLayout = (size: Size) => {
  const raw = useSyncExternalStore(subscribe, () =>
    localStorage.getItem(KEYS[size]),
  );
  const columns = useMemo<Column[]>(
    () =>
      tidy(
        (JSON.parse(raw ?? "null") ?? DEFAULT_LAYOUT[size]).map(
          (c: Column) => ({
            ...c,
            tiles: c.tiles.filter((t) => isWidget(t.id)),
          }),
        ),
      ),
    [raw, size],
  );
  return [columns, (next: Column[]) => save(KEYS[size], tidy(next))] as const;
};

export const useDiscard = (editing: boolean) => {
  const before = useRef<[string, string | null][]>([]);
  useEffect(() => {
    if (editing)
      before.current = Object.values(KEYS).map((k) => [
        k,
        localStorage.getItem(k),
      ]);
  }, [editing]);
  return () =>
    before.current.forEach(
      ([k, v]) =>
        v !== localStorage.getItem(k) && save(k, JSON.parse(v ?? "null")),
    );
};
