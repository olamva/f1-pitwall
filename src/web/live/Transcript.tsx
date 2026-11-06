import { useJson } from "../api.ts";
import { ink } from "../ink.ts";
import type { Radio } from "./view.ts";

type Turn = { speaker: "driver" | "engineer"; text: string };

export type Clip = Radio & { turns?: Turn[] };

export const Transcript = ({ clip, color }: { clip: Clip; color: string }) => {
  const { data, error } = useJson<{ turns: Turn[] }>(
    clip.turns
      ? null
      : `/api/radio/transcript?url=${encodeURIComponent(clip.url)}`,
  );
  const turns = clip.turns ?? data?.turns;
  if (error) return null;
  if (!turns)
    return (
      <p className="animate-pulse text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        Transcribing…
      </p>
    );
  return (
    <blockquote className="font-f1 space-y-1 text-lg leading-snug font-bold uppercase">
      {turns.map((t, i) => (
        <p
          key={i}
          className={t.speaker === "driver" ? "text-right" : ""}
          style={{
            color: t.speaker === "driver" ? ink(color) : "var(--color-zinc-50)",
          }}
        >
          {t.text}
        </p>
      ))}
    </blockquote>
  );
};
