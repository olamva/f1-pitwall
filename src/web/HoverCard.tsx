import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect>();
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    if (!open || !rect) return;
    const height = panel.current!.offsetHeight;
    const above = rect.top - 8 - height;
    const wanted =
      above >= MARGIN || rect.top > innerHeight - rect.bottom
        ? above
        : rect.bottom + 8;
    setTop(
      scrollY +
        Math.min(Math.max(wanted, MARGIN), innerHeight - height - MARGIN),
    );
  }, [open, rect]);
  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !card) return;
        timer.current = window.setTimeout(() => {
          setRect(ref.current!.getBoundingClientRect());
          setOpen(true);
        }, 300);
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      {children}
      {rect &&
        card &&
        createPortal(
          <div
            ref={panel}
            aria-hidden="true"
            hidden={!open}
            className={`bg-surface pointer-events-none absolute z-30 overflow-hidden rounded-xl p-3 text-left text-zinc-50 shadow-2xl ring-1 ring-zinc-700`}
            style={{
              width: WIDTH,
              left:
                scrollX +
                Math.min(
                  Math.max(rect.left + rect.width / 2 - WIDTH / 2, MARGIN),
                  innerWidth - WIDTH - MARGIN,
                ),
              top,
            }}
          >
            {card}
          </div>,
          document.body,
        )}
    </div>
  );
};
