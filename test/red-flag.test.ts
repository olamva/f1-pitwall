import assert from "node:assert/strict";
import { test } from "node:test";
import { Session } from "../src/server/timing.ts";

test("a red flag lasts until the session restarts or ends", () => {
  const session = new Session();
  for (const [t, topic, Status] of [
    [10, "SessionStatus", "Started"],
    [20, "SessionStatus", "Aborted"],
    [20, "TrackStatus", "5"],
    [30, "TrackStatus", "1"],
    [40, "SessionStatus", "Inactive"],
    [50, "SessionStatus", "Started"],
    [60, "SessionStatus", "Aborted"],
    [60, "TrackStatus", "5"],
    [70, "TrackStatus", "1"],
    [80, "SessionStatus", "Finished"],
  ] as const)
    session.apply({ t, topic, data: { Status } });
  assert.deepEqual(session.periods, [
    { kind: "red", from: 20, to: 50 },
    { kind: "red", from: 60, to: 80 },
  ]);
});
