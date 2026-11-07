import { Info } from "lucide-react";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";

interface InfoPopoverProps {
  label: string;
  children: ReactNode;
}

const clearOfNavs = (anchor: Element, pop: HTMLElement) => {
  const a = anchor.getBoundingClientRect();
  const navs = [...document.querySelectorAll("nav, .top-band")]
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.height && r.right > 0 && r.left < innerWidth);
  const above = navs.filter((r) => r.bottom <= a.top).map((r) => r.bottom);
  const below = navs.filter((r) => r.top >= a.bottom).map((r) => r.top);
  pop.style.setProperty("--info-top", `${Math.max(0, ...above)}px`);
  pop.style.setProperty(
    "--info-bottom",
    `${innerHeight - Math.min(innerHeight, ...below)}px`,
  );
};

export const InfoPopover = ({ label, children }: InfoPopoverProps) => {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const anchor = `--info${id.replace(/\W/g, "")}`;
  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        style={{ anchorName: anchor } as CSSProperties}
        className="inline-grid size-6 shrink-0 cursor-pointer place-items-center rounded-full align-middle text-zinc-400 hover:text-zinc-100"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      <div
        id={id}
        popover="auto"
        onBeforeToggle={(e) =>
          e.newState === "open" && clearOfNavs(button.current!, e.currentTarget)
        }
        style={{ positionAnchor: anchor } as CSSProperties}
        className="info-popover bg-surface w-72 space-y-2 rounded-xl border border-zinc-800 p-3 text-left font-sans text-sm font-normal tracking-normal text-zinc-300 normal-case shadow-lg"
      >
        {children}
      </div>
    </>
  );
};
