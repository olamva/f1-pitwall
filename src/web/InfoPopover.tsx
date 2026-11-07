import { Info } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";

interface InfoPopoverProps {
  label: string;
  children: ReactNode;
}

export const InfoPopover = ({ label, children }: InfoPopoverProps) => {
  const id = useId();
  const anchor = `--info${id.replace(/\W/g, "")}`;
  return (
    <>
      <button
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
        style={{ positionAnchor: anchor } as CSSProperties}
        className="info-popover bg-surface w-72 space-y-2 rounded-xl border border-zinc-800 p-3 text-left font-sans text-sm font-normal tracking-normal text-zinc-300 normal-case shadow-lg"
      >
        {children}
      </div>
    </>
  );
};
