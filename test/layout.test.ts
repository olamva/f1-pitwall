import assert from "node:assert/strict";
import { test } from "node:test";
import { validSettings } from "../src/shared/settings.ts";
import { add, move, pack, type Item } from "../src/web/live/layout.ts";
import { DEFAULT_LAYOUT } from "../src/web/live/widgets.ts";

const item = (id: string, x: number, w: number): Item => ({
  id,
  x,
  w,
  h: null,
});

const heights: Record<string, number> = { tower: 100, a: 20, b: 30, c: 10 };
const height = (id: string) => heights[id]!;

const spots = (items: Item[]) =>
  Object.fromEntries(pack(items, height).map((p) => [p.id, [p.x, p.y]]));

const sidebar = [
  item("tower", 0, 7),
  item("a", 7, 5),
  item("b", 7, 5),
  item("c", 7, 5),
];

test("widgets stack under the widgets above them in their columns", () => {
  assert.deepEqual(spots(sidebar), {
    tower: [0, 0],
    a: [7, 0],
    b: [7, 20],
    c: [7, 50],
  });
});

test("a later widget fills a free space above an earlier one", () => {
  assert.deepEqual(
    spots([item("tower", 0, 7), item("b", 0, 12), item("a", 7, 5)]),
    { tower: [0, 0], b: [0, 100], a: [7, 0] },
  );
});

test("a widget dragged above another takes its place", () => {
  assert.deepEqual(spots(move(sidebar, height, "c", 7, 0, 12)), {
    tower: [0, 0],
    c: [7, 0],
    a: [7, 10],
    b: [7, 30],
  });
});

test("a widget dragged under the tower moves to the bottom of that column", () => {
  const moved = move(sidebar, height, "a", 0, 95, 12);
  assert.deepEqual(spots(moved).a, [0, 100]);
  assert.deepEqual(spots(moved).b, [7, 0]);
});

test("a widget dragged past the edge stays inside the grid", () => {
  assert.deepEqual(spots(move(sidebar, height, "a", 11, 0, 12)).a, [7, 0]);
});

test("a new widget goes to the column with the highest free space", () => {
  const next = add(sidebar, height, item("d", 0, 5), 12);
  assert.deepEqual(spots(next).d, [7, 60]);
  assert.deepEqual(
    spots(add([item("tower", 0, 7)], height, item("d", 0, 5), 12)).d,
    [7, 0],
  );
});

test("the server accepts the default layout and rejects broken layouts", () => {
  assert.equal(validSettings({ layout: DEFAULT_LAYOUT }), true);
  assert.equal(validSettings({ layout: null }), true);
  const desktop = (items: unknown) => ({
    layout: { ...DEFAULT_LAYOUT, desktop: items },
  });
  for (const items of [
    [{ id: "tower", x: 8, w: 5, h: null }],
    [{ id: "tower", x: 0, w: 0, h: null }],
    [{ id: "tower", x: 0, w: 12, h: 2 }],
    [{ id: "Tower", x: 0, w: 12, h: null }],
    [{ id: "tower", x: 0, w: 12, h: null, extra: 1 }],
    "tower",
  ])
    assert.equal(validSettings(desktop(items)), false, JSON.stringify(items));
  assert.equal(validSettings({ layout: { phone: [] } }), false);
});
