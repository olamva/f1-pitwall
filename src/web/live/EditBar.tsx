import {
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
import { createPortal } from "react-dom";
import { Tabs } from "../Tabs.tsx";
import type { Size } from "./layout.ts";
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
  preview: (id: WidgetId) => ReactNode;
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onEdit: () => void;
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

interface SheetProps {
  sheet: RefObject<HTMLDialogElement | null>;
  open: boolean;
  missing: WidgetId[];
  preview: (id: WidgetId) => ReactNode;
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onClose: () => void;
}

const Sheet = ({
  sheet,
  open,
  missing,
  preview,
  onAdd,
  onReset,
  onClose,
}: SheetProps) => (
  <dialog
    ref={sheet}
    closedby="any"
    onClose={onClose}
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
  preview,
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
  const last = useRef<DOMRect>(undefined);

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
    const check = () => {
      const next =
        box.current!.getBoundingClientRect().top <
        float.current!.getBoundingClientRect().top;
      if (next === on.current) return;
      last.current = (
        on.current ? float : box
      ).current!.firstElementChild!.getBoundingClientRect();
      setAway((on.current = next));
    };
    check();
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

  useLayoutEffect(() => {
    const from = last.current;
    const el = (away ? float : box).current!;
    if (!from || !editing || still()) return;
    const to = el.firstElementChild!.getBoundingClientRect();
    el.animate(
      [
        { translate: `${from.left - to.left}px ${from.top - to.top}px` },
        { translate: "0 0" },
      ],
      { duration: 320, easing: EASE },
    );
  }, [away]);

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
        onClick={onDone}
        className="h-[2.625rem] shrink-0 cursor-pointer rounded-full bg-red-600 px-4 text-sm font-semibold text-white"
      >
        Done
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
            className={`glass-panel fixed top-[calc(env(safe-area-inset-top)+0.5rem)] right-[max(calc(0.625rem-1px),env(safe-area-inset-right))] z-50 flex items-center gap-2 rounded-full p-1.5 shadow-xl ${away ? "" : "invisible"}`}
          >
            {away && controls}
          </div>,
          document.body,
        )}
      <Sheet
        sheet={sheet}
        open={open}
        missing={missing}
        preview={preview}
        onAdd={onAdd}
        onReset={onReset}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
