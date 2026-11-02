import { createPortal } from "react-dom";

interface BackdropProps {
  name: string;
  line: string;
}

const GROUPS = Array.from({ length: 10 }, (_, i) => i);
const LINES = [0, 1, 2];

export const Backdrop = ({ name, line }: BackdropProps) =>
  createPortal(
    <div aria-hidden className="champion-backdrop">
      <div className="champion-rows">
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="champion-name-row">{`${name} `.repeat(8)}</div>
            {LINES.map((l) => (
              <div key={l} className="champion-ticker">
                {`${line} · `.repeat(6)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
