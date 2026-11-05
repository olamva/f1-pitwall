import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("cleanup sweep removes merged worktrees and their branches", () => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "f1-worktree-cleanup-")),
  );
  const remote = join(root, "remote.git");
  const main = join(root, "main");
  const task = join(root, "task");
  const updated = join(root, "updated");
  const ahead = join(root, "ahead");
  const bin = join(root, "bin");
  const script = resolve("scripts/worktree-cleanup.ts");
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();
  const commit = (cwd: string, name: string) => {
    writeFileSync(join(cwd, `${name}.txt`), `${name}\n`);
    git(cwd, "add", ".");
    git(cwd, "commit", "-m", name);
    return git(cwd, "rev-parse", "HEAD");
  };
  const tree = (...parents: string[]) =>
    git(
      main,
      "commit-tree",
      ...parents.flatMap((parent) => ["-p", parent]),
      "-m",
      "merge",
      `${parents.at(-1)}^{tree}`,
    );

  try {
    execFileSync("git", ["init", "--bare", "--initial-branch=main", remote]);
    execFileSync("git", ["clone", remote, main]);
    git(main, "config", "user.name", "Test");
    git(main, "config", "user.email", "test@example.com");
    commit(main, "base");
    git(main, "push", "-u", "origin", "main");

    git(main, "worktree", "add", "-b", "t3/task", task);
    const head = commit(task, "task");
    git(task, "push", "origin", "t3/task:task");
    git(main, "merge", "--no-ff", "-m", "merge task", "t3/task");
    const merge = git(main, "rev-parse", "HEAD");

    git(main, "worktree", "add", "-b", "t3/updated", updated);
    const local = commit(updated, "updated");
    const updatedHead = tree(local, commit(main, "other"));
    git(
      main,
      "merge",
      "--ff-only",
      tree(git(main, "rev-parse", "HEAD"), updatedHead),
    );

    git(main, "worktree", "add", "-b", "t3/ahead", ahead, merge);
    const unmerged = commit(ahead, "ahead");

    git(main, "push", "origin", "main");
    git(main, "push", "origin", "--delete", "task");
    const open = git(
      main,
      "commit-tree",
      "-p",
      merge,
      "-m",
      "open",
      `${head}^{tree}`,
    );
    for (const [name, commit] of [
      ["t3/orphan", head],
      ["t3/open", open],
      ["screenshots/pr-1", merge],
      ["screenshots/pr-9", merge],
    ])
      git(main, "branch", name!, commit!);

    mkdirSync(bin);
    const gh = join(bin, "gh");
    writeFileSync(
      gh,
      `#!${process.execPath}\nconst prs = JSON.parse(process.env.MOCK_PRS);\nprocess.stdout.write(JSON.stringify(process.argv[3] === "list" ? Object.values(prs) : prs[process.argv[4]]));\n`,
    );
    chmodSync(gh, 0o755);
    const pr = (number: number, headRefName: string, headRefOid: string) => ({
      number,
      state: "MERGED",
      baseRefName: "main",
      headRefName,
      headRefOid,
      mergeCommit: { oid: merge },
      url: `https://example.com/pr/${number}`,
    });
    const run = (state: string, ...args: string[]) =>
      spawnSync(process.execPath, [script, ...args], {
        cwd: args[0] === "--merged" ? main : task,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          MOCK_PRS: JSON.stringify({
            1: { ...pr(1, "task", head), state },
            2: pr(2, "t3/updated", updatedHead),
            3: pr(3, "t3/ahead", merge),
          }),
        },
      });
    const lines = (stdout: string) =>
      stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));

    assert.match(
      run("MERGED", task, "1", "--apply").stderr,
      /another checkout/,
    );
    assert.match(
      run("OPEN", task, "1", "--branch-only", "--apply").stderr,
      /merged PR/,
    );
    const result = run("MERGED", "--merged", "--branch-only", "--apply");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      new Set(lines(result.stdout)),
      new Set([
        {
          target: task,
          branch: "t3/task",
          pullRequest: "https://example.com/pr/1",
          removed: false,
          branchRemoved: true,
        },
        {
          target: updated,
          branch: "t3/updated",
          pullRequest: "https://example.com/pr/2",
          removed: false,
          branchRemoved: true,
        },
        { orphanBranches: ["t3/orphan"] },
      ]),
    );
    assert.equal(
      git(main, "branch", "--list", "t3/*", "screenshots/*"),
      "screenshots/pr-9\n+ t3/ahead\n  t3/open",
    );
    assert.equal(git(task, "rev-parse", "HEAD"), head);
    assert.equal(git(updated, "rev-parse", "HEAD"), updatedHead);
    assert.equal(git(ahead, "rev-parse", "HEAD"), unmerged);

    const removal = run("MERGED", "--merged", "--apply");
    assert.equal(removal.status, 0, removal.stderr);
    assert.deepEqual(
      lines(removal.stdout)
        .filter((line) => line.target)
        .map((line) => [line.target, line.removed])
        .sort(),
      [
        [task, true],
        [updated, true],
      ],
    );
    const worktrees = git(main, "worktree", "list");
    assert.doesNotMatch(worktrees, /task|updated/);
    assert.match(worktrees, /ahead/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
