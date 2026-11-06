import { Fragment, useContext, useState, type CSSProperties } from "react";
import { BODY, Car, Faces, Figure, lineup, useArt } from "./Headshot.tsx";
import { TeamNumber } from "./stats/TeamNumber.tsx";
import { logoSrc } from "./TeamLogo.tsx";

export interface Side {
  id: string;
  color: string;
  note: string;
  name?: string;
}

interface VersusProps {
  sides: [Side, Side];
  seam: number;
  center: string;
  caption: string;
  cars?: boolean;
  dim?: boolean;
  detail?: string[];
}

const INK = "#15151e";
const SLANT = 7;

const clip = (seam: number, right: boolean) =>
  right
    ? `polygon(100% 0, ${seam + SLANT + 0.5}% 0, ${seam - SLANT + 0.5}% 100%, 100% 100%)`
    : `polygon(0% 0, ${seam + SLANT - 0.5}% 0, ${seam - SLANT - 0.5}% 100%, 0% 100%)`;

const useSwap = (side: Side) => {
  const [last, setLast] = useState(side);
  const [gone, setGone] = useState<Side>();
  if (last.id !== side.id) {
    setLast(side);
    setGone(last);
  }
  return [gone, () => setGone(undefined)] as const;
};

const motion = (s: Side, gone: Side | undefined, right: boolean) =>
  !gone
    ? ""
    : s === gone
      ? "versus-out"
      : `versus-in-${right ? "right" : "left"}`;

interface PanelProps {
  side: Side;
  gone?: Side;
  right: boolean;
  seam: number;
  cars?: boolean;
}

const paint = (color: string, x: number) =>
  `repeating-linear-gradient(-62deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 9px), radial-gradient(circle at ${x}% 35%, color-mix(in srgb, ${color} 85%, white) 0%, ${color} 30%, color-mix(in srgb, ${color} 30%, ${INK}) 75%)`;

const Panel = ({ side, gone, right, seam }: PanelProps) => (
  <div
    className="absolute inset-0 transition-[clip-path] duration-500"
    style={{ clipPath: clip(seam, right) }}
  >
    {[gone, side].map(
      (s) =>
        s && (
          <div
            key={s.id}
            className={`absolute inset-0 ${gone && s !== gone ? "versus-fade" : ""}`}
            style={{ background: paint(s.color, right ? 75 : 25) }}
          />
        ),
    )}
  </div>
);

const Figures = ({ side, gone, right, seam, cars }: PanelProps) => {
  const faces = useContext(Faces);
  const cast = [gone, side].flatMap((s) =>
    s
      ? [
          {
            s,
            team: lineup(faces, s.id).map((d) => d.id),
            m: motion(s, gone, right),
          },
        ]
      : [],
  );
  const figure = (id: string, back: boolean, extra: string) => (
    <Figure
      key={id}
      id={id}
      pose={right ? "right" : "left"}
      transform={BODY}
      className={`absolute h-[160%] max-w-none drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.5)] ${back ? "top-[9%] brightness-75" : "top-[5%]"} ${right ? (back ? "right-[24%]" : "right-[3%]") : back ? "left-[24%]" : "left-[3%]"} ${extra}`}
    />
  );
  return (
    <>
      <div
        className="absolute inset-0 transition-[clip-path] duration-500"
        style={{ clipPath: clip(seam, right) }}
      >
        {cars &&
          cast.map(({ s, m }) => (
            <Car
              key={s.id}
              id={s.id}
              pose={right ? "left" : "right"}
              className={`absolute top-[14%] w-full max-w-none opacity-80 ${right ? "-right-[42%]" : "-left-[42%]"} ${m}`}
            />
          ))}
        {cast.map(({ team: [, mate], m }) => mate && figure(mate, true, m))}
      </div>
      {cast.map(({ team: [lead], m }) => lead && figure(lead, false, m))}
    </>
  );
};

interface PlateProps {
  side: Side;
  right: boolean;
  motion?: string;
  onDone?: () => void;
}

