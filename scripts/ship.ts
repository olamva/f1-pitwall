import { execFileSync, spawn } from "node:child_process";
import { parseArgs } from "node:util";

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    body: { type: "string", default: "" },
    branch: { type: "string" },
    hold: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (o.help || positionals.length !== 1) {
  console.log(`pnpm ship "<commit message>" [options]

Commit all changes, merge origin/main, run the checks, push, open the PR
and turn on auto-merge. Run it again to push more commits to the same PR.

  --body <text>     PR description. A validation line is added to it.
  --branch <name>   Rename the task branch first, such as t3/fix-map-labels
  --hold            Do not turn on auto-merge, for a change that waits for visual approval

The first commit on the branch is the PR title. Use the commit-style format.
Pass --body again if an earlier run stopped before it opened the PR.`);
  process.exit(o.help ? 0 : 1);
}

const message = positionals[0]!;
const run = (cmd: string, ...args: string[]) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const fail = (text: string): never => {
  console.error(text);
  process.exit(1);
};
const check = (script: string) =>
  new Promise<[string, number, string]>((done) => {
    const child = spawn("pnpm", [script], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    child.stdout.on("data", (d) => (log += d));
    child.stderr.on("data", (d) => (log += d));
    child.on("close", (code) => done([script, code ?? 1, log]));
  });

if (o.branch) run("git", "branch", "-m", o.branch);
const branch = run("git", "rev-parse", "--abbrev-ref", "HEAD");
if (branch === "main" || branch === "HEAD")
  fail("Ship from a task branch, not from main or a detached HEAD.");

run("pnpm", "format");
if (run("git", "status", "--porcelain")) {
  run("git", "add", "-A");
  run("git", "commit", "-q", "-m", message);
}
run("git", "fetch", "-q", "origin", "main");
if (!run("git", "rev-list", "origin/main..HEAD"))
  fail(
    "The branch has no commits that are not on origin/main. The PR is merged or empty. Start cleanup.",
  );
try {
  run("git", "merge", "-q", "--no-edit", "origin/main");
} catch {
  fail(
    `The merge of origin/main has conflicts:\n${run("git", "diff", "--name-only", "--diff-filter=U")}\nResolve them, run git commit --no-edit, then run pnpm ship again.`,
  );
}

const results = await Promise.all(["typecheck", "test", "build"].map(check));
const failed = results.filter(([, code]) => code);
for (const [script, , log] of failed)
  console.error(
    `pnpm ${script} failed:\n${log.split("\n").slice(-40).join("\n")}`,
  );
if (failed.length) process.exit(1);

run("git", "push", "-q", "-u", "origin", "HEAD");
const sha = run("git", "rev-parse", "--short", "HEAD");
let pr: { number: number; url: string; state: string } | undefined;
try {
  pr = JSON.parse(run("gh", "pr", "view", "--json", "number,url,state"));
} catch {}
if (pr?.state !== "OPEN") {
  const body =
    `${o.body}\n\nValidation: \`pnpm typecheck\`, \`pnpm test\` and \`pnpm build\` pass.`.trim();
  run(
    "gh",
    "pr",
    "create",
    "--base",
    "main",
    "--title",
    run(
      "git",
      "log",
      "--no-merges",
      "--reverse",
      "--format=%s",
      "origin/main..HEAD",
    ).split("\n")[0]!,
    "--body",
    body,
  );
  pr = JSON.parse(run("gh", "pr", "view", "--json", "number,url,state"));
}
if (!o.hold) run("gh", "pr", "merge", String(pr!.number), "--auto", "--merge");
console.log(
  `PR ${pr!.url}, head ${sha}, auto-merge ${o.hold ? "off" : "on"}.\nLink and watch it with the T3 pull request tools, then end the turn.`,
);
