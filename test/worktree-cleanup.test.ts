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
  const root = mkdtempSync(join(tmpdir(), "f1-worktree-cleanup-"));
  const remote = join(root, "remote.git");
  const main = join(root, "main");
  const task = join(root, "task");
  const bin = join(root, "bin");
  const script = resolve("scripts/worktree-cleanup.ts");
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();

  try {
    execFileSync("git", ["init", "--bare", "--initial-branch=main", remote]);
    execFileSync("git", ["clone", remote, main]);
    git(main, "config", "user.name", "Test");
    git(main, "config", "user.email", "test@example.com");
    writeFileSync(join(main, "file.txt"), "base\n");
    git(main, "add", "file.txt");
    git(main, "commit", "-m", "base");
    git(main, "push", "-u", "origin", "main");
    git(main, "worktree", "add", "-b", "t3/task", task);
    git(task, "config", "user.name", "Test");
    git(task, "config", "user.email", "test@example.com");
    writeFileSync(join(task, "file.txt"), "task\n");
    git(task, "commit", "-am", "task");
    const head = git(task, "rev-parse", "HEAD");
    git(task, "push", "-u", "origin", "t3/task:task");
    git(main, "merge", "--no-ff", "-m", "merge task", "t3/task");
    const merge = git(main, "rev-parse", "HEAD");
    git(main, "push", "origin", "main");
    git(main, "push", "origin", "--delete", "task");
    git(main, "push", "origin", "HEAD:refs/heads/screenshots/pr-1");
    const screenshots = () =>
      git(main, "ls-remote", "--heads", "origin", "screenshots/pr-1");
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
      ["screenshots/pr-2", merge],
    ])
      git(main, "branch", name!, commit!);

    mkdirSync(bin);
    const gh = join(bin, "gh");
    writeFileSync(
      gh,
      `#!/bin/sh\n[ "$2" = list ] && printf '[{"number":1,"headRefOid":"${head}"}]' || printf "%s" "$MOCK_PR"\n`,
    );
    chmodSync(gh, 0o755);
    const run = (state: string, ...args: string[]) =>
      spawnSync(process.execPath, [script, ...args], {
        cwd: args[0] === "--merged" ? main : task,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          MOCK_PR: JSON.stringify({
            state,
            baseRefName: "main",
            headRefName: "task",
            headRefOid: head,
            mergeCommit: { oid: merge },
            url: "https://example.com/pr/1",
          }),
        },
      });

    assert.match(
      run("MERGED", task, "1", "--apply").stderr,
      /another checkout/,
    );
    assert.match(
      run("OPEN", task, "1", "--branch-only", "--apply").stderr,
      /merged PR/,
    );
    assert.notEqual(screenshots(), "");
    const result = run("MERGED", "--merged", "--branch-only", "--apply");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      result.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
      [
        {
          target: realpathSync(task),
          branch: "t3/task",
          pullRequest: "https://example.com/pr/1",
          removed: false,
          branchRemoved: true,
          screenshotsRemoved: true,
        },
        { orphanBranches: ["t3/orphan"] },
      ],
    );
    assert.equal(
      git(main, "branch", "--list", "t3/*", "screenshots/*"),
      "screenshots/pr-2\n  t3/open",
    );
    assert.equal(git(task, "rev-parse", "HEAD"), head);
    assert.equal(git(task, "branch", "--show-current"), "");
    assert.equal(git(main, "branch", "--list", "t3/task"), "");
    assert.equal(screenshots(), "");
    const removal = run("MERGED", "--merged", "--apply");
    assert.equal(removal.status, 0, removal.stderr);
    assert.equal(JSON.parse(removal.stdout.split("\n")[0]!).removed, true);
    assert.doesNotMatch(git(main, "worktree", "list"), /task/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
