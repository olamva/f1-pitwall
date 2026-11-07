import { validSettings } from "../../shared/settings.ts";
import { SIZES, type Column, type Size } from "./layout.ts";

export type Layouts = Partial<Record<Size, Column[]>>;

export const KEYS: Record<Size, string> = {
  phone: "layoutPhone",
  tablet: "layoutTablet",
  desktop: "layoutDesktop",
  display: "layoutDisplay",
};

const CODES: Record<Size, string> = {
  phone: "p",
  tablet: "t",
  desktop: "d",
  display: "x",
};

export const encode = (layouts: Layouts) =>
  SIZES.filter((s) => layouts[s])
    .map(
      (s) =>
        `${CODES[s]}=${layouts[s]!.map(
          (c) =>
            `${c.w}:${c.tiles.map((t) => (t.h === null ? t.id : `${t.id}.${t.h}`)).join(",")}`,
        ).join("|")}`,
    )
    .join(";");

const parse = (text: string): Layouts =>
  Object.fromEntries(
    text
      .trim()
      .split(";")
      .map((part) => {
        const [code, columns = ""] = part.split("=");
        return [
          SIZES.find((s) => CODES[s] === code),
          columns.split("|").map((c) => {
            const [w, tiles = ""] = c.split(":");
            return {
              w: Number(w),
              tiles: tiles.split(",").map((t) => {
                const [id, h] = t.split(".");
                return { id, h: h === undefined ? null : Number(h) };
              }),
            };
          }),
        ];
      }),
  );

export const decode = (text: string) => {
  const layouts = parse(text);
  const sizes = Object.keys(layouts) as Size[];
  const ids = (s: Size) => layouts[s]!.flatMap((c) => c.tiles.map((t) => t.id));
  return sizes.every((s) => SIZES.includes(s)) &&
    sizes.every((s) => new Set(ids(s)).size === ids(s).length) &&
    validSettings(Object.fromEntries(sizes.map((s) => [KEYS[s], layouts[s]])))
    ? layouts
    : null;
};
