import type { Track } from "../shared/timing.ts";
import { outlineFor } from "./archive.ts";
import { get } from "./jolpica.ts";

const KEYS: Record<string, number> = {
  silverstone: 2,
  hungaroring: 4,
  imola: 6,
  spa: 7,
  americas: 9,
  albert_park: 10,
  sepang: 12,
  interlagos: 14,
  catalunya: 15,
  red_bull_ring: 19,
  monaco: 22,
  villeneuve: 23,
  ricard: 28,
  hockenheimring: 34,
  monza: 39,
  suzuka: 46,
  shanghai: 49,
  zandvoort: 55,
  istanbul: 59,
  marina_bay: 61,
  bahrain: 63,
  rodriguez: 65,
  yas_marina: 70,
  nurburgring: 72,
  sochi: 79,
  baku: 144,
  mugello: 146,
  portimao: 147,
  jeddah: 149,
  losail: 150,
  miami: 151,
  vegas: 152,
  madring: 153,
};
const TRACK_POINTS = 120;
const tracks = new Map<number, Promise<Record<number, Track>>>();

const loadTracks = async (year: number) => {
  const schedule = await get(
    `${year}.json?limit=100`,
    year === new Date().getUTCFullYear() ? undefined : 24 * 60 * 60_000,
  );
  const entries = await Promise.all(
    schedule.RaceTable.Races.map(async (race: any) => {
      const key = KEYS[race.Circuit.circuitId];
      const outline =
        key &&
        (await outlineFor(
          { Meeting: { Circuit: { Key: key } }, StartDate: race.date },
          () => null,
        ));
      if (!outline) return [];
      const step = Math.ceil(outline.x.length / TRACK_POINTS);
      const keep = (_: number, i: number) => i % step === 0;
      return [
        [
          Number(race.round),
          {
            rotation: outline.rotation,
            x: outline.x.filter(keep),
            y: outline.y.filter(keep),
          },
        ],
      ];
    }),
  );
  return Object.fromEntries(entries.flat());
};

export function circuitTracks(year: number): Promise<Record<number, Track>> {
  if (year < 2018) return Promise.resolve({});
  const result = tracks.get(year) ?? loadTracks(year);
  tracks.set(year, result);
  result.catch(() => tracks.get(year) === result && tracks.delete(year));
  return result;
}
