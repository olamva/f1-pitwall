import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverCardProps {
  card: ReactNode;
  className?: string;
  children: ReactNode;
}

const WIDTH = 288;
const MARGIN = 12;

export const HoverCard = ({ card, className, children }: HoverCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{
    left: number;
    top: number;
    below: boolean;
  }>();
  if (!card) return children;
  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        timer.current = window.setTimeout(() => {
          const r = ref.current!.getBoundingClientRect();
          const below = r.top < 320;
          setPlace({
            left: Math.min(
              Math.max(r.left + r.width / 2 - WIDTH / 2, MARGIN),
              innerWidth - WIDTH - MARGIN,
            ),
            top: below ? r.bottom + 8 : r.top - 8,
            below,
          });
          setOpen(true);
        }, 300);
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      {children}
      {place &&
        createPortal(
          <div
            aria-hidden="true"
            hidden={!open}
            className={`bg-surface pointer-events-none fixed z-30 rounded-xl p-3 text-left text-sm shadow-2xl ring-1 ring-zinc-700 ${place.below ? "" : "-translate-y-full"}`}
            style={{ width: WIDTH, left: place.left, top: place.top }}
          >
            {card}
          </div>,
          document.body,
        )}
    </div>
  );
};
