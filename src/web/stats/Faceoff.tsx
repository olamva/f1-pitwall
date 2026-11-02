import type { Standing } from "../../shared/clinch.ts";
import { Figure } from "../Headshot.tsx";
import { ink } from "../ink.ts";
import type { Who } from "./derive.ts";

interface FaceoffProps {
  focus: string;
  rival: string;
  table: Standing[];
  who: Map<string, Who>;
  gain: number;
}

export const Faceoff = ({ focus, rival, table, who, gain }: FaceoffProps) => {
  const [a, b] = [focus, rival].map((id) => ({
    id,
    who: who.get(id),
    points: table.find((s) => s.id === id)?.points ?? 0,
  })) as [
    { id: string; who: Who | undefined; points: number },
    { id: string; who: Who | undefined; points: number },
  ];
  const gap = a.points - b.points;
  const seam = 50 + 35 * Math.max(-1, Math.min(gap / gain, 1));
  const left = a.who?.color ?? "#888";
  const right =
    b.who?.team === a.who?.team
      ? `color-mix(in srgb, ${b.who?.color ?? "#888"} 45%, #27272a)`
      : (b.who?.color ?? "#888");
  return (
    <div
      className="relative isolate h-64 max-w-lg overflow-hidden rounded-lg sm:h-80"
      style={{
        background: `linear-gradient(102deg, color-mix(in srgb, ${left} 45%, transparent) ${seam}%, color-mix(in srgb, ${right} 45%, transparent) ${seam}%)`,
        transition: "background 500ms",
      }}
    >
      <Figure
        id={a.id}
        pose="left"
        transform="c_lfill,h_600"
        className="absolute top-[6%] left-[4%] h-[160%] max-w-none"
      />
      <Figure
        id={b.id}
        pose="right"
        transform="c_lfill,h_600"
        className="absolute top-[6%] right-[4%] h-[160%] max-w-none"
      />
      {[a, b].map((d, i) => (
        <div
          key={d.id}
          className={`font-f1 absolute top-3 z-10 ${i ? "right-3 text-right" : "left-3"}`}
        >
          <p
            className="text-lg leading-none font-black"
            style={{ color: ink(d.who?.color) }}
          >
            {d.who?.code ?? d.id}
          </p>
          <p className="tabular text-sm font-bold">{d.points}</p>
        </div>
      ))}
      <p
        className="tabular font-f1 absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-4xl font-black drop-shadow-[0_2px_8px_rgb(0_0_0_/_0.8)] transition-[left] duration-500 sm:text-6xl"
        style={{ left: `${seam}%` }}
      >
        {gap > 0 ? `+${gap}` : gap < 0 ? `−${-gap}` : "="}
      </p>
    </div>
  );
};
