import { hasClinched, type Championship } from "../../shared/clinch.ts";
import type { Round } from "../../shared/season.ts";
import { sessionStart } from "./view.ts";

type Obj = Record<string, any>;

const KEY: Record<Championship, string> = {
  drivers: "Drivers",
  constructors: "Teams",
};

const predicted = (state: Obj, champ: Championship): [string, Obj][] =>
  Object.entries(state.ChampionshipPrediction?.[KEY[champ]] ?? {});

export type Prediction = {
  id: string;
  tla: string;
  name: string;
  team: string;
  position: number;
  points: number;
  gained: number;
  gain: number;
};

export const prediction = (
  state: Obj,
  champ: Championship = "drivers",
): Prediction[] =>
  predicted(state, champ)
    .map(([id, p]) => {
      const d: Obj =
        champ === "drivers"
          ? (state.DriverList?.[id] ?? {})
          : { Tla: p.TeamName, FullName: p.TeamName, TeamName: p.TeamName };
      return {
        id,
        tla: d.Tla ?? id,
        name: d.LastName ? `${d.FirstName} ${d.LastName}` : (d.FullName ?? ""),
        team: d.TeamName ?? "",
        position: p.PredictedPosition,
        points: p.PredictedPoints,
        gained: p.CurrentPosition - p.PredictedPosition,
        gain: p.PredictedPoints - p.CurrentPoints,
      };
    })
    .sort((a, b) => a.position - b.position);

export type Title = "open" | "clinching" | "decided";

const upcoming = (rounds: Round[], from: (date: string) => boolean) =>
  rounds.flatMap((r) =>
    (["sprint", "race"] as const)
      .filter((kind) => from(r.sessions[kind] ?? ""))
      .map((kind) => ({ round: r.round, name: r.name, kind })),
  );

export const title = (
  state: Obj,
  rounds: Round[],
  champ: Championship,
): Title => {
  const day = new Date(sessionStart(state) ?? 0).toISOString().slice(0, 10);
  const clinched = (points: string, from: (date: string) => boolean) => {
    const table = predicted(state, champ)
      .map(([id, p]) => ({ id, points: p[points], countback: [] }))
      .sort((a, b) => b.points - a.points);
    return (
      !!table[0] &&
      hasClinched(table, upcoming(rounds, from), table[0].id, champ)
    );
  };
  if (clinched("CurrentPoints", (date) => date >= day)) return "decided";
  return clinched("PredictedPoints", (date) => date.slice(0, 10) > day)
    ? "clinching"
    : "open";
};

export type Standing = { rows: Prediction[]; title: Title };

export const standings = (
  state: Obj,
  rounds: Round[],
): Record<Championship, Standing> => ({
  drivers: { rows: prediction(state), title: title(state, rounds, "drivers") },
  constructors: {
    rows: prediction(state, "constructors"),
    title: title(state, rounds, "constructors"),
  },
});

export const contested = (s: Record<Championship, Standing>): boolean =>
  s.drivers.rows.length > 0 &&
  Object.values(s).some((c) => c.title !== "decided");
