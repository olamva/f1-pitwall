import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useActive } from "./Swipe.tsx";

export const useConfetti = (on: boolean, key: string) => {
  const active = useActive();
  useEffect(() => {
    if (!on || !active) return;
    for (const x of [0, 1])
      void confetti({
        origin: { x, y: 0.7 },
        angle: x ? 120 : 60,
        spread: 70,
        particleCount: 120,
        disableForReducedMotion: true,
      });
  }, [on, active, key]);
};
