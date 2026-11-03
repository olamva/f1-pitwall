import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const [pr, ...files] = process.argv.slice(2);
if (!/^\d+$/.test(pr ?? "") || !files.length) {
  console.log("pnpm shot:publish <pr number> <png>...");
  process.exit(1);
}

const git = (args: string[], input?: string) =>
  execFileSync("git", args, { encoding: "utf8", input }).trim();

const branch = `screenshots/pr-${pr}`;
const parent = git(["ls-remote", "origin", `refs/heads/${branch}`]).split(
  "\t",
)[0];
if (parent) git(["fetch", "-q", "origin", branch]);
const entries = new Map(
  (parent ? git(["ls-tree", parent]).split("\n") : [])
    .filter(Boolean)
    .map((line) => [line.split("\t")[1]!, line]),
);
for (const file of files)
  entries.set(
    basename(file),
    `100644 blob ${git(["hash-object", "-w", file])}\t${basename(file)}`,
  );
const tree = git(["mktree"], [...entries.values()].join("\n") + "\n");
const commit = git(
  [
    "commit-tree",
    tree,
    ...(parent ? ["-p", parent] : []),
    "-m",
    `Add screenshots for #${pr}`,
  ],
  "",
);
git(["push", "-q", "origin", `${commit}:refs/heads/${branch}`]);

const repo = git(["remote", "get-url", "origin"])
  .replace(/^.*github\.com[:/]/, "")
  .replace(/\.git$/, "");
const url = (name: string) =>
  `![${name.replace(/\.png$/, "")}](https://raw.githubusercontent.com/${repo}/${commit}/${name})`;
const names = files.map((file) => basename(file));
const pairs = names.filter((name) => name.includes("-before-"));
const rows = pairs
  .map((name) => [name, name.replace("-before-", "-after-")])
  .filter(([, after]) => names.includes(after!));
console.log(
  rows.length
    ? [
        "| Before | After |",
        "| --- | --- |",
        ...rows.map(
          ([before, after]) => `| ${url(before!)} | ${url(after!)} |`,
        ),
        ...names
          .filter((name) => !rows.flat().includes(name))
          .map((name) => `\n${url(name)}`),
      ].join("\n")
    : names.map(url).join("\n\n"),
);
