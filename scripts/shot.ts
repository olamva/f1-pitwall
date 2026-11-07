import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  chromium,
  webkit,
  type Browser,
  type Page,
  type Request,
} from "playwright-core";
import { checkout, git } from "./checkout.ts";

const SIZES = {
  phone: { width: 430, height: 932, deviceScaleFactor: 2, isMobile: true },
  ipad: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
};
const SNAPSHOT = 30_000;

process.on("uncaughtException", (error) => {
  console.error(error.message);
  process.exit(1);
});

const { values: o, positionals: paths } = parseArgs({
  allowPositionals: true,
  options: {
    before: { type: "string" },
    theme: { type: "string", default: "both" },
    size: { type: "string", default: "phone" },
    browser: { type: "string", default: "webkit" },
    favourite: { type: "string" },
    team: { type: "string" },
    layout: { type: "string" },
    replay: { type: "string", default: process.env.LIVE_REPLAY },
    from: { type: "string", default: process.env.LIVE_REPLAY_FROM ?? "0" },
    play: { type: "string", default: "0" },
    click: { type: "string", multiple: true, default: [] },
    hover: { type: "string" },
    wait: { type: "string" },
    eval: { type: "string" },
    drag: { type: "string" },
    to: { type: "string" },
    hold: { type: "string", default: "600" },
    video: { type: "boolean", default: false },
    element: { type: "string" },
    full: { type: "boolean", default: false },
    confetti: { type: "boolean", default: false },
    animate: { type: "boolean", default: false },
    name: { type: "string" },
    out: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (o.help || !paths.length) {
  console.log(`pnpm shot <path or URL>... [options]

Start a dev server, open each path in headless WebKit and save PNG files.

  --before <ref>      Also capture <ref> (such as origin/main) as the before state
  --theme <t>         dark, light or both (default both)
  --size <s>          phone, ipad, desktop or WIDTHxHEIGHT (default phone)
  --browser <b>       webkit or chromium (default webkit)
  --favourite <id:CODE>  Favourite driver, such as piastri:PIA
  --team <id>         Favourite team, such as mclaren
  --layout <json>     Live board columns for all sizes, such as '[{"w":7,"tiles":[{"id":"tower","h":null}]}]'
  --replay <file>     Replay a recording, such as recordings/2026-bahrain-fp3.jsonl.gz
  --from <minutes>    Start the replay at this minute (default 0)
  --play <seconds>    Capture this many seconds after the replay start (default 0)
  --click <selector>  Click before the capture; repeat for more steps
  --hover <selector>  Keep the mouse on this element for the capture
  --wait <selector>   Wait for this element before the capture
  --eval <js>         Run this in the page before the capture
  --drag <point>      Press here, hold, move to --to and release before the capture
  --to <point>        End of the drag. A point is a selector, x,y or +dx,+dy from the start
  --hold <ms>         Hold time before the drag moves (default 600)
  --video             Record a video and save contact sheets of its frames
  --element <selector>  Capture only this element, without the tab bar
  --full              Capture the full page
  --confetti          Show the confetti (off by default, as it slows WebKit)
  --animate           Keep animations running and capture their current frame
  --name <name>       File name prefix (default from the path)
  --out <dir>         Output directory (default the T3 attachments directory)

Selectors are Playwright selectors: CSS, text=Reveal or role=button[name="Reveal"].
A full http URL uses that server. Then --before and --replay are not available.
With --replay, each capture gets a new server, so all images show the same moment.
A drag on phone or ipad uses touch in Chromium. It also saves a -held image before the release.`);
  process.exit(paths.length || o.help ? 0 : 1);
}

const size =
  SIZES[o.size as keyof typeof SIZES] ??
  (/^(\d+)x(\d+)$/.exec(o.size!) && {
    width: Number(o.size!.split("x")[0]),
    height: Number(o.size!.split("x")[1]),
    deviceScaleFactor: 2,
    isMobile: false,
  });
if (!size) throw new Error(`Unknown size ${o.size}`);
if (!o.drag !== !o.to) throw new Error("--drag and --to go together");
const engine = o.drag && size.isMobile ? "chromium" : o.browser;
const themes = o.theme === "both" ? ["dark", "light"] : [o.theme!];
const [id, code] = o.favourite?.split(":") ?? [];
const settings = {
  ...(o.favourite && { favourite: { id, code } }),
  ...(o.team && { team: o.team }),
  ...(o.layout &&
    Object.fromEntries(
      ["layoutPhone", "layoutTablet", "layoutDesktop"].map((key) => [
        key,
        JSON.parse(o.layout!),
      ]),
    )),
};
const out = resolve(
  o.out ??
    join(
      homedir(),
      ".t3/userdata/attachments",
      git("rev-parse", "--abbrev-ref", "HEAD").replace(/[^\w.-]+/g, "-"),
    ),
);
mkdirSync(out, { recursive: true });

const serve = async (cwd: string) => {
  const child = spawn(process.execPath, ["scripts/dev.ts"], {
    cwd,
    env: {
      ...process.env,
      PORT: "0",
      VITE_PORT: "0",
      DEV_WATCH: "0",
      ...(o.replay && {
        LIVE_REPLAY: resolve(o.replay),
        LIVE_REPLAY_FROM: o.from,
      }),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  let started = 0;
  const url = await new Promise<string>((done, fail) => {
    const read = (chunk: Buffer) => {
      log += chunk;
      if (!started && /listening on/.test(log)) started = Date.now();
      const match = /Local:\s+(http\S+?)\/?\s/.exec(log);
      if (match) done(match[1]!);
    };
    child.stdout!.on("data", read);
    child.stderr!.on("data", read);
    child.once("exit", () => fail(new Error(`Dev server exited:\n${log}`)));
    setTimeout(
      () => fail(new Error(`No dev server URL:\n${log}`)),
      30_000,
    ).unref();
  });
  return { url, child, started };
};
type Server = Awaited<ReturnType<typeof serve>>;

const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
};

const hint = async (page: Page, selector: string) => {
  const all = await page
    .locator(selector)
    .count()
    .catch(() => -1);
  if (all < 0) return "The selector is not valid.";
  if (all) return `${all} matches, but none is visible.`;
  const text = /^text=(.+)$|name="([^"]+)"|has-text\("([^"]+)"\)/
    .exec(selector)
    ?.slice(1)
    .find(Boolean)
    ?.replace(/^"|"$/g, "");
  if (!text) return "No match.";
  const near = await page.evaluate((text) => {
    const distance = (a: string, b: string) => {
      let row = [...Array(b.length + 1).keys()];
      for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++)
          next[j] = Math.min(
            row[j]! + 1,
            next[j - 1]! + 1,
            row[j - 1]! + Number(a[i - 1] !== b[j - 1]),
          );
        row = next;
      }
      return row[b.length]!;
    };
    const shown = (e: Element) => {
      const r = e.getBoundingClientRect();
      return (
        e.checkVisibility() &&
        !e.closest("[inert]") &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < innerHeight &&
        r.left < innerWidth
      );
    };
    const labels = [
      ...new Set(
        [
          ...document.querySelectorAll<HTMLElement>(
            "button, a, [role], h1, h2, h3, label, summary",
          ),
        ]
          .filter(shown)
          .map((e) =>
            e.innerText
              .trim()
              .replace(/\s+/g, " ")
              .replace(/^(.+) \1$/, "$1"),
          )
          .filter((t) => t && t.length <= 40),
      ),
    ];
    const query = text.toLowerCase();
    return labels
      .map((t) => [t, distance(t.toLowerCase(), query)] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5)
      .map(([t]) => t);
  }, text);
  return `No match. Closest visible labels: ${near.map((t) => JSON.stringify(t)).join(", ")}`;
};

const errors: string[] = [];

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

let dragged = [0, 0];

const drag = async (page: Page, held: string) => {
  const a = await point(page, o.drag!);
  const b = await point(page, o.to!, a);
  dragged = [Date.now(), 0];
  const at = (t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const steps = 30;
  if (size.isMobile) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, p?: Point) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [],
      });
    await touch("touchStart", a);
    await page.waitForTimeout(Number(o.hold));
    for (let i = 1; i <= steps; i++) {
      await touch("touchMove", at(i / steps));
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: held, timeout: SNAPSHOT });
    await touch("touchEnd");
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.waitForTimeout(Number(o.hold));
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(at(i / steps).x, at(i / steps).y);
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: held, timeout: SNAPSHOT });
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
  dragged[1] = Date.now();
};

