import type { ReactNode } from "react";
import { HoverCard } from "../HoverCard.tsx";

interface HintProps {
  label: string;
  text: string;
  tone: string;
  children: ReactNode;
}

export const Hint = ({ label, text, tone, children }: HintProps) => (
  <HoverCard
    card={
      <>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-xs text-zinc-400">{text}</p>
      </>
    }
    className={`inline-flex ${tone}`}
  >
    <span aria-label={label}>{children}</span>
  </HoverCard>
);
