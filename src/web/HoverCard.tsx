import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverCardProps {
  card: ReactNode;
  at?: number;
  interactive?: boolean;
  tip?: boolean;
  className?: string;
  children?: ReactNode;
}

const WIDTH = 288;
const MARGIN = 12;
const GAP = 8;
const TALL = 96;

export const HoverCard = ({
  card,
  at,
  interactive = false,
  tip = false,
  className,
  children,
}: HoverCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [box, setBox] = useState<DOMRect>();
  const [edge, setEdge] = useState<{ top?: number; bottom?: number }>();
  const [width, setWidth] = useState(WIDTH);
  useLayoutEffect(() => {
    if (!box) return;
    pop.current!.showPopover();
    setWidth(pop.current!.offsetWidth);
    const height = pop.current!.offsetHeight;
    setEdge(
      box.top >= height
        ? { bottom: innerHeight - box.top }
        : innerHeight - box.bottom >= height
          ? { top: box.bottom }
          : {
              top: Math.max(
                MARGIN - GAP,
                Math.min(
                  box.top > innerHeight - box.bottom
                    ? box.top - height
                    : box.bottom,
                  innerHeight - height - MARGIN + GAP,
                ),
              ),
            },
    );
  }, [box]);
  const close = () => {
    clearTimeout(timer.current);
    timer.current = 0;
    pop.current?.hidePopover();
  };
  if (!card) return children;
  return (
    <div
      ref={ref}
      data-hover
      className={className}
      onPointerOver={(e) => {
        if (e.pointerType !== "mouse" || (tip && e.buttons)) return;
        const target = e.target as Element;
        if (
          target.closest("[data-hover]") !== ref.current &&
          !pop.current?.contains(target)
        )
          return close();
        const y = e.clientY;
        timer.current ||= window.setTimeout(() => {
          const r = ref.current!.getBoundingClientRect();
          setBox(
            tip && r.height > TALL ? new DOMRect(r.left, y, r.width, 0) : r,
          );
        }, 300);
      }}
      onPointerDown={tip ? close : undefined}
      onPointerLeave={close}
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
              width: tip ? "max-content" : WIDTH,
              maxWidth: WIDTH,
              left: Math.min(
                Math.max(box.left + (at ?? box.width / 2) - width / 2, MARGIN),
                innerWidth - width - MARGIN,
              ),
              ...edge,
              paddingBlock: GAP,
            }}
          >
            <div className="bg-surface overflow-hidden rounded-xl p-3 text-left shadow-2xl ring-1 ring-zinc-700">
              {card}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
