import { useSyncExternalStore } from "react";
import type { DriverInfo } from "../shared/season.ts";
import { save, subscribe } from "./synced.ts";
import { teamKey } from "./TeamLogo.tsx";

export type Favourite = Pick<DriverInfo, "id" | "code">;

const useSetting = <T>(key: string): T | null =>
  JSON.parse(
    useSyncExternalStore(subscribe, () => localStorage.getItem(key)) ?? "null",
  );

export const setFavourite = (driver: Favourite | null) =>
  save("favourite", driver && { id: driver.id, code: driver.code });

export const useFavourite = () => useSetting<Favourite>("favourite");

export const setFavouriteTeam = (team: string | null) => save("team", team);

export const useFavouriteTeam = () => useSetting<string>("team");

export const FAVOURITE_ROW = "bg-red-600/15 light:bg-zinc-800";

export const useTeamRow = (style = "bg-sky-500/15") => {
  const team = useFavouriteTeam();
  return (id: string) => (team && teamKey(id) === teamKey(team) ? style : "");
};
