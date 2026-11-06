import { useLayoutEffect, useRef, type RefObject } from "react";

export type Shift = { x: number; y: number };

export const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export const smooth = (t: number) => t * t * t * (t * (6 * t - 15) + 10);

export const ramp = (t: number, from: number, to: number) =>
  smooth(Math.min(1, Math.max(0, (t - from) / (to - from))));

export const frames = (steps: number, frame: (t: number) => Keyframe) =>
  Array.from({ length: steps + 1 }, (_, i) => ({
    ...frame(i / steps),
    offset: i / steps,
  }));

const offset = (el: HTMLElement) => {
  const m = new DOMMatrix(
    getComputedStyle(el).transform.replace("none", "matrix(1,0,0,1,0,0)"),
  );
  return { x: m.m41, y: m.m42 };
};

export const useFlip = (
  root: RefObject<HTMLElement | null>,
  play: (el: HTMLElement, from: Shift | null) => void,
) => {
  const last = useRef<Map<string, Shift> | null>(null);
  useLayoutEffect(() => {
    const next = new Map<string, Shift>();
    for (const el of root.current?.querySelectorAll<HTMLElement>(
      "[data-flip]",
    ) ?? []) {
      const now = { x: el.offsetLeft, y: el.offsetTop };
      const was = last.current?.get(el.dataset.flip!) ?? null;
      next.set(el.dataset.flip!, now);
      if (!last.current || still() || (was?.x === now.x && was.y === now.y))
        continue;
      const moving = offset(el);
      for (const a of el.getAnimations()) a.cancel();
      play(
        el,
        was && { x: was.x - now.x + moving.x, y: was.y - now.y + moving.y },
      );
    }
    last.current = next;
  });
};

export const useEntrance = (
  root: RefObject<HTMLElement | null>,
  play: (el: HTMLElement) => void,
) =>
  useLayoutEffect(() => {
    if (still()) return;
    for (const el of root.current?.querySelectorAll<HTMLElement>(
      "[data-flip]",
    ) ?? [])
      play(el);
  }, []);

interface CountProps {
  value: number;
  format: (v: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

export const Count = ({
  value,
  format,
  duration = 900,
  delay = 0,
  className,
}: CountProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const text = format(value);
  useLayoutEffect(() => {
    const el = ref.current!;
    const from = shown.current;
    if (from === value || still()) {
      shown.current = value;
      el.textContent = text;
      return;
    }
    const start = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      shown.current = from + (value - from) * smooth(t);
      el.textContent = t < 1 ? format(shown.current) : text;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    tick(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [value, text]);
  return <span ref={ref} className={className} />;
};
