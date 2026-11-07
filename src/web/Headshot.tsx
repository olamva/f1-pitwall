import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import type { DriverInfo } from "../shared/season.ts";

export type Pose = "front" | "left" | "right";
export const BODY = "c_lfill,h_600";
export const BUST = (h: number) => `c_crop,g_north,w_1.0,h_${h}/c_scale,h_500`;
export const Faces = createContext(new Map<string, DriverInfo>());
export const useArt = (id: string) => useContext(Faces).get(id);
export const artSrc = (art: string, pose: Pose, transform = BODY) =>
  `https://media.formula1.com/image/upload/${transform}/q_auto/${art}${pose}.webp`;
export const numberSrc = (art?: string | null) =>
  art && `https://media.formula1.com/image/upload/${art}numberwhitefrless.svg`;
const TEMPLATE = "common/f1/2026/fallback/driver/2026fallbackdriver";
export const FALLBACK = artSrc(
  TEMPLATE,
  "right",
  "c_crop,g_north,w_0.75,h_0.32/c_scale,h_432",
);
export const PORTRAIT = artSrc(
  TEMPLATE,
  "front",
  "c_thumb,g_face,w_432,h_432,z_0.5",
);

export const carSrc = (art: string, pose: Pose, transform = "c_lfill,w_800") =>
  art.replace(
    /^(common\/f1\/(\d+)\/(\w+))\/.*$/,
    `https://media.formula1.com/image/upload/${transform}/q_auto/$1/$2$3car${pose}.webp`,
  );

export const lineup = (faces: Map<string, DriverInfo>, id: string) =>
  faces.has(id)
    ? [faces.get(id)!]
    : [...new Set(faces.values())].filter((d) => d.team === id && !d.reserve);

const VARIANTS: [Pose, string][] = [
  ["front", BODY],
  ["left", BODY],
  ["right", BODY],
  ["front", BUST(0.42)],
  ["left", BUST(0.55)],
  ["right", BUST(0.55)],
  ["front", BUST(0.6)],
  ["left", BUST(0.6)],
  ["right", BUST(0.6)],
  ["front", "c_thumb,g_face,w_432,h_432,z_0.5"],
];

export const usePreload = (drivers?: DriverInfo[]) =>
  useEffect(() => {
    for (const d of drivers ?? [])
      for (const src of [
        d.headshot,
        numberSrc(d.art),
        ...VARIANTS.map(([pose, t]) => d.art && artSrc(d.art, pose, t)),
      ])
        if (src) Object.assign(new Image(), { fetchPriority: "low", src });
  }, [drivers]);

export const Headshot = (props: ComponentProps<"img">) => (
  <img
    alt=""
    {...props}
    onError={(e) => {
      e.currentTarget.hidden = true;
    }}
  />
);

interface FigureProps extends ComponentProps<"img"> {
  id: string;
  pose: Pose;
  transform?: string;
}

export const Figure = ({ id, pose, transform, ...props }: FigureProps) => (
  <Headshot
    src={artSrc(useArt(id)?.art ?? TEMPLATE, pose, transform)}
    {...props}
  />
);

interface CarProps extends FigureProps {
  fallback?: ReactNode;
}

export const Car = ({ id, pose, transform, fallback, ...props }: CarProps) => {
  const art = lineup(useContext(Faces), id)[0]?.art;
  const src = art && carSrc(art, pose, transform);
  const [failed, setFailed] = useState<string>();
  return src && src !== failed ? (
    <img alt="" {...props} src={src} onError={() => setFailed(src)} />
  ) : (
    fallback
  );
};
