import { execFileSync } from "node:child_process";
import type { Page } from "playwright-core";

type Point = { x: number; y: number };

const point = async (page: Page, spec: string, from?: Point) => {
  const rel = /^([+-][\d.]+),([+-]?[\d.]+)$/.exec(spec);
  if (rel && from)
    return { x: from.x + Number(rel[1]), y: from.y + Number(rel[2]) };
  const abs = /^([\d.]+),([\d.]+)$/.exec(spec);
  if (abs) return { x: Number(abs[1]), y: Number(abs[2]) };
  const target = page.locator(spec).filter({ visible: true }).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`${spec} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const pointer = async (page: Page, touch: boolean) => {
  if (!touch)
    return {
      down: async (p: Point) => {
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
      },
      move: (p: Point) => page.mouse.move(p.x, p.y),
      up: () => page.mouse.up(),
    };
  const cdp = await page.context().newCDPSession(page);
  const send = (type: string, p?: Point) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [],
    });
  return {
    down: (p: Point) => send("touchStart", p),
    move: (p: Point) => send("touchMove", p),
    up: () => send("touchEnd"),
  };
};

export const drag = async (
  page: Page,
  touch: boolean,
  from: string,
  to: string,
  hold: number,
  held: string,
) => {
  const a = await point(page, from);
  const b = await point(page, to, a);
  const hand = await pointer(page, touch);
  const start = Date.now();
  await hand.down(a);
  await page.waitForTimeout(hold);
  for (let i = 1; i <= 30; i++) {
    await hand.move({
      x: a.x + ((b.x - a.x) * i) / 30,
      y: a.y + ((b.y - a.y) * i) / 30,
    });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: held, timeout: 30_000 });
  await hand.up();
  await page.waitForTimeout(400);
  return [start, Date.now()] as const;
};

export const sheets = async (
  page: Page,
  video: string,
  out: string,
  closed: number,
  span?: readonly [number, number],
) => {
  await page.video()!.saveAs(video);
  const length = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      video,
    ],
    { encoding: "utf8" },
  );
  const start = closed - 1000 * Number(length);
  const window = span
    ? [
        "--from",
        String(Math.max(0, (span[0] - start) / 1000 - 0.2)),
        "--to",
        String((span[1] - start) / 1000),
      ]
    : [];
  const args = ["scripts/frames.ts", video, "--fps", "10", "--out", out];
  return [
    video,
    ...execFileSync(process.execPath, [...args, ...window], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("  ")[0]!),
  ];
};
