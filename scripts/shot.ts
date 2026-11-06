import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  chromium,
  webkit,
  type Browser,
  type Page,
  type Request,
} from "playwright-core";

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

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const { values: o, positionals: paths } = parseArgs({
  allowPositionals: true,
  options: {
    before: { type: "string" },
    theme: { type: "string", default: "both" },
    size: { type: "string", default: "phone" },
    browser: { type: "string", default: "webkit" },
    favourite: { type: "string" },
    team: { type: "string" },
    click: { type: "string", multiple: true, default: [] },
    hover: { type: "string" },
    wait: { type: "string" },
    eval: { type: "string" },
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
  --click <selector>  Click before the capture; repeat for more steps
  --hover <selector>  Keep the mouse on this element for the capture
  --wait <selector>   Wait for this element before the capture
  --eval <js>         Run this in the page before the capture
  --element <selector>  Capture only this element, without the tab bar
  --full              Capture the full page
  --confetti          Show the confetti (off by default, as it slows WebKit)
  --animate           Keep animations running and capture their current frame
  --name <name>       File name prefix (default from the path)
  --out <dir>         Output directory (default the T3 attachments directory)

Selectors are Playwright selectors: CSS, text=Reveal or role=button[name="Reveal"].
A full http URL uses that server. Then --before is not available.`);
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
const themes = o.theme === "both" ? ["dark", "light"] : [o.theme!];
const [id, code] = o.favourite?.split(":") ?? [];
const settings = {
  ...(o.favourite && { favourite: { id, code } }),
  ...(o.team && { team: o.team }),
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
    env: { ...process.env, PORT: "0", VITE_PORT: "0", DEV_WATCH: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const url = await new Promise<string>((done, fail) => {
    const read = (chunk: Buffer) => {
      log += chunk;
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
  return { url, child };
};

const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
};

const checkout = (ref: string) => {
  const dir = `/tmp/shot-${git("rev-parse", "--short", ref)}-${process.pid}`;
  git("worktree", "add", "--detach", dir, ref);
  symlinkSync(resolve("node_modules"), join(dir, "node_modules"));
  return dir;
};

const errors: string[] = [];

const shoot = async (
  page: Page,
  file: string,
  warn: (t: string) => void,
  loading: () => number,
) => {
  const visible = (selector: string) =>
    page.locator(selector).filter({ visible: true }).first();
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
    await visible(target).click();
    await settle();
  }
  if (o.hover) {
    await visible(o.hover).hover();
    await page.waitForTimeout(400);
    await settle();
  } else await page.mouse.move(size.width - 1, 0);
  if (o.wait) await visible(o.wait).waitFor();
  if (o.eval) await page.evaluate(o.eval);
  if (o.element) await visible(o.element).scrollIntoViewIfNeeded();
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

const capture = async (browser: Browser, base: string, label: string) => {
  const files: string[] = [];
  for (const path of paths) {
    const url = /^https?:/.test(path) ? path : base + path;
    const name =
      o.name ??
      (new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/\W+/g, "-") ||
        "home");
    for (const theme of themes) {
      const file = join(
        out,
        [name, label, theme].filter(Boolean).join("-") + ".png",
      );
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.deviceScaleFactor,
        isMobile: o.browser === "chromium" && size.isMobile,
        hasTouch: size.isMobile,
        colorScheme: theme as "dark" | "light",
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
        await shoot(page, file, warn, () => open.size);
        files.push(file);
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
        await context.close();
      }
    }
  }
  return files;
};

const full = paths.some((path) => /^https?:/.test(path));
if (full && o.before) throw new Error("--before needs paths, not URLs");
const engine = o.browser === "chromium" ? chromium : webkit;
const browser = await engine.launch().catch((error: Error) => {
  throw new Error(
    `${error.message.split("\n")[0]}\nRun pnpm exec playwright-core install ${o.browser === "chromium" ? "--only-shell chromium" : "webkit"}`,
  );
});
const before = o.before ? checkout(o.before) : null;
const servers = full
  ? []
  : await Promise.all([serve("."), ...(before ? [serve(before)] : [])]);
try {
  const files = await capture(
    browser,
    servers[0]?.url ?? "",
    before ? "after" : "",
  );
  if (servers[1])
    files.push(...(await capture(browser, servers[1].url, "before")));
  for (const file of files.sort()) console.log(file);
} finally {
  await browser.close();
  await Promise.all(servers.map(({ child }) => stop(child)));
  if (before) git("worktree", "remove", before);
  for (const error of [...new Set(errors)].slice(0, 10))
    console.error(`warning: ${error}`);
}
