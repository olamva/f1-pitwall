import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { git } from "./checkout.ts";

const { values: o, positionals: videos } = parseArgs({
  allowPositionals: true,
  options: {
    fps: { type: "string", default: "2" },
    from: { type: "string", default: "0" },
    to: { type: "string" },
    at: { type: "string" },
    width: { type: "string", default: "360" },
    grid: { type: "string", default: "4x2" },
    out: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (o.help || videos.length !== 1) {
  console.log(`pnpm frames <video> [options]

Save contact sheets of a screen recording. Each frame shows its time.

  --fps <n>       Frames for each second of video (default 2)
  --from <s>      Start at this second (default 0)
  --to <s>        Stop at this second (default the end)
  --at <s>        Save only the frame at this second, at full size
  --width <px>    Width of each frame on a sheet (default 360)
  --grid <CxR>    Frames on each sheet, columns x rows (default 4x2)
  --out <dir>     Output directory (default the T3 attachments directory)

Read each sheet left to right, then top to bottom.`);
  process.exit(o.help ? 0 : 1);
}

const video = resolve(videos[0]!);
const out = resolve(
  o.out ??
    join(
      homedir(),
      ".t3/userdata/attachments",
      git("rev-parse", "--abbrev-ref", "HEAD").replace(/[^\w.-]+/g, "-"),
    ),
);
mkdirSync(out, { recursive: true });
const name = basename(video, extname(video)).replace(/[^\w.-]+/g, "-");
const ffmpeg = (...args: string[]) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

if (o.at) {
  const file = join(out, `${name}-at-${o.at}s.png`);
  ffmpeg("-ss", o.at, "-i", video, "-frames:v", "1", file);
  console.log(file);
  process.exit(0);
}

const [cols, rows] = o.grid!.split("x").map(Number) as [number, number];
const stamp = `drawtext=text='%{pts\\:hms\\:${Number(o.from)}}':x=4:y=h-th-4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=3`;
const prefix = `${name}-sheet-`;
for (const old of readdirSync(out).filter((f) => f.startsWith(prefix)))
  rmSync(join(out, old));
ffmpeg(
  "-ss",
  o.from!,
  ...(o.to ? ["-to", o.to] : []),
  "-i",
  video,
  "-vf",
  `fps=${o.fps},scale=${o.width}:-2,${stamp},tile=${cols}x${rows}:padding=4`,
  "-fps_mode",
  "passthrough",
  join(out, `${prefix}%02d.png`),
);
const span = (cols * rows) / Number(o.fps);
readdirSync(out)
  .filter((f) => f.startsWith(prefix))
  .sort()
  .forEach((f, i) => {
    const start = Number(o.from) + i * span;
    console.log(
      `${join(out, f)}  ${start.toFixed(1)}s to ${(start + span).toFixed(1)}s`,
    );
  });
