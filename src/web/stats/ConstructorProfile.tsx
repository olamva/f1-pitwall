import { ArrowLeft } from "lucide-react";
import type {
  ConstructorProfile as Profile,
  Season,
} from "../../shared/season.ts";
import { teamColor } from "../../shared/teams.ts";
import { useJson } from "../api.ts";
import { Car } from "../Headshot.tsx";
import { useConfetti } from "../confetti.ts";
import { Loading } from "../Loading.tsx";
import { DriverHover } from "../DriverCard.tsx";
import { openDriver } from "../path.ts";
import { useBack } from "../Swipe.tsx";
import { TeamLogo } from "../TeamLogo.tsx";
import { clinched, latest, teamTables } from "./derive.ts";
import { Championships } from "./DriverProfile.tsx";

interface ConstructorProfileProps {
  id: string;
  season: Season;
  onBack: () => void;
}

export const ConstructorProfile = ({
  id,
  season,
  onBack,
}: ConstructorProfileProps) => {
  const { data, error } = useJson<Profile>(`/api/constructors/${id}`);
  const color = teamColor(id);
  const champion =
    clinched(season, "constructors") &&
    latest(teamTables(season))[0]?.id === id;
  useConfetti(champion, season.year, `constructor-${season.year}-${id}`);
  useBack(onBack);
  const titles = [
    ...new Set([
      ...(data?.championships ?? []),
      ...(champion ? [season.year] : []),
    ]),
  ];
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All constructors
      </button>
      {!data ? (
        <Loading label="Loading constructor…" error={error} />
      ) : (
        <>
          <section
            className="bg-surface relative overflow-hidden rounded-xl p-5 sm:p-6"
            style={{
              backgroundImage: `linear-gradient(135deg, ${color}40, transparent 60%)`,
            }}
          >
            <TeamLogo
              team={id}
              className="absolute top-5 right-5 h-14 w-24 sm:top-6 sm:right-6 sm:h-24 sm:w-40"
            />
            <div className="relative pr-28 sm:pr-44">
              <h2 className="font-f1 text-3xl font-bold sm:text-4xl">
                {data.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {[
                  data.nationality,
                  data.firstSeason &&
                    (data.firstSeason === data.lastSeason
                      ? `${data.firstSeason}`
                      : `${data.firstSeason}–${data.lastSeason}`),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {data.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-zinc-300 underline decoration-zinc-500 underline-offset-4 hover:text-zinc-50 hover:decoration-zinc-50"
                >
                  History ↗
                </a>
              )}
            </div>
            <Car
              id={id}
              pose="right"
              className="relative mx-auto mt-4 w-full max-w-xl drop-shadow-[0_12px_20px_rgb(0_0_0_/_0.45)]"
            />
            <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6">
              {(
                [
                  ["Seasons", data.seasons.length],
                  ["Starts", data.starts],
                  ["Podiums", data.podiums],
                  ["Poles", data.poles],
                  ["Wins", data.wins],
                  ["Drivers", data.drivers],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-zinc-800/60 p-3">
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="tabular font-f1 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </section>
          {titles.length > 0 && <Championships years={titles} />}
          <section className="bg-surface overflow-x-auto rounded-xl p-3 sm:p-4">
            <h3 className="font-f1 mb-2 text-xs tracking-wider text-zinc-400 uppercase">
              Seasons
            </h3>
            <table className="tabular w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="pb-2 text-left">Season</th>
                  <th className="pb-2 pl-3 text-left">Drivers</th>
                  <th className="pb-2 pl-3 text-right">Starts</th>
                  <th className="pb-2 pl-3 text-right">Wins</th>
                  <th className="pb-2 pl-3 text-right">Podiums</th>
                  <th className="pb-2 pl-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.seasons.map((season) => (
                  <tr
                    key={season.year}
                    className="border-t border-zinc-800 align-top"
                  >
                    <td className="py-1.5 font-semibold">{season.year}</td>
                    <td className="py-1.5 pl-3">
                      {season.drivers.map((driver, i) => (
                        <span key={driver.id}>
                          {i > 0 && ", "}
                          <DriverHover id={driver.id} className="inline-block">
                            <button
                              type="button"
                              onClick={() => openDriver(driver.id)}
                              className="cursor-pointer text-left hover:text-zinc-50 hover:underline"
                            >
                              {driver.name}
                            </button>
                          </DriverHover>
                        </span>
                      ))}
                    </td>
                    <td className="py-1.5 pl-3 text-right">{season.starts}</td>
                    <td className="py-1.5 pl-3 text-right">
                      {season.wins || ""}
                    </td>
                    <td className="py-1.5 pl-3 text-right">
                      {season.podiums || ""}
                    </td>
                    <td className="py-1.5 pl-3 text-right font-semibold">
                      {season.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};
