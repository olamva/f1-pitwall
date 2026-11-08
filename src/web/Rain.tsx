import { useMemo } from "react";

interface RainProps {
  drops: number;
}

export const Rain = ({ drops }: RainProps) => {
  const styles = useMemo(
    () =>
      Array.from({ length: drops }, () => ({
        left: `${Math.random() * 115 - 5}%`,
        height: `${8 + Math.random() * 16}px`,
        opacity: 0.15 + Math.random() * 0.5,
        animationDuration: `${0.45 + Math.random() * 0.5}s`,
        animationDelay: `${-Math.random()}s`,
      })),
    [drops],
  );
  return (
    <div className="pointer-events-none absolute inset-0 [content-visibility:auto]">
      {styles.map((style, i) => (
        <i key={i} className="rain-drop" style={style} />
      ))}
    </div>
  );
};
