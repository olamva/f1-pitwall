import assert from "node:assert/strict";
import { utimesSync } from "node:fs";
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

test("a restarted server still has the frames from before the restart", () => {
  const before = new Wire(null).resume();
  before.send("SessionInfo", { Key: 1 }, 1_000);
  before.send("LapCount", { CurrentLap: 3 }, 60_000);
  before.send("LapCount", { CurrentLap: 4 }, 150_000);

  const after = new Wire(null).resume();
  assert.equal(after.history.since, 1_000);
  assert.deepEqual(after.window(100_000).state.LapCount, { CurrentLap: 3 });

  after.send("SessionInfo", { Key: 2 }, 200_000);
  const next = new Wire(null).resume();
  assert.equal(next.history.since, 200_000);
  assert.equal(next.window(250_000).state.LapCount, undefined);
});

test("a restart long after the last frame does not restore the old session", () => {
  const before = new Wire("old").resume();
  before.send("SessionInfo", { Key: 1 }, 1_000);
  before.send("LapCount", { CurrentLap: 3 }, 60_000);
  const day = new Date(Date.now() - 24 * 60 * 60_000);
  utimesSync(join(process.env.DATA_DIR!, "live/old.jsonl"), day, day);

  const after = new Wire("old").resume();
  assert.equal(after.window(100_000).state.LapCount, undefined);
});
