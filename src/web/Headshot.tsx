import { createContext, useContext, type ComponentProps } from "react";

export const Faces = createContext(new Map<string, string | null>());

export const Headshot = (props: ComponentProps<"img">) => (
  <img
    alt=""
    {...props}
    onError={(e) => {
      e.currentTarget.hidden = true;
    }}
  />
);

interface FaceProps {
  id: string;
  color: string;
  className: string;
}

export const Face = ({ id, color, className }: FaceProps) => {
  const src = useContext(Faces).get(id);
  return (
    src && (
      <Headshot
        src={src}
        className={`rounded-full object-cover object-top ${className}`}
        style={{ background: `color-mix(in srgb, ${color} 40%, transparent)` }}
      />
    )
  );
};
