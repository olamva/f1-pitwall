import type { LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Sheet } from "./Sheet.tsx";

interface GuideSheetProps {
  title: string;
  steps: readonly (readonly [LucideIcon, ReactNode])[];
  children?: ReactNode;
}

export const GuideSheet = ({ title, steps, children }: GuideSheetProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="cursor-pointer text-sm font-semibold text-red-400 underline"
      >
        Show me how
      </button>
      <Sheet sheet={dialog} title={title} className="max-w-lg">
        <ol className="space-y-3 text-sm">
          {steps.map(([Icon, text], i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-800">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        {children}
      </Sheet>
    </>
  );
};
