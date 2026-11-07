import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface LoadingProps {
  label?: string;
  error?: string | null;
}

const Slow = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  if (tick < 20) return null;
  const dots = ((tick - 20) % 3) + 1;
  return (
    <>
      Loading
      <span aria-hidden>
        {".".repeat(dots)}
        <span className="invisible">{".".repeat(3 - dots)}</span>
      </span>
    </>
  );
};

export const Loading = ({ label, error }: LoadingProps) => (
  <div
    role="status"
    className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-zinc-400"
  >
    {error ? (
      <p className="text-center wrap-anywhere text-red-400">{error}</p>
    ) : (
      <>
        <LoaderCircle className="size-8 animate-spin text-red-500" />
        <p className="min-h-5">{label ?? <Slow />}</p>
      </>
    )}
  </div>
);
