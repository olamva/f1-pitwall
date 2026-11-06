import assert from "node:assert/strict";
import { test } from "node:test";
import { validSettings } from "../src/shared/settings.ts";
import {
  add,
  columnAt,
  drop,
  place,
  remove,
  tidy,
  widen,
  type Column,
} from "../src/web/live/layout.ts";
import { DEFAULT_LAYOUT } from "../src/web/live/widgets.ts";

const heights: Record<string, number> = { tower: 100, a: 20, b: 30, c: 10 };
const height = (id: string) => heights[id] ?? 0;

const col = (w: number, ...ids: string[]): Column => ({
  w,
  tiles: ids.map((id) => ({ id, h: null })),
});

const ids = (columns: Column[]) => columns.map((c) => c.tiles.map((t) => t.id));

const board = [col(7, "tower"), col(5, "a", "b", "c")];

test("tiles stack in their column and skip hidden tiles", () => {
  const { spots, ends } = place([col(12, "a", "hidden", "b")], height);
  assert.deepEqual(spots.get("b"), { col: 0, top: 20, height: 30 });
  assert.equal(spots.has("hidden"), false);
  assert.deepEqual(ends, [50]);
});

test("a tile dropped above the middle of another tile goes before it", () => {
  assert.deepEqual(ids(drop(board, height, "c", { col: 1, y: 5 })), [
    ["tower"],
    ["c", "a", "b"],
  ]);
  assert.deepEqual(ids(drop(board, height, "a", { col: 1, y: 34 })), [
    ["tower"],
    ["b", "a", "c"],
  ]);
});

test("a tile dropped in another column moves there and leaves its column for the drop", () => {
  const moved = drop(board, height, "tower", { col: 1, y: 1000 });
  assert.deepEqual(ids(moved), [[], ["a", "b", "c", "tower"]]);
  assert.deepEqual(ids(tidy(moved)), [["a", "b", "c", "tower"]]);
});

test("a tile dropped at an edge gets a new column", () => {
  assert.deepEqual(ids(drop(board, height, "a", { edge: "right" })), [
    ["tower"],
    ["b", "c"],
    ["a"],
  ]);
  assert.deepEqual(ids(tidy(drop(board, height, "tower", { edge: "left" }))), [
    ["tower"],
    ["a", "b", "c"],
  ]);
});

test("the pointer picks the column under it, by the column weights", () => {
  const width = 1200 + 16;
  assert.equal(columnAt(board, width, 699), 0);
  assert.equal(columnAt(board, width, 720), 1);
  assert.equal(columnAt(board, width, 5000), 1);
});

test("a wider column takes its width from the column on its right", () => {
  const width = 1200 + 16;
  assert.deepEqual(
    widen(board, width, 0, 900).map((c) => c.w),
    [9, 3],
  );
  assert.deepEqual(
    widen(board, width, 0, 1200).map((c) => c.w),
    [10, 2],
  );
  assert.equal(widen(board, width, 1, 100), board);
});

test("a new widget goes to the end of the shortest column", () => {
  assert.deepEqual(ids(add(board, height, "d")), [
    ["tower"],
    ["a", "b", "c", "d"],
  ]);
  assert.deepEqual(ids(add([], height, "d")), [["d"]]);
});

test("removing the last tile of a column removes the column", () => {
  assert.deepEqual(ids(remove(board, "tower")), [["a", "b", "c"]]);
});

test("each screen size saves under its own key", () => {
  assert.equal(validSettings({ layoutPhone: DEFAULT_LAYOUT.phone }), true);
  assert.equal(
    validSettings({
      layoutTablet: DEFAULT_LAYOUT.tablet,
      layoutDesktop: DEFAULT_LAYOUT.desktop,
    }),
    true,
  );
  assert.equal(validSettings({ layoutPhone: null }), true);
  for (const columns of [
    [{ w: 0, tiles: [] }],
    [{ w: 4, tiles: [{ id: "tower", h: 2 }] }],
    [{ w: 4, tiles: [{ id: "Tower", h: null }] }],
    [{ w: 4, tiles: [{ id: "tower", h: null, x: 1 }] }],
    [{ w: 4, tiles: "tower" }],
    Array.from({ length: 7 }, () => ({ w: 1, tiles: [] })),
  ])
    assert.equal(
      validSettings({ layoutPhone: columns }),
      false,
      JSON.stringify(columns),
    );
  assert.equal(validSettings({ layout: DEFAULT_LAYOUT }), false);
});
