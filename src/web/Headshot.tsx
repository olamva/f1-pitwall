import { createContext, useContext, type ComponentProps } from "react";
import type { DriverInfo } from "../shared/season.ts";

export type Pose = "front" | "left" | "right";
export const BODY = "c_lfill,h_600";
export const BUST = (h: number) => `c_crop,g_north,w_1.0,h_${h}/c_scale,h_500`;
export const Faces = createContext(new Map<string, DriverInfo>());
export const useArt = (id: string) => useContext(Faces).get(id);
export const artSrc = (art: string, pose: Pose, transform = BODY) =>
  `https://media.formula1.com/image/upload/${transform}/q_auto/${art}${pose}.webp`;

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

export const Figure = ({ id, pose, transform, ...props }: FigureProps) => {
  const art = useArt(id)?.art;
  return art && <Headshot src={artSrc(art, pose, transform)} {...props} />;
};
