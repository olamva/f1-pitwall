interface BackdropProps {
  name: string;
  line: string;
}

const GROUPS = Array.from({ length: 14 }, (_, i) => i);

export const Backdrop = ({ name, line }: BackdropProps) => (
  <div aria-hidden className="champion-backdrop">
    <div className="champion-names">
      <div className="champion-rows">
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="champion-name-row">{`${name} `.repeat(8)}</div>
            <div className="champion-ticker">{`${line} · `.repeat(6)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
