import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { save, subscribe } from "../synced.ts";
import { SIZES, tidy, type Column, type Size } from "./layout.ts";
import { decode, encode, KEYS } from "./share.ts";
import { DEFAULT_LAYOUT, isWidget } from "./widgets.ts";

export const copyLayouts = () =>
  encode(
    Object.fromEntries(
      SIZES.map((s) => [
        s,
        JSON.parse(localStorage.getItem(KEYS[s]) ?? "null") ??
          DEFAULT_LAYOUT[s],
      ]),
    ),
  );

export const pasteLayouts = (text: string) => {
  const layouts = decode(text);
  if (layouts) SIZES.forEach((s) => save(KEYS[s], layouts[s] ?? null));
  return !!layouts;
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
  const [before, setBefore] = useState<[string, string | null][]>([]);
  useLayoutEffect(() => {
    if (editing)
      setBefore(Object.values(KEYS).map((k) => [k, localStorage.getItem(k)]));
  }, [editing]);
  const changed = ([k, v]: [string, string | null]) =>
    v !== localStorage.getItem(k);
  const dirty = useSyncExternalStore(subscribe, () => before.some(changed));
  return dirty
    ? () =>
        before
          .filter(changed)
          .forEach(([k, v]) => save(k, JSON.parse(v ?? "null")))
    : undefined;
};
