import { Versus } from "../Versus.tsx";
import { gapSeconds, type Row } from "./view.ts";

const RANGE = 1;

export const Battle = ({ rows }: { rows: Row[] }) => {
  const at = rows.findIndex((r, i) => {
    const s = gapSeconds(r.interval);
    return (
      i > 0 &&
      !r.status &&
      !rows[i - 1]!.status &&
      s !== null &&
      s > 0 &&
      s < RANGE
    );
  });
  const [ahead, chaser] = [rows[at - 1], rows[at]];
  if (!ahead || !chaser) return null;
  return (
    <section className="bg-surface space-y-2 rounded-xl p-3">
      <h2 className="font-f1 text-xs tracking-wider text-zinc-400 uppercase">
        Battle for P{ahead.position}
      </h2>
      <Versus
        key={ahead.tla + chaser.tla}
        seam={50}
        center={chaser.interval.replace(/^\+/, "")}
        caption="Interval"
        sides={[
          { id: ahead.tla, color: ahead.color, note: `P${ahead.position}` },
          { id: chaser.tla, color: chaser.color, note: `P${chaser.position}` },
        ]}
      />
    </section>
  );
};
