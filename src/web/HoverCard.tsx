import { useEffect, useRef, useState, type ReactNode } from "react";

interface HoverCardProps {
  card: ReactNode;
  className?: string;
  children: ReactNode;
}

const WIDTH = 288;
const MARGIN = 12;
const GAP = 8;

export const HoverCard = ({ card, className, children }: HoverCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [place, setPlace] = useState<{
    left: number;
    top?: number;
    bottom?: number;
  }>();
  useEffect(() => {
    if (place) pop.current?.showPopover();
  }, [place]);
  if (!card) return children;
  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        timer.current = window.setTimeout(() => {
          const r = ref.current!.getBoundingClientRect();
          const left = Math.min(
            Math.max(r.left + r.width / 2 - WIDTH / 2, MARGIN),
            innerWidth - WIDTH - MARGIN,
          );
          setPlace(
            r.top < 320
              ? { left, top: r.bottom + GAP }
              : { left, bottom: innerHeight - r.top + GAP },
          );
        }, 300);
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        pop.current?.hidePopover();
      }}
    >
      {children}
      {place && (
        <div
          ref={pop}
          popover="manual"
          aria-hidden="true"
          className="bg-surface pointer-events-none fixed inset-auto m-0 rounded-xl p-3 text-left text-zinc-100 shadow-2xl ring-1 ring-zinc-700"
          style={{ width: WIDTH, ...place }}
        >
          {card}
        </div>
      )}
    </div>
  );
};
