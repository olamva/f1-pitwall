import { ChartLine, Gauge, Swords, Trophy, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Championship } from "../../shared/clinch.ts";
import type { Season } from "../../shared/season.ts";
import { pathPart, pathSegment, setPathPart } from "../path.ts";
import { Standings } from "../Standings.tsx";
import { Swipe } from "../Swipe.tsx";
import { Tabs } from "../Tabs.tsx";
import {
  driverTables,
  drivers,
  duels,
  gains,
  latest,
  remaining,
  teamTables,
  teams,
} from "./derive.ts";
import { ConstructorProfile } from "./ConstructorProfile.tsx";
import { DriverProfile } from "./DriverProfile.tsx";
import { RacePace } from "./RacePace.tsx";
import { SeasonCharts } from "./SeasonCharts.tsx";
import { Teammates } from "./Teammates.tsx";
import { TitleFight } from "./TitleFight.tsx";

const VIEWS = [
  "Standings",
  "Title fight",
  "H2H",
  "Season",
  "Race pace",
] as const;
type View = (typeof VIEWS)[number];
const CHAMPS = ["drivers", "constructors"] as const;

const ICONS = {
  Standings: Trophy,
  "Title fight": Swords,
  H2H: Users,
  Season: ChartLine,
  "Race pace": Gauge,
};

const slug = (v: View) => v.toLowerCase().replace(" ", "-");

interface StatsProps {
  season: Season;
}

export const Stats = ({ season }: StatsProps) => {
  const [view, setView] = useState<View>(
    () => VIEWS.find((v) => slug(v) === pathPart("stats")) ?? "Standings",
  );
  const [profile, setProfile] = useState(() => {
    const kind = pathPart("stats");
    const id = pathSegment("stats", 3);
    return id && (kind === "drivers" || kind === "constructors")
      ? { kind, id }
      : null;
  });
  const [table] = useState<Championship>(
    profile?.kind === "constructors" ? "constructors" : "drivers",
  );
  const show = (v: View) => {
    setPathPart("stats", slug(v));
    setView(v);
    setProfile(null);
  };
  const [champ, setChamp] = useState<Championship>("drivers");
  const viewBlob = useRef<(offset: number, held: boolean) => void>(null);
  const champBlob = useRef<(offset: number, held: boolean) => void>(null);
  const d = useMemo(() => {
    const dt = driverTables(season);
    const tt = teamTables(season);
    return {
      who: drivers(season),
      teamWho: teams(season),
      dt,
      tt,
      events: remaining(season),
      duels: duels(season),
      gains: gains(season),
    };
  }, [season]);
  return (
    <div className="space-y-4">
      <Tabs
        items={VIEWS}
        value={view}
        onChange={show}
        icons={ICONS}
        small
        stretch
        drive={viewBlob}
      />
      <Swipe
        items={VIEWS}
        value={view}
        onChange={show}
        drive={viewBlob}
        render={(v) => (
          <>
            {v === "Standings" &&
              (profile?.kind === "drivers" ? (
                <DriverProfile
                  key={profile.id}
                  id={profile.id}
                  season={season}
                  onBack={() => show("Standings")}
                />
              ) : profile ? (
                <ConstructorProfile
                  key={profile.id}
                  id={profile.id}
                  season={season}
                  onBack={() => show("Standings")}
                />
              ) : (
                <Standings season={season} champ={table} />
              ))}
            {v === "Title fight" && (
              <div className="space-y-4">
                <Tabs
                  items={CHAMPS}
                  value={champ}
                  onChange={setChamp}
                  small
                  stretch
                  drive={champBlob}
                />
                <Swipe
                  items={CHAMPS}
                  value={champ}
                  onChange={setChamp}
                  drive={champBlob}
                  render={(c) => (
                    <TitleFight
                      champ={c}
                      season={season}
                      table={latest(c === "drivers" ? d.dt : d.tt)}
                      events={d.events}
                      who={c === "drivers" ? d.who : d.teamWho}
                    />
                  )}
                />
              </div>
            )}
            {v === "H2H" && (
              <Teammates
                duels={d.duels}
                who={d.who}
                hasSprints={
                  season.sprints.length > 0 ||
                  season.sprintQualifying.length > 0
                }
                hasSprintQualifying={season.sprintQualifying.length > 0}
              />
            )}
            {v === "Season" && (
              <SeasonCharts tables={d.dt} who={d.who} gains={d.gains} />
            )}
            {v === "Race pace" && <RacePace season={season} who={d.who} />}
          </>
        )}
      />
    </div>
  );
};
