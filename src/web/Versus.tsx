import { BODY, Figure, useArt } from "./Headshot.tsx";
import { TeamNumber } from "./stats/TeamNumber.tsx";

export interface Side {
  id: string;
  color: string;
  note: string;
}

interface VersusProps {
  sides: [Side, Side];
  seam: number;
  center: string;
  caption: string;
}

const INK = "#15151e";
const SLANT = 7;

const clip = (seam: number, from: number, to: number) =>
  `polygon(${from}% 0, ${seam + SLANT + to}% 0, ${seam - SLANT + to}% 100%, ${from}% 100%)`;

const Panel = ({
  side,
  right,
  seam,
}: {
  side: Side;
  right: boolean;
  seam: number;
}) => {
  const d = useArt(side.id);
  return (
    <div
      className="absolute inset-0 transition-[clip-path] duration-500"
      style={{
        clipPath: right ? clip(seam, 100, 0.5) : clip(seam, 0, -0.5),
        background: `repeating-linear-gradient(-62deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 9px), radial-gradient(circle at ${right ? 75 : 25}% 35%, color-mix(in srgb, ${side.color} 85%, white) 0%, ${side.color} 30%, color-mix(in srgb, ${side.color} 30%, ${INK}) 75%)`,
      }}
    >
      {d && (
        <TeamNumber
          id={d.id}
          number={d.number}
          color="rgb(255 255 255 / 0.22)"
          className={`absolute top-[6%] flex h-[58%] text-[10rem] ${right ? "right-[3%]" : "left-[3%]"}`}
        />
      )}
    </div>
  );
};

const Plate = ({ side, right }: { side: Side; right: boolean }) => {
  const name = useArt(side.id)?.name ?? side.id;
  return (
    <div
      className={`font-f1 absolute bottom-3 z-10 ${right ? "right-4 text-right" : "left-4"}`}
    >
      <p className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase sm:text-xs">
        {name.split(" ").slice(0, -1).join(" ")}
      </p>
      <p className="text-xl leading-none font-black tracking-wide uppercase sm:text-3xl">
        {name.split(" ").at(-1)}
      </p>
      <p
        className="tabular mt-1.5 inline-block px-1.5 py-0.5 text-xs font-bold text-white sm:text-sm"
        style={{ background: side.color }}
      >
        {side.note}
      </p>
    </div>
  );
};

export const Versus = ({ sides, seam, center, caption }: VersusProps) => (
  <div
    className="relative isolate h-64 max-w-lg overflow-hidden rounded-xl text-white sm:h-80"
    style={{ background: INK }}
  >
    {sides.map((s, i) => (
      <Panel key={s.id} side={s} right={i > 0} seam={seam} />
    ))}
    <Figure
      key={sides[0].id}
      id={sides[0].id}
      pose="left"
      transform={BODY}
      className="absolute top-[5%] left-[3%] h-[160%] max-w-none drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.5)]"
    />
    <Figure
      key={sides[1].id}
      id={sides[1].id}
      pose="right"
      transform={BODY}
      className="absolute top-[5%] right-[3%] h-[160%] max-w-none drop-shadow-[0_8px_24px_rgb(0_0_0_/_0.5)]"
    />
    <div
      className="absolute inset-x-0 bottom-0 h-1/2"
      style={{ background: `linear-gradient(transparent, ${INK} 85%)` }}
    />
    {sides.map((s, i) => (
      <Plate key={s.id} side={s} right={i > 0} />
    ))}
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
    </div>
  </div>
);
