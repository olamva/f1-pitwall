import {
  Check,
  LayoutDashboard,
  Monitor,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { Tabs } from "../Tabs.tsx";
import type { Size } from "./layout.ts";
import { sampleTiles } from "./sample.tsx";
import { WIDGETS, type WidgetId } from "./widgets.ts";

const Landscape = ((props: LucideProps) => (
  <Tablet {...props} className={`${props.className ?? ""} rotate-90`} />
)) as unknown as LucideIcon;

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

interface EditBarProps {
  editing: boolean;
  sizes: Size[];
  size: Size;
  onSize: (size: Size) => void;
  missing: WidgetId[];
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onEdit: () => void;
  onDone: () => void;
}

const Preview = ({ children }: { children: ReactNode }) => (
  <span className="bg-surface pointer-events-none relative block h-36 overflow-hidden rounded-xl ring-1 ring-zinc-800">
    <span inert className="block w-[250%] origin-top-left scale-40">
      {children}
    </span>
  </span>
);

interface SheetProps {
  sheet: RefObject<HTMLDialogElement | null>;
  open: boolean;
  missing: WidgetId[];
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onClose: () => void;
}

const Sheet = ({
  sheet,
  open,
  missing,
  onAdd,
  onReset,
  onClose,
}: SheetProps) => (
  <dialog
    ref={sheet}
    closedby="any"
    onClose={onClose}
    onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    className="bg-surface motion-safe:animate-toast-in fixed inset-x-0 bottom-0 mx-auto max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border-t border-zinc-800 text-zinc-100 backdrop:bg-black/60 max-sm:top-auto sm:top-0 sm:my-auto sm:rounded-3xl sm:border"
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
                  <Preview>{open && sampleTiles()[id]()}</Preview>
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
        <p className="text-sm text-zinc-400">All widgets are on the screen.</p>
      )}
    </div>
  </dialog>
);

export const EditBar = ({
  editing,
  sizes,
  size,
  onSize,
  missing,
  onAdd,
  onReset,
  onEdit,
  onDone,
}: EditBarProps) => {
  const sheet = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const [open, setOpen] = useState(false);
  const [away, setAway] = useState(false);
  const float = useRef<HTMLDivElement>(null);
  const on = useRef(false);

  useLayoutEffect(() => {
    const el = box.current!;
    const to = el.offsetWidth;
    const from = width.current;
    width.current = to;
    if (!from || from === to || still()) return;
    el.style.overflowX = "clip";
    el.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: 300,
      easing: EASE,
    }).onfinish = () => el.style.removeProperty("overflow-x");
    [...el.children].forEach((child, i, all) =>
      child.animate(
        [
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1 },
        ],
        {
          duration: 220,
          delay: (all.length - 1 - i) * 40,
          easing: EASE,
          fill: "backwards",
        },
      ),
    );
  }, [editing]);

  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!editing) return setAway((on.current = false));
    const pinned = () =>
      box.current!.firstElementChild!.getBoundingClientRect().top <
      float.current!.firstElementChild!.getBoundingClientRect().top;
    setAway((on.current = pinned()));
    const check = () =>
      pinned() !== on.current &&
      flushSync(() => setAway((on.current = !on.current)));
    const key = (e: KeyboardEvent) =>
      e.key === "Escape" &&
      !document.querySelector("dialog[open]") &&
      done.current();
    addEventListener("scroll", check, { passive: true });
    addEventListener("keydown", key);
    return () => {
      removeEventListener("scroll", check);
      removeEventListener("keydown", key);
    };
  }, [editing]);

  const controls = (
    <>
      <button
        type="button"
        aria-label="Add a widget"
        title="Add a widget"
        onClick={() => {
          setOpen(true);
          sheet.current!.showModal();
        }}
        className="glass-gear grid size-[2.625rem] shrink-0 cursor-pointer place-items-center"
      >
        <Plus aria-hidden="true" className="size-5" />
      </button>
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
      <button
        type="button"
        aria-label="Done"
        title="Done"
        onClick={onDone}
        className="grid size-[2.625rem] shrink-0 cursor-pointer place-items-center rounded-full bg-red-600 text-white"
      >
        <Check aria-hidden="true" className="size-5" />
      </button>
    </>
  );

  return (
    <>
      <div
        ref={box}
        className={`-my-1 flex shrink-0 items-center justify-end gap-2 ${away ? "invisible" : ""}`}
      >
        {editing ? (
          controls
        ) : (
          <button
            type="button"
            onClick={onEdit}
            title="Move, resize, add and remove widgets"
            className="glass-gear my-1 flex shrink-0 cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap"
          >
            <LayoutDashboard aria-hidden="true" size={16} />
            Customize
          </button>
        )}
      </div>
      {editing &&
        createPortal(
          <div
            ref={float}
            className={`fixed top-(--top-bar) right-[max(0.625rem,env(safe-area-inset-right))] z-50 flex items-center gap-2 p-1.5 ${away ? "" : "invisible"}`}
          >
            {controls}
            <span
              aria-hidden="true"
              className={`glass-panel pointer-events-none absolute inset-0 -z-10 rounded-full shadow-xl motion-reduce:transition-none ${away ? "transition-opacity duration-700 ease-in-out" : "opacity-0"}`}
            />
          </div>,
          document.body,
        )}
      <Sheet
        sheet={sheet}
        open={open}
        missing={missing}
        onAdd={onAdd}
        onReset={onReset}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
