import assert from "node:assert/strict";
import { test } from "node:test";
import { replay } from "../src/server/archive.ts";

test("the two most recently used replays load from the archive once", async (t) => {
  const loads: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/SessionInfo.jsonStream"))
      loads.push(url.split("/").at(-2)!);
    return new Response("");
  });
  for (const race of ["a", "b", "a", "c", "a", "b", "c"])
    await replay(`2026/meeting/${race}/`);
  assert.deepEqual(loads, ["a", "b", "c", "b", "c"]);
});

test("a replay loads a meeting path with non-ASCII letters", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(""));
  await replay("2026/2026-11-08_São_Paulo_Grand_Prix/2026-11-06_Practice_1/");
});