const shoot = async (
  page: Page,
  file: string,
  warn: (t: string) => void,
  loading: () => number,
  started: number,
) => {
  const visible = (selector: string) =>
    page.locator(selector).filter({ visible: true }).first();
  const step = async (
    name: string,
    selector: string | undefined,
    run: () => Promise<unknown>,
  ) => {
    try {
      await run();
    } catch (error) {
      const message = (error as Error).message.split("\n")[0];
      const extra = selector ? `\n${await hint(page, selector)}` : "";
      throw new Error(`${name} failed: ${message}${extra}`);
    }
  };
  const settle = async () => {
    for (let end = Date.now() + 20_000; loading() && Date.now() < end;)
      await page.waitForTimeout(100);
    if (loading()) warn("API requests still open");
    await page
      .waitForFunction(
        () =>
          ![...document.querySelectorAll('[role="status"]')].some((e) =>
            e.checkVisibility(),
          ),
        undefined,
        { timeout: 20_000 },
      )
      .catch(() => warn("still loading"));
    await page
      .waitForFunction(() => document.fonts.status === "loaded")
      .catch(() => warn("fonts still loading"));
  };
  await settle();
  for (const target of o.click!) {
    await step(`--click ${target}`, target, () => visible(target).click());
    await settle();
  }
  if (o.hover) {
    await step(`--hover ${o.hover}`, o.hover, () => visible(o.hover!).hover());
    await page.waitForTimeout(400);
    await settle();
  } else await page.mouse.move(size.width - 1, 0);
  if (o.wait)
    await step(`--wait ${o.wait}`, o.wait, () => visible(o.wait!).waitFor());
  if (o.eval) await step("--eval", undefined, () => page.evaluate(o.eval!));
  if (o.drag)
    await step(`--drag ${o.drag} --to ${o.to}`, o.drag, () =>
      drag(page, file.replace(/\.png$/, "-held.png")),
    );
  if (o.element)
    await step(`--element ${o.element}`, o.element, () =>
      visible(o.element!).scrollIntoViewIfNeeded(),
    );
  if (o.replay) {
    const left = started + Number(o.play) * 1000 - Date.now();
    if (left < 0) warn(`the page was ready ${-left} ms after the --play time`);
    await page.waitForTimeout(Math.max(0, left));
  }
  await page
    .waitForFunction(() =>
      [...document.images]
        .map((i) => [i, i.getBoundingClientRect()] as const)
        .filter(
          ([i, r]) =>
            i.checkVisibility() &&
            !i.closest("[inert]") &&
            r.width * r.height > 0 &&
            r.bottom > 0 &&
            r.right > 0 &&
            r.top < innerHeight &&
            r.left < innerWidth,
        )
        .every(([i]) => i.complete),
    )
    .catch(() => warn("images still loading"));
  await page.waitForTimeout(300);
  const shot = {
    path: file,
    animations: o.animate ? ("allow" as const) : ("disabled" as const),
    timeout: SNAPSHOT,
    style: o.element ? "header nav { visibility: hidden !important; }" : "",
  };
  if (o.element)
    await (await visible(o.element).elementHandle()).screenshot(shot);
  else await page.screenshot({ ...shot, fullPage: o.full });
};

