import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useActive } from "./Swipe.tsx";

export const useConfetti = (on: boolean, year: number, key: string) => {
  const active = useActive();
  const current = year === new Date().getUTCFullYear();
  useEffect(() => {
    const shown: string[] = JSON.parse(
      localStorage.getItem("confetti") ?? "[]",
    );
    if (!on || !current || !active || shown.includes(key)) return;
    localStorage.setItem("confetti", JSON.stringify([...shown, key]));
    for (const x of [0, 1])
      void confetti({
        origin: { x, y: 0.7 },
        angle: x ? 120 : 60,
        spread: 70,
        particleCount: 120,
        disableForReducedMotion: true,
      });
  }, [on, current, active, key]);
};
