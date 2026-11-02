import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { test } from "node:test";

test(
  "a parameter alternation does not capture a later path segment",
  { timeout: 10_000 },
  async () => {
    const dist = mkdtempSync(join(tmpdir(), "f1-routes-"));
    writeFileSync(join(dist, "index.html"), "app");
    const server = spawn(process.execPath, ["src/server/main.ts"], {
      env: { ...process.env, PORT: "0", NO_LIVE: "1", DIST_DIR: dist },
      stdio: ["ignore", "pipe", "inherit"],
    });
    try {
      let port = "";
      for await (const line of createInterface({ input: server.stdout })) {
        port = /^listening on (\d+)$/.exec(line)?.[1] ?? "";
        if (port) break;
      }
      const res = await fetch(`http://127.0.0.1:${port}/api/live/standings`);
      assert.equal(await res.text(), "app");
    } finally {
      server.kill();
      await once(server, "exit");
      rmSync(dist, { recursive: true });
    }
  },
);
