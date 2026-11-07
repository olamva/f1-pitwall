import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Compound, tyreColor } from "../Tyre.tsx";
import type { Fit } from "./towerFit.ts";
import type { Row } from "./view.ts";

interface TyreProps {
  compound: string;
  age: number | null;
}

export const Tyre = ({ compound, age }: TyreProps) =>
  compound ? (
    <span className="flex items-center gap-1">
      <Compound compound={compound} />
      <span className="text-zinc-400">{age ?? ""}</span>
    </span>
  ) : null;

interface StintsProps {
  stints: Row["stints"];
  scale: number;
  wide: boolean;
}

interface CoverProps {
  wide: boolean;
  children: ReactNode;
}

export const Cover = ({ wide, children }: CoverProps) => (
  <span
    className={`visible absolute inset-y-0 flex items-center gap-1.5 ${wide ? "px-2" : "px-1"}`}
    style={{ left: "var(--tyres-left)", width: "var(--tyres-width)" }}
  >
    {children}
  </span>
);

export const Stints = ({ stints, scale, wide }: StintsProps) => {
  const set = stints.at(-1);
  return (
    <Cover wide={wide}>
      <span className="flex h-2.5 flex-1 gap-px">
        {stints.map((stint, i) => (
          <span
            key={i}
            title={`${stint.compound.charAt(0)}${stint.compound.slice(1).toLowerCase()}, ${stint.laps} laps`}
            className={`min-w-1 rounded-xs bg-current ${tyreColor(stint.compound)}`}
            style={{ flex: stint.laps }}
          />
        ))}
        <span
          style={{
            flex:
              scale - stints.reduce((total, stint) => total + stint.laps, 0),
          }}
        />
      </span>
      {set && (
        <span
          title={set.new ? "New set" : "Used set"}
          className={`text-[10px] text-zinc-400 ${wide ? "w-[4ch]" : ""}`}
        >
          {set.new ? "N" : "U"}
          {wide && (set.new ? "ew" : "sed")}
        </span>
      )}
    </Cover>
  );
};

export const useCover = (on: boolean) => {
  const table = useRef<HTMLTableElement>(null);
  useLayoutEffect(() => {
    if (!on) return;
    const node = table.current!;
    const measure = () => {
      const cells = [
        ...node.querySelectorAll<HTMLElement>("th[data-tyres]"),
      ].filter((cell) => cell.offsetWidth);
      const left = cells[0]?.offsetLeft ?? 0;
      const last = cells.at(-1);
      node.style.setProperty("--tyres-left", `${left}px`);
      node.style.setProperty(
        "--tyres-width",
        `${last ? last.offsetLeft + last.offsetWidth - left : 0}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  });
  return table;
};

interface TyreCellsProps {
  row: Row;
  race: boolean;
  fit: Fit;
  hide: string;
  scale: number;
}

export const TyreCells = ({ row, race, fit, hide, scale }: TyreCellsProps) => {
  const set = row.stints.at(-1);
  const cover = race ? hide : "";
  return (
    <>
      {fit.tyre && (
        <td className={`${fit.wide ? "px-2" : "px-1"} py-1`}>
          {cover && (
            <Stints stints={row.stints} scale={scale} wide={fit.wide} />
          )}
          <div className={cover}>
            <Tyre compound={set?.compound ?? ""} age={set?.age ?? null} />
          </div>
        </td>
      )}
      {fit.pits && (
        <>
          <td className="px-2 py-1 text-right text-zinc-400">
            <span className={cover}>{row.pits || ""}</span>
          </td>
          <td className="box-content min-w-[5ch] px-2 py-1 text-right text-zinc-400">
            <span className={cover}>{row.pitTime && `${row.pitTime}s`}</span>
          </td>
        </>
      )}
    </>
  );
};
