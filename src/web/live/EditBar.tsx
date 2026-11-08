import {
  Check,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  Laptop,
  LayoutDashboard,
  Monitor,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  Undo2,
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
import { dismiss, Sheet } from "../Sheet.tsx";
import { Tabs } from "../Tabs.tsx";
import type { Size } from "./layout.ts";
import { sampleTiles } from "./sample.tsx";
import { copyLayouts, pasteLayouts } from "./useLayout.ts";
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
  hideOff?: boolean;
  onHideOff: (hide: boolean) => void;
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onEdit: () => void;
  onDiscard?: () => void;
  onDone: () => void;
}

const Preview = ({ children }: { children: ReactNode }) => (
  <span className="bg-surface pointer-events-none relative block h-36 overflow-hidden rounded-xl ring-1 ring-zinc-800">
    <span inert className="block w-[250%] origin-top-left scale-40">
      {children}
    </span>
  </span>
);

interface WidgetSheetProps {
  sheet: RefObject<HTMLDialogElement | null>;
  open: boolean;
  missing: WidgetId[];
  onAdd: (id: WidgetId) => void;
  onReset: () => void;
  onClose: () => void;
}

const WidgetSheet = ({
  sheet,
  open,
  missing,
  onAdd,
  onReset,
  onClose,
}: WidgetSheetProps) => {
  const [copied, setCopied] = useState(false);
  return (
    <Sheet
      sheet={sheet}
      title="Widgets"
      className="max-w-3xl"
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      actions={
        <button
          type="button"
          onClick={() => {
            if (!confirm("Reset the layout for this screen size?")) return;
            onReset();
            dismiss(sheet.current!);
          }}
          className="glass-gear flex h-11 cursor-pointer items-center gap-1.5 px-4 text-sm font-semibold whitespace-nowrap"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reset to Default
        </button>
      }
    >
      {missing.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {missing.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(id);
                  dismiss(sheet.current!);
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
        <p className="text-sm text-zinc-400">All widgets are added.</p>
      )}
      <div className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(copyLayouts())
              .then(() => setCopied(true))
          }
          className="glass-gear flex h-11 cursor-pointer items-center justify-center gap-1.5 px-4 text-sm font-semibold whitespace-nowrap"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Copied" : "Copy Layout"}
        </button>
        <button
          type="button"
          onClick={() => {
            const text = prompt("Paste a layout.");
            if (text === null) return;
            if (!pasteLayouts(text)) return alert("This is not a layout.");
            dismiss(sheet.current!);
          }}
          className="glass-gear flex h-11 cursor-pointer items-center justify-center gap-1.5 px-4 text-sm font-semibold whitespace-nowrap"
        >
          <ClipboardPaste aria-hidden="true" className="size-4" />
          Paste Layout
        </button>
      </div>
    </Sheet>
  );
};

export const EditBar = ({
  editing,
  sizes,
  size,
  onSize,
  missing,
  hideOff,
  onHideOff,
  onAdd,
  onReset,
  onEdit,
  onDiscard,
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
      child.animate([{ opacity: 0, scale: 0.9, offset: 0 }], {
        duration: 220,
        delay: (all.length - 1 - i) * 40,
        easing: EASE,
        fill: "backwards",
      }),
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
      {hideOff !== undefined && (
        <button
          type="button"
          aria-label="Hide widgets that do not show in this session"
          title="Hide widgets that do not show in this session"
          aria-pressed={hideOff}
          onClick={() => onHideOff(!hideOff)}
          className="glass-gear grid size-[2.625rem] shrink-0 cursor-pointer place-items-center"
        >
          {hideOff ? (
            <EyeOff aria-hidden="true" className="size-5" />
          ) : (
            <Eye aria-hidden="true" className="size-5" />
          )}
        </button>
      )}
      {sizes.length > 1 && (
        <Tabs
          small
          items={sizes}
          value={size}
          onChange={onSize}
          labels={{
            phone: "Phone",
            tablet: "Tablet",
            desktop: "Laptop",
            display: "Large display",
          }}
          icons={{
            phone: Smartphone,
            tablet: Landscape,
            desktop: Laptop,
            display: Monitor,
          }}
          iconOnly
        />
      )}
      <button
        type="button"
        aria-label="Discard changes"
        title="Discard changes"
        onClick={onDiscard}
        disabled={!onDiscard}
        className="glass-gear grid size-[2.625rem] shrink-0 cursor-pointer place-items-center disabled:cursor-default disabled:opacity-40"
      >
        <Undo2 aria-hidden="true" className="size-5" />
      </button>
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
            className="glass-gear my-1 flex h-9 w-32 shrink-0 cursor-pointer items-center justify-center gap-2 text-sm whitespace-nowrap max-sm:w-9"
          >
            <LayoutDashboard aria-hidden="true" size={16} />
            <span className="max-sm:sr-only">Customize</span>
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
      <WidgetSheet
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
