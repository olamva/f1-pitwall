import { Info } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Hint } from "./Hint.tsx";

interface InfoPopoverProps {
  label: string;
  children: ReactNode;
}

const GAP = 8;
const EDGE = 16;

const place = (anchor: Element, pop: HTMLElement) => {
  const { offsetWidth: w, offsetHeight: h } = pop;
  const a = anchor.getBoundingClientRect();
  const ceiling = Math.max(
    0,
    ...[...document.querySelectorAll("nav, .top-band")]
      .map((n) => n.getBoundingClientRect())
      .filter((r) => r.height && r.right > 0 && r.left < innerWidth)
      .filter((r) => r.bottom <= a.top)
      .map((r) => r.bottom),
  );
  const above = a.top - GAP - h;
  const top = above >= ceiling + GAP ? above : a.bottom + GAP;
  const left = Math.min(
    Math.max(a.left + a.width / 2 - w / 2, EDGE),
    innerWidth - w - EDGE,
  );
  pop.style.top = `${top + scrollY}px`;
  pop.style.left = `${left + scrollX}px`;
};

export const InfoPopover = ({ label, children }: InfoPopoverProps) => {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    place(button.current!, pop.current!);
    const outside = (e: PointerEvent) =>
      ![button.current, pop.current].some((n) =>
        n?.contains(e.target as Node),
      ) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", outside);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <>
      <Hint label={label} className="inline-flex shrink-0 align-middle">
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="grid size-6 cursor-pointer place-items-center rounded-full text-zinc-400 hover:text-zinc-100"
        >
          <Info aria-hidden="true" className="size-4" />
        </button>
      </Hint>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={id}
            className="bg-surface absolute z-10 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300 shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
};
