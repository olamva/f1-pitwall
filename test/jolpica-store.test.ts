import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("a restarted server reuses stored Jolpica data and refreshes only the current season", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "jolpica-store-"));
  process.env.DATA_DIR = dir;
  let now = Date.parse("2026-11-02T12:00:00Z");
  t.mock.method(Date, "now", () => now);
  const calls: string[] = [];
  let points = "365";
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url.replace("https://api.jolpi.ca/ergast/f1/", ""));
    return Response.json({ MRData: { url, points } });
  });
  const until = async (check: () => Promise<boolean> | boolean) => {
    for (let i = 0; i < 200 && !(await check()); i++)
      await new Promise((r) => setTimeout(r, 10));
    assert.ok(await check());
  };
  const stored = async () =>
    (await readdir(join(dir, "jolpica/v1")).catch(() => [])).filter((f) =>
      f.endsWith(".json"),
    ).length === 2;

  const server = (name: string) => import(`../src/server/jolpica.ts?${name}`);
  const first = await server("first");
  await first.get("2025/1.json");
  await first.get("current.json");
  await until(stored);
  assert.deepEqual(calls, ["2025/1.json", "current.json"]);

  now += 60 * 60_000;
  points = "380";
  const second = await server("second");
  assert.equal((await second.get("2025/1.json")).points, "365");
  assert.equal((await second.get("current.json")).points, "365");
  await until(() => calls.length === 3);
  assert.deepEqual(calls.slice(2), ["current.json"]);
  await until(async () => (await second.get("current.json")).points === "380");
  assert.equal((await second.get("2025/1.json")).points, "365");
  assert.equal(calls.length, 3);
});
