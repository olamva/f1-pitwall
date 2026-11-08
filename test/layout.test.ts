import assert from "node:assert/strict";
import { test } from "node:test";
import { validSettings } from "../src/shared/settings.ts";
import {
  add,
  aim,
  autoscroll,
  columnAt,
  drop,
  gapAt,
  place,
  remove,
  stick,
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

test("a dragged tile passes a neighbour when its leading edge crosses the neighbour's middle", () => {
  for (const [id, top, order] of [
    ["b", 20, "abc"],
    ["b", 11, "abc"],
    ["b", 9, "bac"],
    ["b", 25, "abc"],
    ["b", 26, "acb"],
    ["c", 0, "cab"],
    ["a", 14, "abc"],
    ["a", 16, "bac"],
  ] as const)
    assert.deepEqual(
      ids(
        drop(board, height, id, { col: 1, top, bottom: top + height(id) }),
      )[1]!.join(""),
      order,
      `${id} at ${top}`,
    );
});

test("a dragged tile that holds still keeps its place on the next frame", () => {
  for (const id of ["tower", "b"])
    for (let top = -10; top < 80; top++) {
      const target = { col: 1, top, bottom: top + height(id) };
      const once = drop(board, height, id, target);
      assert.deepEqual(drop(once, height, id, target), once, `${id} at ${top}`);
    }
});

test("a tile dropped in another column moves there and leaves its column for the drop", () => {
  const moved = drop(board, height, "tower", {
    col: 1,
    top: 1000,
    bottom: 1100,
  });
  assert.deepEqual(ids(moved), [[], ["a", "b", "c", "tower"]]);
  assert.deepEqual(ids(tidy(moved)), [["a", "b", "c", "tower"]]);
});

test("a tile dropped at an edge or between columns gets a new column there", () => {
  assert.deepEqual(ids(drop(board, height, "a", { at: 2 })), [
    ["tower"],
    ["b", "c"],
    ["a"],
  ]);
  assert.deepEqual(ids(tidy(drop(board, height, "tower", { at: 0 }))), [
    ["tower"],
    ["a", "b", "c"],
  ]);
  assert.deepEqual(ids(drop(board, height, "b", { at: 1 })), [
    ["tower"],
    ["b"],
    ["a", "c"],
  ]);
});

test("the pointer finds the gap between two columns up to a quarter column away, but not the outer edges", () => {
  const width = 1200 + 16;
  assert.equal(gapAt(board, width, 708), 1);
  assert.equal(gapAt(board, width, 637), 1);
  assert.equal(gapAt(board, width, 779), 1);
  assert.equal(gapAt(board, width, 635), -1);
  assert.equal(gapAt(board, width, 781), -1);
  assert.equal(gapAt(board, width, 0), -1);
  assert.equal(gapAt(board, width, 1216), -1);
  const narrow = [col(2, "a"), col(10, "b")];
  assert.equal(gapAt(narrow, width, 257), 1);
  assert.equal(gapAt(narrow, width, 259), 1);
  assert.equal(gapAt(narrow, width, 267), -1);
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

test("a drag picks a new column only when there is room and the pointer moved toward an edge or waited in a gap", () => {
  const box = { left: 0, right: 1216, top: 0, width: 1216 };
  const at = (x: number, sx: number, max = 3, near = -1, gap = -1) =>
    aim(
      { id: "a", start: board, x, y: 200, sx, dy: 20, near, gap },
      box,
      max,
      12,
      () => 0,
    );
  assert.deepEqual(at(10, 300), { at: 0 });
  assert.deepEqual(at(1210, 900), { at: 2 });
  assert.equal("at" in at(10, 30)!, false);
  assert.equal("at" in at(10, 300, 2)!, false);
  assert.equal(at(708, 900, 3, 1), null);
  assert.deepEqual(at(708, 900, 3, 1, 1), { at: 1 });
  assert.equal("at" in at(708, 900, 2, 1, 1)!, false);
  assert.deepEqual(at(10, 30), { col: 0, top: 22.5, bottom: 32.5 });
  assert.deepEqual(
    aim(
      {
        id: "a",
        start: board,
        x: 900,
        y: 200,
        sx: 900,
        dy: 20,
        near: -1,
        gap: -1,
      },
      box,
      3,
      12,
      (c) => (c === 1 ? 16 : 0),
    ),
    { col: 1, top: 20.5, bottom: 30.5 },
  );
});

test("columns of a multi-column board stick, and a column taller than the screen lifts by its overflow", () => {
  const kind = (id: string) =>
    id === "c" || id === "tower"
      ? "fill"
      : id.startsWith("w")
        ? "content"
        : "shrink";
  const screen = 600;
  const sticky = (columns: Column[]) => {
    const { spots, ends } = place(columns, (id) => height(id) || 6);
    return stick(columns, spots, ends, screen, kind, () => 40);
  };
  const lone = sticky([col(12, "tower", "a")]);
  assert.deepEqual([...lone.sticky], []);
  assert.deepEqual([...lone.stretch], []);
  const short = sticky([col(7, "a"), col(5, "b", "c")]);
  assert.deepEqual(short.over, [0, 0]);
  assert.deepEqual([...short.stretch], [["c", screen - 30 * 8]]);
  const tall = sticky(board);
  assert.deepEqual([...tall.sticky], [0, 1]);
  assert.deepEqual(tall.over, [100 * 8 - 16 - screen - 1, 0]);
  assert.deepEqual([...tall.stretch.keys()], ["c"]);
  const under = sticky([col(7, "tower", "a"), col(5, "b", "c")]);
  assert.equal(under.over[0], tall.over[0]! + 20 * 8);
  const fixed = [col(7, "a"), { w: 5, tiles: [{ id: "c", h: 10 }] }];
  assert.deepEqual([...sticky(fixed).stretch], []);
  const weather = sticky([col(7, "a"), col(5, "c", "w", "w2")]);
  assert.deepEqual([...weather.stretch], [["c", screen - 2 * (40 + 16)]]);
  assert.deepEqual(
    [...weather.push],
    [
      ["w2", screen - 40 - 16 * 8],
      ["w", screen - 40 - 16 - 40 - 10 * 8],
    ],
  );
  assert.deepEqual(
    [...sticky([col(7, "a"), col(5, "c", "b", "w")]).stretch],
    [],
  );
});

test("a drag scrolls only near the screen edges, and never past the end of the board", () => {
  const view = 800;
  assert.equal(autoscroll(400, 400, 5000, view), 0);
  assert.equal(autoscroll(10, 400, 5000, view), -18);
  assert.equal(autoscroll(790, 400, 5000, view), 18);
  assert.equal(autoscroll(790, 400, 805, view), 5);
  assert.equal(autoscroll(790, 400, 700, view), 0);
  assert.equal(autoscroll(779, 780, 5000, view), 0);
  assert.equal(autoscroll(30, 20, 5000, view), 0);
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
      layoutDisplay: DEFAULT_LAYOUT.display,
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