const capture = async (
  browser: Browser,
  server: () => Promise<Server | undefined>,
  label: string,
) => {
  const files: string[] = [];
  for (const path of paths) {
    for (const theme of themes) {
      const host = await server();
      const url = /^https?:/.test(path) ? path : host!.url + path;
      const name =
        o.name ??
        (new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/\W+/g, "-") ||
          "home");
      const file = join(
        out,
        [name, label, theme].filter(Boolean).join("-") + ".png",
      );
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.deviceScaleFactor,
        isMobile: engine === "chromium" && size.isMobile,
        hasTouch: size.isMobile,
        colorScheme: theme as "dark" | "light",
        ...(o.video && {
          recordVideo: {
            dir: join(tmpdir(), `shot-${process.pid}`),
            size: { width: size.width, height: size.height },
          },
        }),
      });
      context.setDefaultTimeout(10_000);
      await context.addInitScript(
        ({ confetti, animate }) => {
          localStorage.setItem("spoilers", "0");
          if (!animate)
            addEventListener(
              "animationstart",
              () =>
                document
                  .getAnimations()
                  .filter((a) => a.effect?.getTiming().iterations === Infinity)
                  .forEach((a) => a.cancel()),
              true,
            );
          const media = matchMedia;
          if (!confetti)
            window.matchMedia = (query) =>
              media(query === "(prefers-reduced-motion)" ? "all" : query);
        },
        { confetti: o.confetti, animate: o.animate },
      );
      await context.route("**/api/settings", (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ json: settings })
          : route.fulfill({ status: 204 }),
      );
      const page = await context.newPage();
      let closed = 0;
      const open = new Set<Request>();
      const api = (r: Request) =>
        r.url().includes("/api/") && !/\/stream\b/.test(r.url());
      page.on("request", (r) => api(r) && open.add(r));
      page.on("requestfinished", (r) => open.delete(r));
      page.on("requestfailed", (r) => open.delete(r));
      const warn = (text: string) => errors.push(`${label} ${path}: ${text}`);
      page.on("pageerror", (e) => warn(String(e)));
      page.on("response", (r) => {
        if (r.status() >= 400 && r.url().includes("/api/"))
          warn(`${r.status()} ${r.url()}`);
      });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await shoot(page, file, warn, () => open.size, host?.started ?? 0);
        files.push(file);
        if (o.drag) files.push(file.replace(/\.png$/, "-held.png"));
      } catch (error) {
        const failed = file.replace(/\.png$/, "-error.png");
        const state = await page
          .screenshot({ path: failed, timeout: SNAPSHOT })
          .then(
            () => failed,
            (e: Error) => `not captured: ${e.message}`,
          );
        throw new Error(`${(error as Error).message}\nState: ${state}`);
      } finally {
        closed = Date.now();
        await context.close();
        await (o.replay && host && stop(host.child));
      }
      if (o.video) {
        const video = file.replace(/\.png$/, ".webm");
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
        files.push(
          video,
          ...execFileSync(
            process.execPath,
            [
              "scripts/frames.ts",
              video,
              "--fps",
              "10",
              "--out",
              out,
              ...(o.drag
                ? [
                    "--from",
                    String(Math.max(0, (dragged[0]! - start) / 1000 - 0.2)),
                    "--to",
                    String((dragged[1]! - start) / 1000),
                  ]
                : []),
            ],
            { encoding: "utf8" },
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => line.split("  ")[0]!),
        );
      }
    }
  }
  return files;
};

