import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverCardProps {
  card: ReactNode;
  at?: number;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

const WIDTH = 288;
const MARGIN = 12;
const GAP = 8;

export const HoverCard = ({
  card,
  at,
  interactive = false,
  className,
  children,
}: HoverCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [box, setBox] = useState<DOMRect>();
  useEffect(() => {
    if (box) pop.current?.showPopover();
  }, [box]);
  if (!card) return children;
  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        timer.current = window.setTimeout(
          () => setBox(ref.current!.getBoundingClientRect()),
          300,
        );
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        pop.current?.hidePopover();
      }}
    >
      {children}
      {box &&
        createPortal(
          <div
            ref={pop}
            popover="manual"
            aria-hidden={!interactive}
            className={`fixed inset-auto m-0 overflow-visible bg-transparent text-sm text-zinc-100 ${interactive ? "" : "pointer-events-none"}`}
            style={{
              width: WIDTH,
              left: Math.min(
                Math.max(box.left + (at ?? box.width / 2) - WIDTH / 2, MARGIN),
                innerWidth - WIDTH - MARGIN,
              ),
              ...(box.top < 320
                ? { top: box.bottom, paddingTop: GAP }
                : { bottom: innerHeight - box.top, paddingBottom: GAP }),
            }}
          >
            <div className="bg-surface rounded-xl p-3 text-left shadow-2xl ring-1 ring-zinc-700">
              {card}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
