import { readFileSync, rmSync, writeFileSync } from "node:fs";

export const LOCK = "/tmp/f1-pitwall-browser.pid";

const running = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const owner = (file: string) => {
  try {
    return Number(readFileSync(file, "utf8"));
  } catch {
    return 0;
  }
};

export const lock = async (file: string, waiting: string) => {
  for (let told = false; ; told = true) {
    try {
      writeFileSync(file, String(process.pid), { flag: "wx" });
      break;
    } catch {}
    const pid = owner(file);
    if (pid && !running(pid)) {
      rmSync(file, { force: true });
      continue;
    }
    if (!told) console.error(waiting);
    await new Promise((done) => setTimeout(done, 1000));
  }
  process.on("exit", () => owner(file) === process.pid && rmSync(file));
};
