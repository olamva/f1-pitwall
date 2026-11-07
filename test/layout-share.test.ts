import assert from "node:assert/strict";
import { test } from "node:test";
import { decode, encode } from "../src/web/live/share.ts";

const shared =
  "p=12:tower,map.40;d=7:tower|5:battle,control.30,weather;x=12:runs";
const layouts = {
  phone: [
    {
      w: 12,
      tiles: [
        { id: "tower", h: null },
        { id: "map", h: 40 },
      ],
    },
  ],
  desktop: [
    { w: 7, tiles: [{ id: "tower", h: null }] },
    {
      w: 5,
      tiles: [
        { id: "battle", h: null },
        { id: "control", h: 30 },
        { id: "weather", h: null },
      ],
    },
  ],
  display: [{ w: 12, tiles: [{ id: "runs", h: null }] }],
};

test("a shared layout string keeps its format in both directions", () => {
  assert.deepEqual(decode(` ${shared}\n`), layouts);
  assert.equal(encode(layouts), shared);
});

test("a shared layout string that the app cannot show is rejected", () => {
  for (const text of [
    "",
    "x=12:tower",
    "p=12:tower,tower",
    "p=0:tower",
    "p=12:tower.2",
    "p=12:tower.big",
    "p=12:",
    "p=12:Tower",
  ])
    assert.equal(decode(text), null, text);
});
