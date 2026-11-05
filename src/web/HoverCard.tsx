import { useRef, useState, type ReactNode } from "react";

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
  const [place, setPlace] = useState<{ shift: number; below: boolean }>();
  if (!card) return children;
  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        timer.current = window.setTimeout(() => {
          const r = ref.current!.getBoundingClientRect();
          const mid = r.left + r.width / 2;
          const edge = WIDTH / 2 + MARGIN;
          setPlace({
            shift: Math.min(Math.max(mid, edge), innerWidth - edge) - mid,
            below: r.top < 320,
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
      {place && (
        <div
          aria-hidden="true"
          hidden={!open}
          className={`bg-surface pointer-events-none absolute left-1/2 z-30 rounded-xl p-3 text-left shadow-2xl ring-1 ring-zinc-700 ${place.below ? "top-full mt-2" : "bottom-full mb-2"}`}
          style={{
            width: WIDTH,
            translate: `calc(-50% + ${place.shift}px)`,
          }}
        >
          {card}
        </div>
      )}
    </div>
  );
};
