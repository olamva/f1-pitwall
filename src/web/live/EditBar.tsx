import { Check, Plus, RotateCcw } from "lucide-react";
import { WIDGETS, type WidgetId } from "./widgets.ts";

interface EditBarProps {
  phone: boolean;
  missing: WidgetId[];
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onDone: () => void;
}

export const EditBar = ({
  phone,
  missing,
  onAdd,
  onReset,
  onDone,
}: EditBarProps) => (
  <div className="glass-panel sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex flex-wrap items-center gap-2 rounded-2xl p-2 text-sm">
    <p className="grow px-2 text-zinc-300">
      {phone
        ? "Drag the grip to move a widget."
        : "Drag a widget to move it. Drag its corner to resize it."}
    </p>
    <button
      popoverTarget="add-widget"
      disabled={!missing.length}
      className="glass-control flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-semibold [anchor-name:--add-widget] disabled:cursor-default disabled:opacity-50"
    >
      <Plus aria-hidden="true" className="size-4" />
      Add
    </button>
    <button
      onClick={() =>
        confirm("Reset the layout for this screen size?") && onReset()
      }
      className="glass-control flex cursor-pointer items-center gap-1.5 px-3 py-1.5"
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      Reset
    </button>
    <button
      onClick={onDone}
      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white"
    >
      <Check aria-hidden="true" className="size-4" />
      Done
    </button>
    <div
      id="add-widget"
      popover="auto"
      className="add-widget bg-surface max-h-[70dvh] w-80 overflow-y-auto rounded-xl border border-zinc-800 p-2 text-sm text-zinc-100 shadow-lg"
    >
      <h2 className="font-f1 px-2 py-1 font-bold">Add a widget</h2>
      <ul>
        {missing.map((id) => (
          <li key={id}>
            <button
              onClick={(event) => {
                onAdd(id);
                event.currentTarget
                  .closest<HTMLElement>("[popover]")!
                  .hidePopover();
              }}
              className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-zinc-800"
            >
              <Plus
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-zinc-400"
              />
              <span>
                <span className="block font-semibold">{WIDGETS[id].title}</span>
                <span className="block text-zinc-400">
                  {WIDGETS[id].about}
                  {WIDGETS[id].only && ` ${WIDGETS[id].only}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
