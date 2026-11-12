import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { lock, LOCK } from "./lock.ts";

const { values: o, positionals: files } = parseArgs({
  allowPositionals: true,
  options: {
    note: { type: "string", multiple: true, default: [] },
    out: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (o.help || files.length !== 2) {
  console.log(`pnpm shot:compare <before.png> <after.png> [options]

Put a before and an after screenshot side by side in one image.
With --note, also mark each change on the after screenshot.

  --note "<x>,<y>,<w>,<h> <text>"   Box a change and label it. Use image pixels.
                                    Repeat it for each change. Add L or R after
                                    <h> to put the label on that side.
  --out <dir>                       Output directory (default the directory of <after.png>)

The command writes <name>-compare.png and, with --note, <name>-annotated.png.
<name> is the after file name without "-after".`);
  process.exit(o.help ? 0 : 1);
}

const [before, after] = files.map((file) => resolve(file)) as [string, string];
const out = resolve(o.out ?? dirname(after));
const name = basename(after, ".png").replace("-after", "");
const url = (file: string) =>
  `data:image/png;base64,${readFileSync(file).toString("base64")}`;
const notes = o.note!.map((note) => {
  const match = note.match(/^\s*(\d+),(\d+),(\d+),(\d+)([LR]?)\s+(.+)$/s);
  if (!match) throw new Error(`Bad --note "${note}". Use "x,y,w,h text".`);
  const [x, y, w, h] = match.slice(1, 5).map(Number) as number[];
  return { x, y, w, h, side: match[5]!, text: match[6]! };
});

const STYLE = `
  body { margin: 0; }
  #root { font: 600 var(--font) / 1.3 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #fafafa; display: inline-flex; gap: var(--gap); padding: var(--gap); background: #3f3f46; position: relative; align-items: flex-start; }
  figure { margin: 0; display: grid; gap: calc(var(--gap) / 2); }
  figcaption { font-size: calc(var(--font) * 1.4); }
  img { display: block; border-radius: calc(var(--font) * 0.6); box-shadow: 0 0 0 2px rgb(255 255 255 / 0.15); }
  .side { width: var(--side); position: relative; align-self: stretch; }
  .label { position: absolute; width: 100%; box-sizing: border-box; padding: 0.55em 0.8em; border-radius: 0.6em; background: #18181b; box-shadow: 0 0 0 3px #22d3ee; display: flex; gap: 0.6em; }
  .badge { flex: none; display: grid; place-items: center; width: 1.6em; height: 1.6em; border-radius: 50%; background: #22d3ee; color: #083344; font-weight: 800; }
  #shot { position: relative; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
`;

const page = async (html: string, file: string, width: number) => {
  const tab = await browser.newPage({ viewport: { width, height: 800 } });
  await tab.setContent(`<style>${STYLE}</style>${html}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.evaluate(layout);
  await tab.locator("#root").screenshot({ path: file });
  await tab.close();
  console.log(file);
};

const layout = () => {
  const root = document.querySelector<HTMLElement>("#root")!;
  const svg = root.querySelector("svg");
  if (!svg) return;
  const img = root.querySelector<HTMLImageElement>("#shot img")!;
  const at = root.getBoundingClientRect();
  const pic = img.getBoundingClientRect();
  const k = pic.width / img.naturalWidth;
  const ns = "http://www.w3.org/2000/svg";
  const draw = (tag: string, attrs: Record<string, string | number>) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs))
      el.setAttribute(key, String(value));
    svg.append(el);
  };
  const stroke = Math.max(3, pic.width / 280);
  draw("defs", {});
  svg.querySelector("defs")!.innerHTML =
    `<marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#22d3ee"/></marker>`;
  const bottom: Record<string, number> = { L: 0, R: 0 };
  const labels = [...root.querySelectorAll<HTMLElement>(".label")]
    .map((label) => {
      const [x, y, w, h] = label.dataset
        .box!.split(",")
        .map(Number) as number[];
      const box = {
        x: pic.left - at.left + x * k,
        y: pic.top - at.top + y * k,
        w: w * k,
        h: h * k,
      };
      const side =
        label.dataset.side ||
        (box.x + box.w / 2 < pic.left - at.left + pic.width / 2 ? "L" : "R");
      return { label, box, side };
    })
    .sort((a, b) => a.box.y - b.box.y);
  for (const { label, box, side } of labels) {
    const column = root.querySelector<HTMLElement>(`#${side}`)!;
    column.append(label);
    const top = Math.max(
      box.y + box.h / 2 - label.offsetHeight / 2 - column.offsetTop,
      bottom[side]!,
    );
    label.style.top = `${top}px`;
    bottom[side] = top + label.offsetHeight + 16;
    const rect = label.getBoundingClientRect();
    const from = {
      x:
        (side === "L" ? rect.right : rect.left) -
        at.left +
        (side === "L" ? 3 : -3),
      y: rect.top + rect.height / 2 - at.top,
    };
    const to = {
      x: side === "L" ? box.x - stroke : box.x + box.w + stroke,
      y: box.y + box.h / 2,
    };
    draw("rect", {
      x: box.x - stroke,
      y: box.y - stroke,
      width: box.w + stroke * 2,
      height: box.h + stroke * 2,
      rx: Math.min(box.h, box.w) / 4 + stroke,
      fill: "none",
      stroke: "#083344",
      "stroke-width": stroke * 2.4,
      "stroke-opacity": 0.5,
    });
    draw("rect", {
      x: box.x - stroke,
      y: box.y - stroke,
      width: box.w + stroke * 2,
      height: box.h + stroke * 2,
      rx: Math.min(box.h, box.w) / 4 + stroke,
      fill: "none",
      stroke: "#22d3ee",
      "stroke-width": stroke,
    });
    const d = `M${from.x} ${from.y} C${(from.x + to.x) / 2} ${from.y} ${(from.x + to.x) / 2} ${to.y} ${to.x} ${to.y}`;
    draw("path", {
      d,
      fill: "none",
      stroke: "#083344",
      "stroke-opacity": 0.6,
      "stroke-width": stroke * 2.6,
    });
    draw("path", {
      d,
      fill: "none",
      stroke: "#22d3ee",
      "stroke-width": stroke,
      "marker-end": "url(#head)",
    });
  }
  const end = Math.max(...Object.values(bottom), 0);
  for (const id of ["L", "R"])
    root.querySelector<HTMLElement>(`#${id}`)!.style.minHeight = `${end}px`;
};

const size = (file: string) => {
  const png = readFileSync(file);
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
};

const escape = (text: string) =>
  text.replace(/[&<>]/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt" }[c]};`);

await lock(LOCK, "Waiting for another pnpm shot or pnpm perf run to finish.");
const browser = await chromium.launch().catch((error: Error) => {
  throw new Error(
    `${error.message.split("\n")[0]}\nRun pnpm exec playwright-core install --only-shell chromium`,
  );
});
const { w } = size(after);
const font = Math.round(Math.min(Math.max(22, w / 30), 40));
const vars = (gap: number, side = 0) =>
  `style="--font:${font}px;--gap:${gap}px;--side:${side}px"`;
await page(
  `<div id="root" ${vars(font * 2)}>
    <figure><figcaption>Before</figcaption><img src="${url(before)}"></figure>
    <figure><figcaption>After</figcaption><img src="${url(after)}"></figure>
  </div>`,
  join(out, `${name}-compare.png`),
  w * 2 + font * 6,
);
if (notes.length) {
  const side = Math.round(Math.min(Math.max(w * 0.45, 380), 900));
  await page(
    `<div id="root" ${vars(font * 2, side)}>
      <div class="side" id="L"></div>
      <figure id="shot"><figcaption>After, with changes marked</figcaption><img src="${url(after)}"></figure>
      <div class="side" id="R"></div>
      <svg></svg>
      ${notes
        .map(
          (n, i) =>
            `<div class="label" data-box="${n.x},${n.y},${n.w},${n.h}" data-side="${n.side}"><span class="badge">${i + 1}</span><span>${escape(n.text)}</span></div>`,
        )
        .join("")}
    </div>`,
    join(out, `${name}-annotated.png`),
    w + side * 2 + font * 8,
  );
}
await browser.close();
