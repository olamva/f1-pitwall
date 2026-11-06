import {
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRefraction } from "./Glass.tsx";

interface GlassSeekProps extends Omit<ComponentProps<"input">, "type"> {
  progress: number;
  held: boolean;
  onHover?: (x: number, fraction: number) => void;
  children?: ReactNode;
}

export const GlassSeek = ({
  progress,
  held,
  onHover,
  children,
  ...input
}: GlassSeekProps) => {
  const seek = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  useRefraction(seek, thumb, held, 0, [progress]);
  return (
    <div
      ref={seek}
      className="glass-seek relative min-w-0 flex-1"
      data-held={held}
      data-disabled={input.disabled}
      style={{ "--progress": progress } as CSSProperties}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !onHover) return;
        const box = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - box.left - 14) / (box.width - 28);
        onHover(e.clientX - box.left, Math.max(0, Math.min(1, x)));
      }}
    >
      {children}
      <span aria-hidden="true" className="glass-seek-track glass-label" />
      <span aria-hidden="true" className="glass-lens absolute inset-0">
        <span className="glass-seek-track" />
      </span>
      <span ref={thumb} aria-hidden="true" className="glass-seek-thumb" />
      <input type="range" {...input} className="glass-seek-input" />
    </div>
  );
};
