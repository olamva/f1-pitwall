import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Json } from "../src/shared/merge.ts";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "f1-live-"));
process.env.NODE_ENV = "production";
const { Feed } = await import("../src/server/live.ts");

class Wire extends Feed {
  send(topic: string, data: Json, t: number) {
    this.handle(topic, data, t);
  }
}

const future = { EndDate: "2999-01-01T00:00:00", GmtOffset: "00:00:00" };

test("a restarted server still has the frames from before the restart", () => {
  const before = new Wire(null).resume();
  before.send("SessionInfo", { Key: 1, ...future }, 1_000);
  before.send("LapCount", { CurrentLap: 3 }, 60_000);
  before.send("LapCount", { CurrentLap: 4 }, 150_000);

  const after = new Wire(null).resume();
  assert.equal(after.history.since, 1_000);
  assert.deepEqual(after.window(100_000).state.LapCount, { CurrentLap: 3 });

  after.send("SessionInfo", { Key: 2, ...future }, 200_000);
  const next = new Wire(null).resume();
  assert.equal(next.history.since, 200_000);
  assert.equal(next.window(250_000).state.LapCount, undefined);
});

test("a restart after the session ended does not restore it, even after new frames", () => {
  const before = new Wire("old").resume();
  const info = {
    Key: 1,
    EndDate: "2026-11-08T16:00:00",
    GmtOffset: "-03:00:00",
  };
  before.send("SessionInfo", info, 1_000);
  before.send("LapCount", { CurrentLap: 3 }, 60_000);
  before.send("SessionInfo", info, Date.now());

  const after = new Wire("old").resume();
  assert.equal(after.window(100_000).state.LapCount, undefined);
});