const full = paths.some((path) => /^https?:/.test(path));
if (full && (o.before || o.replay))
  throw new Error("--before and --replay need paths, not URLs");
const browser = await (engine === "chromium" ? chromium : webkit)
  .launch()
  .catch((error: Error) => {
    throw new Error(
      `${error.message.split("\n")[0]}\nRun pnpm exec playwright-core install ${engine === "chromium" ? "--only-shell chromium" : "webkit"}`,
    );
  });
const before = o.before ? checkout(o.before, "shot") : null;
const shared =
  full || o.replay
    ? []
    : [serve("."), ...(before ? [serve(before)] : [])].map((p) => {
        p.catch(() => undefined);
        return p;
      });
const source = (i: number, cwd: string | null) => () =>
  full ? Promise.resolve(undefined) : (shared[i] ?? serve(cwd!));
try {
  const files = await capture(browser, source(0, "."), before ? "after" : "");
  if (before)
    files.push(...(await capture(browser, source(1, before), "before")));
  for (const file of files.sort()) console.log(file);
} finally {
  await browser.close();
  for (const p of shared) {
    const host = await p.catch(() => undefined);
    if (host) await stop(host.child);
  }
  if (before) git("worktree", "remove", before);
  for (const error of [...new Set(errors)].slice(0, 10))
    console.error(`warning: ${error}`);
}
