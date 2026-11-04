import type { Standing } from "../../shared/clinch.ts";
import { Versus } from "../Versus.tsx";
import type { Who } from "./derive.ts";

interface FaceoffProps {
  focus: string;
  rival: string;
  table: Standing[];
  who: Map<string, Who>;
  gain: number;
}

export const Faceoff = ({ focus, rival, table, who, gain }: FaceoffProps) => {
  const points = (id: string) => table.find((s) => s.id === id)?.points ?? 0;
  const color = (id: string) => who.get(id)?.color ?? "#888";
  const gap = points(focus) - points(rival);
  const mate = who.get(focus)?.team === who.get(rival)?.team;
  return (
    <Versus
      seam={50 + 30 * Math.max(-1, Math.min(gap / gain, 1))}
      center={gap > 0 ? `+${gap}` : gap < 0 ? `−${-gap}` : "="}
      caption="Points"
      sides={[
        {
          id: focus,
          name: who.get(focus)?.name,
          color: color(focus),
          note: `${points(focus)} PTS`,
        },
        {
          id: rival,
          name: who.get(rival)?.name,
          color: mate
            ? `color-mix(in srgb, ${color(rival)} 40%, #3f3f46)`
            : color(rival),
          note: `${points(rival)} PTS`,
        },
      ]}
    />
  );
};
