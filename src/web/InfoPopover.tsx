import { Info } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

interface InfoPopoverProps {
  label: string;
  children: ReactNode;
}

const GAP = 8;
const EDGE = 16;

const place = (anchor: Element, pop: HTMLElement) => {
  pop.style.display = "block";
  const { offsetWidth: w, offsetHeight: h } = pop;
  pop.style.display = "";
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
  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        className="inline-grid size-6 shrink-0 cursor-pointer place-items-center rounded-full align-middle text-zinc-400 hover:text-zinc-100"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      <div
        id={id}
        popover="auto"
        onBeforeToggle={(e) =>
          e.newState === "open" && place(button.current!, e.currentTarget)
        }
        className="bg-surface absolute inset-auto m-0 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-zinc-800 p-3 text-left font-sans text-sm font-normal tracking-normal text-zinc-300 normal-case shadow-lg"
      >
        {children}
      </div>
    </>
  );
};
