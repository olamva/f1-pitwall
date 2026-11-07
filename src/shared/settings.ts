export const MAX_DELAY_S = 300;

const int = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const list = (v: any, max: number, valid: (item: any) => boolean) =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((i) => i?.constructor === Object && valid(i));

const layout = (v: any) =>
  v === null ||
  list(
    v,
    6,
    (c) =>
      Object.keys(c).length === 2 &&
      int(c.w, 1, 24) &&
      list(
        c.tiles,
        30,
        (t) =>
          Object.keys(t).length === 2 &&
          /^[a-z]{1,20}$/.test(t.id) &&
          (t.h === null || int(t.h, 4, 500)),
      ),
  );

const checks: Record<string, (v: any) => boolean> = {
  delay: (v) => typeof v === "number" && v >= 0 && v <= MAX_DELAY_S,
  layoutPhone: layout,
  layoutTablet: layout,
  layoutDesktop: layout,
  layoutDisplay: layout,
  favourite: (v) =>
    v === null ||
    (/^[a-z0-9_]+$/.test(v?.id) &&
      /^[A-Z]{3}$/.test(v?.code) &&
      Object.keys(v).length === 2),
  scrubAhead: (v) => typeof v === "boolean",
  team: (v) => v === null || (typeof v === "string" && /^[a-z0-9_]+$/.test(v)),
};

export const SYNCED = Object.keys(checks);

export const validSettings = (patch: any) =>
  patch?.constructor === Object &&
  Object.entries(patch).every(
    ([key, value]) => Object.hasOwn(checks, key) && checks[key]!(value),
  );
