import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium, webkit, type Browser } from "playwright-core";
import { checkout, git } from "./checkout.ts";
import { guard } from "./dev.ts";
import { lock, LOCK } from "./lock.ts";

process.on("uncaughtException", (error) => {
  console.error(error.message);
  process.exit(1);
});

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    before: { type: "string" },
    replay: { type: "string" },
    from: { type: "string", default: "0" },
    seconds: { type: "string", default: "60" },
    browser: { type: "string", default: "both" },
    wait: { type: "string" },
    eval: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (o.help) {
  console.log(`pnpm perf [path] [options]

Build the app, serve it, and measure the CPU time of the browser processes.
The page is a phone (430x932 at 3x density) in dark mode.

  --before <ref>      Also measure <ref> (such as origin/main), at the same time
  --replay <file>     Replay a recording, such as recordings/2026-bahrain-fp3.jsonl.gz
  --from <minutes>    Start the replay at this minute (default 0)
  --seconds <n>       Length of the measurement (default 60)
  --browser <b>       webkit, chromium or both (default both)
  --wait <selector>   Wait for this element before the measurement
  --eval <js>         Run this in the page before the measurement

Each browser gets new servers, so both states replay the same minutes.`);
  process.exit(0);
}

await lock(LOCK, "Waiting for another pnpm shot or pnpm perf run to finish.");
const path = positionals[0] ?? "/";
const seconds = Number(o.seconds);
const env = `--env-file-if-exists=${git("rev-parse", "--path-format=absolute", "--git-common-dir")}/../.env`;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

const run = (cwd: string, args: string[]) => {
  const child = guard(
    spawn(process.execPath, args, {
      cwd,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        PORT: "0",
        DEV_NO_AUTH: "1",
        ...(o.replay && {
          LIVE_REPLAY: resolve(o.replay),
          LIVE_REPLAY_FROM: o.from,
        }),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  let log = "";
  child.stdout!.on("data", (chunk) => (log += chunk));
  child.stderr!.on("data", (chunk) => (log += chunk));
  return { child, log: () => log };
};

const build = async (cwd: string) => {
  const { child, log } = run(cwd, [
    "node_modules/vite/bin/vite.js",
    "build",
    "--configLoader",
    "native",
  ]);
  const [code] = await once(child, "exit");
  if (code) throw new Error(`Build failed in ${cwd}:\n${log()}`);
};

const serve = async (cwd: string) => {
  const { child, log } = run(cwd, [env, "src/server/main.ts"]);
  const port = await new Promise<string>((done, fail) => {
    const read = () => {
      const match = /listening on (\d+)/.exec(log());
      if (match) done(match[1]!);
    };
    child.stdout!.on("data", read);
    child.stderr!.on("data", read);
    child.once("exit", () => fail(new Error(`Server exited:\n${log()}`)));
  });
  return { url: `http://localhost:${port}`, child };
};

const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
};

const cpu = () =>
  new Map(
    execFileSync("ps", ["-axo", "pid=,time=,args="], {
      encoding: "utf8",
      maxBuffer: 1 << 24,
    })
      .trim()
      .split("\n")
      .filter((line) => line.includes("ms-playwright"))
      .map((line) => {
        const [pid, time, ...args] = line.trim().split(/\s+/);
        const s = time!.split(":").reduce((a, v) => a * 60 + Number(v), 0);
        return [pid!, { s, args: args.join(" ") }] as const;
      }),
  );

const kind = (args: string) =>
  /WebContent|--type=renderer/.test(args)
    ? "content"
    : /WebKit\.GPU|--type=gpu/.test(args)
      ? "gpu"
      : "other";

const before = o.before ? checkout(o.before, "perf") : null;
const states = before
  ? [
      { label: "before", cwd: before },
      { label: "after", cwd: "." },
    ]
  : [{ label: "current", cwd: "." }];

const measure = async (name: string) => {
  const engine = name === "chromium" ? chromium : webkit;
  const servers = await Promise.all(states.map(({ cwd }) => serve(cwd)));
  const runs: { label: string; browser: Browser; pids: string[] }[] = [];
  try {
    for (const [i, { label }] of states.entries()) {
      const known = cpu();
      const browser = await engine.launch().catch((error: Error) => {
        throw new Error(
          `${error.message.split("\n")[0]}\nRun pnpm exec playwright-core install ${name === "chromium" ? "--only-shell chromium" : "webkit"}`,
        );
      });
      runs.push({ label, browser, pids: [] });
      const context = await browser.newContext({
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        isMobile: name === "chromium",
        hasTouch: true,
        colorScheme: "dark",
      });
      await context.addInitScript(() => {
        delete (window as { PushManager?: unknown }).PushManager;
        localStorage.setItem("spoilers", "0");
      });
      const page = await context.newPage();
      page.on("pageerror", (e) =>
        console.error(`warning: ${name} ${label}: ${e.message}`),
      );
      await page.goto(servers[i]!.url + path);
      if (o.wait)
        await page
          .locator(o.wait)
          .filter({ visible: true })
          .first()
          .waitFor({ timeout: 60_000 });
      if (o.eval) await page.evaluate(o.eval);
      runs.at(-1)!.pids = [...cpu().keys()].filter((pid) => !known.has(pid));
    }
    await pause(3000);
    const start = cpu();
    await pause(seconds * 1000);
    const end = cpu();
    return runs.map(({ label, pids }) => {
      const by = { content: 0, gpu: 0, other: 0 };
      for (const pid of pids) {
        const now = end.get(pid);
        if (now) by[kind(now.args)] += now.s - (start.get(pid)?.s ?? 0);
      }
      const total = by.content + by.gpu + by.other;
      return {
        browser: name,
        state: label,
        "content s": by.content.toFixed(1),
        "gpu s": by.gpu.toFixed(1),
        "other s": by.other.toFixed(1),
        "total s": total.toFixed(1),
        "% of a core": ((total / seconds) * 100).toFixed(0),
      };
    });
  } finally {
    await Promise.all(runs.map(({ browser }) => browser.close()));
    await Promise.all(servers.map(({ child }) => stop(child)));
  }
};

try {
  await Promise.all(states.map(({ cwd }) => build(cwd)));
  const rows = [];
  for (const name of o.browser === "both"
    ? ["webkit", "chromium"]
    : [o.browser!])
    rows.push(...(await measure(name)));
  console.table(rows);
} finally {
  if (before) git("worktree", "remove", before);
}