const Plate = ({ side, right, motion = "", onDone }: PlateProps) => {
  const d = useArt(side.id);
  const name = side.name ?? d?.name ?? side.id;
  const logo = d ? undefined : logoSrc(side.id);
  const title = d ? name.split(" ").at(-1)! : name;
  return (
    <div
      className={`font-f1 absolute bottom-3 z-10 ${right ? "right-4 text-right" : "left-4"} ${motion}`}
      onAnimationEnd={onDone}
    >
      {d && (
        <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase sm:text-xs">
          {name.split(" ").slice(0, -1).join(" ")}
        </p>
      )}
      <p
        className="text-[min(1.25rem,var(--fit))] leading-none font-black tracking-wide whitespace-nowrap uppercase sm:text-[min(1.875rem,var(--fit))]"
        style={{ "--fit": `${44 / title.length}cqw` } as CSSProperties}
      >
        {title}
      </p>
      <div
        className={`mt-1.5 flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}
      >
        {d && (
          <TeamNumber
            id={d.id}
            number={d.number}
            color="white"
            className="flex h-5 text-xl sm:h-6 sm:text-2xl"
          />
        )}
        {logo && (
          <img
            src={logo}
            alt=""
            className="size-6 object-contain drop-shadow-[0_1px_3px_rgb(0_0_0_/_0.6)] sm:size-7"
          />
        )}
        <p
          className="tabular px-1.5 py-0.5 text-xs font-bold text-white sm:text-sm"
          style={{ background: side.color }}
        >
          {side.note}
        </p>
      </div>
    </div>
  );
};

export const Versus = ({
  sides,
  seam,
  center,
  caption,
  cars,
  dim,
  detail,
}: VersusProps) => {
  const swaps = [useSwap(sides[0]), useSwap(sides[1])];
  return (
    <div
      className="@container relative isolate h-64 max-w-lg overflow-hidden rounded-xl text-white scheme-dark sm:h-80"
      style={{ background: INK }}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${dim ? "opacity-40" : ""}`}
      >
        {sides.map((s, i) => (
          <Panel
            key={i}
            side={s}
            gone={swaps[i]![0]}
            right={i > 0}
            seam={seam}
          />
        ))}
        {sides.map((s, i) => (
          <Figures
            key={i}
            side={s}
            gone={swaps[i]![0]}
            right={i > 0}
            seam={seam}
            cars={cars}
          />
        ))}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: `linear-gradient(transparent, ${INK} 85%)` }}
        />
        {sides.map((s, i) => {
          const gone = swaps[i]![0];
          return (
            <Fragment key={i}>
              {[gone, s].map(
                (p) =>
                  p && (
                    <Plate
                      key={p.id}
                      side={p}
                      right={i > 0}
                      motion={motion(p, gone, i > 0)}
                      onDone={p === s ? swaps[i]![1] : undefined}
                    />
                  ),
              )}
            </Fragment>
          );
        })}
      </div>
      <div
        className="font-f1 absolute top-[42%] z-10 flex -translate-1/2 -skew-x-12 flex-col items-center bg-white px-3 py-1 text-zinc-950 shadow-[0_6px_20px_rgb(0_0_0_/_0.5)] transition-[left] duration-500"
        style={{ left: `${seam}%` }}
      >
        <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
          {caption}
        </span>
        <span className="tabular text-2xl leading-none font-black sm:text-4xl">
          {center}
        </span>
        {detail && (
          <span className="tabular mt-0.5 flex gap-2 text-[10px] font-bold whitespace-nowrap text-zinc-600 sm:text-xs">
            {detail.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
};

const slice = (l: number, r: number) =>
  `polygon(${l + SLANT + 0.5}% 0, ${r + SLANT - 0.5}% 0, ${r - SLANT - 0.5}% 100%, ${l - SLANT + 0.5}% 100%)`;

interface SlicesProps {
  sides: Side[];
  gaps: string[];
  more: number;
}

export const Slices = ({ sides, gaps, more }: SlicesProps) => {
  const w = 100 / sides.length;
  const mid = (i: number) => `${(i + 0.5) * w}%`;
  return (
    <div
      className="@container relative isolate h-64 max-w-lg overflow-hidden rounded-xl text-white scheme-dark sm:h-80"
      style={{ background: INK }}
    >
      {sides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0"
          style={{
            clipPath: slice(
              i ? i * w : -SLANT - 1,
              i < sides.length - 1 ? (i + 1) * w : 100 + SLANT + 1,
            ),
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: paint(s.color, (i + 0.5) * w) }}
          />
          <Figure
            id={s.id}
            pose="front"
            transform={BODY}
            className="absolute top-[8%] h-[150%] max-w-none -translate-x-1/2 drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.5)]"
            style={{ left: mid(i) }}
          />
        </div>
      ))}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: `linear-gradient(transparent, ${INK} 85%)` }}
      />
      {sides.map((s, i) => (
        <div
          key={s.id}
          className="font-f1 absolute bottom-3 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ left: mid(i) }}
        >
          <p className="text-xl leading-none font-black tracking-wide sm:text-3xl">
            {s.id}
          </p>
          <p
            className="tabular px-1.5 py-0.5 text-xs font-bold sm:text-sm"
            style={{ background: s.color }}
          >
            {s.note}
          </p>
        </div>
      ))}
      {gaps.map((g, i) => (
        <div
          key={i}
          className="font-f1 tabular absolute top-[42%] z-10 -translate-1/2 -skew-x-12 bg-white px-2 py-1 text-lg leading-none font-black text-zinc-950 shadow-[0_6px_20px_rgb(0_0_0_/_0.5)] sm:text-2xl"
          style={{ left: `${(i + 1) * w}%` }}
        >
          {g}
        </div>
      ))}
      {more > 0 && (
        <p className="font-f1 tabular absolute top-3 right-3 z-10 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold">
          +{more}
        </p>
      )}
    </div>
  );
};
