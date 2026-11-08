import type { ReactNode } from "react";
import { HoverCard } from "./HoverCard.tsx";

interface HintProps {
  label: string;
  text?: string;
  className?: string;
  children?: ReactNode;
}

export const Hint = ({ label, text, className, children }: HintProps) => (
  <HoverCard
    tip
    card={
      label && (
        <>
          <p className="font-semibold">{label}</p>
          {text && (
            <p className="mt-1 text-xs whitespace-pre-line text-zinc-400">
              {text}
            </p>
          )}
        </>
      )
    }
    className={className}
  >
    {children}
  </HoverCard>
);
