import { useRef, useState, type ReactNode } from "react";

interface HoverCardProps {
  card: ReactNode;
  at?: number;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

const WIDTH = 288;
const MARGIN = 12;

export const HoverCard = ({
  card,
  at,
  interactive = false,
  className,
  children,
}: HoverCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<DOMRect>();
  if (!card) return children;
  const edge = WIDTH / 2 + MARGIN;
  const mid = box && box.left + (at ?? box.width / 2);
  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        timer.current = window.setTimeout(() => {
          setBox(ref.current!.getBoundingClientRect());
          setOpen(true);
        }, 300);
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      {children}
      {box && (
        <div
          aria-hidden={!interactive}
          hidden={!open}
          className={`absolute z-30 ${interactive ? "" : "pointer-events-none"} ${box.top < 320 ? "top-full pt-2" : "bottom-full pb-2"}`}
          style={{
            width: WIDTH,
            left:
              Math.min(Math.max(mid!, edge), innerWidth - edge) -
              box.left -
              WIDTH / 2,
          }}
        >
          <div className="bg-surface rounded-xl p-3 text-left shadow-2xl ring-1 ring-zinc-700">
            {card}
          </div>
        </div>
      )}
    </div>
  );
};
