export const MAX_DELAY_S = 300;

const int = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const items = (v: any) =>
  Array.isArray(v) &&
  v.length <= 40 &&
  v.every(
    (i) =>
      i?.constructor === Object &&
      Object.keys(i).length === 4 &&
      /^[a-z]{1,20}$/.test(i.id) &&
      int(i.x, 0, 11) &&
      int(i.w, 1, 12 - i.x) &&
      (i.h === null || int(i.h, 4, 500)),
  );

const checks: Record<string, (v: any) => boolean> = {
  delay: (v) => typeof v === "number" && v >= 0 && v <= MAX_DELAY_S,
  layout: (v) =>
    v === null ||
    (v?.constructor === Object &&
      Object.keys(v).length === 3 &&
      items(v.phone) &&
      items(v.tablet) &&
      items(v.desktop)),
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
