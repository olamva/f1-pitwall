import type { ComponentProps } from "react";

export const Headshot = (props: ComponentProps<"img">) => (
  <img
    alt=""
    {...props}
    onError={(e) => {
      e.currentTarget.hidden = true;
    }}
  />
);
