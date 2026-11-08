import { X } from "lucide-react";
import { useEffect, type ReactNode, type RefObject } from "react";
import { Hint } from "./Hint.tsx";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const timing = { duration: 400, easing: EASE, fill: "forwards" } as const;

const leave = (
  dialog: HTMLDialogElement,
  keyframes: PropertyIndexedKeyframes,
) => {
  const dim = dialog.animate(
    { opacity: 0 },
    { ...timing, pseudoElement: "::backdrop" },
  );
  const slide = dialog.animate(keyframes, timing);
  slide.finished.then(() => {
    dialog.close();
    dim.cancel();
    slide.cancel();
  });
};

export const dismiss = (dialog: HTMLDialogElement) => {
  const style = getComputedStyle(dialog);
  leave(dialog, {
    translate: style.getPropertyValue("--away"),
    scale: style.getPropertyValue("--shrink"),
    opacity: style.getPropertyValue("--fade"),
  });
};

const drag = (dialog: HTMLDialogElement) => {
  let start: number | null = null;
  let dy = 0;
  let speed = 0;
  let last = { y: 0, at: 0 };
  const down = (event: TouchEvent) => {
    const y = event.touches[0].clientY;
    start = event.touches.length === 1 && dialog.scrollTop <= 0 ? y : null;
    dy = speed = 0;
    last = { y, at: event.timeStamp };
  };
  const move = (event: TouchEvent) => {
    if (start === null) return;
    const y = event.touches[0].clientY;
    if (!dy && y <= start) return void (start = null);
    event.preventDefault();
    dy = Math.max(0, y - start);
    speed = (y - last.y) / Math.max(1, event.timeStamp - last.at);
    last = { y, at: event.timeStamp };
    dialog.style.translate = `0 ${dy}px`;
  };
  const up = () => {
    if (start === null || !dy) return;
    start = null;
    const from = dialog.style.translate;
    dialog.style.translate = "";
    if (dy > dialog.offsetHeight / 4 || speed > 0.5)
      leave(dialog, {
        translate: [
          from,
          `0 ${innerHeight - dialog.getBoundingClientRect().top}px`,
        ],
      });
    else
      dialog.animate(
        { translate: [from, "0"] },
        { duration: 300, easing: EASE },
      );
  };
  const events = {
    touchstart: down,
    touchmove: move,
    touchend: up,
    touchcancel: up,
  };
  for (const [name, handler] of Object.entries(events))
    dialog.addEventListener(name, handler as EventListener, {
      passive: name !== "touchmove",
    });
  return () => {
    for (const [name, handler] of Object.entries(events))
      dialog.removeEventListener(name, handler as EventListener);
  };
};

interface SheetProps {
  sheet: RefObject<HTMLDialogElement | null>;
  title: string;
  actions?: ReactNode;
  className: string;
  onClose?: () => void;
  children: ReactNode;
}

export const Sheet = ({
  sheet,
  title,
  actions,
  className,
  onClose,
  children,
}: SheetProps) => {
  useEffect(() => drag(sheet.current!), []);
  return (
    <dialog
      ref={sheet}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dismiss(e.currentTarget)}
      className={`glass-sheet fixed inset-x-0 bottom-2 mx-auto max-h-[85dvh] w-[calc(100%-1rem)] overflow-y-auto rounded-[2.5rem] text-zinc-100 max-sm:top-auto sm:top-0 sm:bottom-0 sm:my-auto sm:rounded-4xl ${className}`}
    >
      <div className="space-y-4 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <h2 className="font-f1 grow text-lg font-bold">{title}</h2>
          {actions}
          <Hint label="Close" className="shrink-0">
            <button
              type="button"
              aria-label="Close"
              onClick={() => dismiss(sheet.current!)}
              className="glass-gear grid size-11 cursor-pointer place-items-center"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </Hint>
        </div>
        {children}
      </div>
    </dialog>
  );
};
