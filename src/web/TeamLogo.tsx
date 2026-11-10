const SLUGS: Record<string, string> = {
  aston_martin: "astonmartin",
  haas: "haasf1team",
  rb: "racingbulls",
  red_bull: "redbullracing",
};

const TEAMS = new Set([
  "alpine",
  "astonmartin",
  "audi",
  "cadillac",
  "ferrari",
  "haasf1team",
  "mclaren",
  "mercedes",
  "racingbulls",
  "redbullracing",
  "williams",
]);

const WHITE = ["astonmartin", "audi", "cadillac", "mercedes"];

export const teamKey = (team: string) =>
  SLUGS[team] ?? team.toLowerCase().replace(/[^a-z0-9]/g, "");

export const logoSrc = (team: string, width = 200) => {
  const key = teamKey(team);
  return TEAMS.has(key)
    ? `https://media.formula1.com/image/upload/c_scale,w_${width}/q_auto/common/f1/2026/${key}/2026${key}logo${WHITE.includes(key) ? "white" : ""}.webp`
    : undefined;
};

export const logoTone = (team: string) =>
  WHITE.includes(teamKey(team)) ? "light:invert" : "";

interface TeamLogoProps {
  team: string;
  className: string;
}

export const TeamLogo = ({ team, className }: TeamLogoProps) => {
  const src = logoSrc(team);
  return src ? (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`object-contain ${logoTone(team)} ${className}`}
    />
  ) : (
    <span aria-hidden className={className} />
  );
};
