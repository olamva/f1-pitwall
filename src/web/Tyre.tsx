const TYRE: Record<string, string> = {
  SOFT: "text-tyre-soft border-tyre-soft",
  MEDIUM: "text-tyre-medium border-tyre-medium",
  HARD: "text-tyre-hard border-tyre-hard light:drop-shadow-[0_0_1px_rgb(0_0_0/0.6)]",
  INTERMEDIATE: "text-tyre-inter border-tyre-inter",
  WET: "text-tyre-wet border-tyre-wet",
};

export const tyreColor = (compound: string) =>
  TYRE[compound] ?? "border-zinc-500 text-zinc-400";

interface CompoundProps {
  compound: string;
  className?: string;
}

export const Compound = ({ compound, className = "" }: CompoundProps) => (
  <span
    className={`grid size-5 place-items-center rounded-full border-2 text-[10px] font-bold ${tyreColor(compound)} ${className}`}
  >
    <span className="text-zinc-50">{compound[0]}</span>
  </span>
);
