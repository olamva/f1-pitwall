import {
  Monitor,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Tabs } from "../Tabs.tsx";
import type { Size } from "./layout.ts";
import { WIDGETS, type WidgetId } from "./widgets.ts";

const Landscape = ((props: LucideProps) => (
  <Tablet {...props} className={`${props.className ?? ""} rotate-90`} />
)) as unknown as LucideIcon;

interface EditBarProps {
  sizes: Size[];
  size: Size;
  onSize: (size: Size) => void;
  missing: WidgetId[];
  preview: (id: WidgetId) => ReactNode;
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onDone: () => void;
}

const Preview = ({ id, children }: { id: WidgetId; children: ReactNode }) => (
  <span className="bg-surface pointer-events-none relative block h-36 overflow-hidden rounded-xl ring-1 ring-zinc-800">
    {children ? (
      <span inert className="block w-[250%] origin-top-left [zoom:0.4]">
        {children}
      </span>
    ) : (
      <span className="grid h-full place-items-center px-3 text-center text-xs text-zinc-500">
        {WIDGETS[id].only}
      </span>
    )}
  </span>
);

export const EditBar = ({
  sizes,
  size,
  onSize,
  missing,
  preview,
  onAdd,
  onReset,
  onDone,
}: EditBarProps) => {
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-panel sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex items-center gap-2 rounded-full p-1.5 text-sm">
      <button
        type="button"
        aria-label="Add a widget"
        title="Add a widget"
        onClick={() => {
          setOpen(true);
          sheet.current!.showModal();
        }}
        className="glass-control grid size-9 shrink-0 cursor-pointer place-items-center"
      >
        <Plus aria-hidden="true" className="size-5" />
      </button>
      <div className="flex min-w-0 grow justify-center">
        {sizes.length > 1 && (
          <Tabs
            small
            items={sizes}
            value={size}
            onChange={onSize}
            labels={{ phone: "Phone", tablet: "Tablet", desktop: "Desktop" }}
            icons={{ phone: Smartphone, tablet: Landscape, desktop: Monitor }}
            iconOnly
          />
        )}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="shrink-0 cursor-pointer rounded-full bg-red-600 px-4 py-1.5 font-semibold text-white"
      >
        Done
      </button>
      <dialog
        ref={sheet}
        closedby="any"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="bg-surface motion-safe:animate-toast-in fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border-t border-zinc-800 text-zinc-100 backdrop:bg-black/60 sm:bottom-auto sm:my-auto sm:rounded-3xl sm:border"
      >
        <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <h2 className="font-f1 grow text-lg font-bold">Widgets</h2>
            <button
              type="button"
              onClick={() => {
                if (!confirm("Reset the layout for this screen size?")) return;
                onReset();
                sheet.current?.close();
              }}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 text-sm font-semibold hover:bg-zinc-700"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={() => sheet.current?.close()}
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"
            >
              <X className="size-4" />
            </button>
          </div>
          {missing.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {missing.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(id);
                      sheet.current?.close();
                    }}
                    className="group w-full cursor-pointer space-y-2 text-left"
                  >
                    <span className="block transition-transform group-active:scale-95">
                      <Preview id={id}>{open && preview(id)}</Preview>
                    </span>
                    <span className="block px-1">
                      <span className="block font-semibold">
                        {WIDGETS[id].title}
                      </span>
                      <span className="block text-xs text-zinc-400">
                        {WIDGETS[id].about}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">
              All widgets are on the screen.
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
};
