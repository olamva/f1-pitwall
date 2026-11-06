import { execFileSync } from "node:child_process";
import { symlinkSync } from "node:fs";
import { join, resolve } from "node:path";

export const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

export const checkout = (ref: string, name: string) => {
  const dir = `/tmp/${name}-${git("rev-parse", "--short", ref)}-${process.pid}`;
  git("worktree", "add", "--detach", dir, ref);
  symlinkSync(resolve("node_modules"), join(dir, "node_modules"));
  return dir;
};
