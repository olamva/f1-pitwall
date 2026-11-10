import { useEffect, useState, type ReactNode } from "react";
import {
  ClipboardPaste,
  Cookie,
  LogIn,
  Menu,
  Monitor,
  Moon,
  Save,
  Share,
  Smartphone,
  SquarePlus,
  SquareTerminal,
  Sun,
} from "lucide-react";
import type { DriverInfo, Season } from "../shared/season.ts";
import { tokenProblem, type TokenStatus } from "../shared/token.ts";
import { DelayInput } from "./DelayInput.tsx";
import {
  setFavourite,
  setFavouriteTeam,
  useFavourite,
  useFavouriteTeam,
} from "./favourite.ts";
import { GlassSwitch } from "./GlassSwitch.tsx";
import { GuideSheet } from "./GuideSheet.tsx";
import { disablePush, enablePush, pushState, type PushState } from "./push.ts";
import { setProjectedLap, useProjectedLap } from "./projectedLap.ts";
import { setScrubAhead, useScrubAhead } from "./scrubAhead.ts";
import { setSpoilerMode } from "./spoilers.ts";
import { InfoPopover } from "./InfoPopover.tsx";
import { Tabs } from "./Tabs.tsx";
import { setTokenHidden } from "./tokenHidden.ts";

const needsInstall = matchMedia("(pointer: coarse)").matches;

const PUSH_NOTES: Partial<Record<PushState, string>> = {
  unsupported: needsInstall
    ? "Add the app to the Home Screen to get notifications."
    : "This browser does not support notifications.",
  off: "Notifications are not set up on this server.",
};

const THEMES = ["system", "light", "dark"] as const;
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };

const LOGIN = "https://account.formula1.com/#/en/login";
const SIGN_IN = "/.auth/login/google?post_login_redirect_uri=/settings";

const INSTALL_STEPS = [
  [Menu, "In Safari, tap the menu button in the address bar."],
  [Share, "Tap Share."],
  [SquarePlus, "Tap Add to Home Screen. You may need to tap View More."],
  [Smartphone, "Tap Add, then open F1 Pitwall from the Home Screen."],
] as const;

const TOKEN_STEPS = [
  [
    LogIn,
    <a
      href={LOGIN}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-red-400 underline"
    >
      Log in to F1TV.
    </a>,
  ],
  [
    SquareTerminal,
    "Open DevTools (⌥⌘I). Go to Application → Cookies → https://www.formula1.com.",
  ],
  [
    Cookie,
    <>
      Copy the value of <code>login-session</code>.
    </>,
  ],
  [ClipboardPaste, "Paste the value in the token box and click Save."],
] as const;

const TOKEN_WARNINGS = {
  missing: "You have no F1TV token. The track map shows no cars.",
  expired: "Your F1TV token is expired. Log in again and save a new token.",
};

const tokenWarning = (s: TokenStatus) => {
  const problem = tokenProblem(s);
  if (problem) return TOKEN_WARNINGS[problem];
  if (s.sessionExpiresAt && s.sessionExpiresAt - Date.now() < 3 * 24 * 3600_000)
    return "The F1TV login expires soon. Log in again and save a new token.";
  return null;
};

async function post(value: string): Promise<TokenStatus> {
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error);
  return body;
}

const SELECT = "glass-control w-48 cursor-pointer truncate px-3 py-1.5 text-sm";

interface GroupProps {
  title: ReactNode;
  children: ReactNode;
}

const Group = ({ title, children }: GroupProps) => (
  <section className="space-y-2">
    <h2 className="font-f1 flex items-center gap-1 px-1 text-base font-bold">
      {title}
    </h2>
    <div className="bg-surface divide-y divide-zinc-800 rounded-xl">
      {children}
    </div>
  </section>
);

interface LabelProps {
  title: string;
  note?: string;
}

const Label = ({ title, note }: LabelProps) => (
  <span className="min-w-0">
    <span className="block font-medium">{title}</span>
    {note && <span className="block text-xs text-zinc-400">{note}</span>}
  </span>
);

interface RowProps extends LabelProps {
  children: ReactNode;
}

const Row = ({ title, note, children }: RowProps) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
    <Label title={title} note={note} />
    {children}
  </div>
);

interface ToggleProps extends LabelProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}

const Toggle = ({ title, note, children, ...props }: ToggleProps) => (
  <div className="space-y-2 px-4 py-3">
    <GlassSwitch {...props} className="flex-row-reverse justify-between">
      <Label title={title} note={note} />
    </GlassSwitch>
    {children}
  </div>
);

interface SettingsProps {
  drivers: DriverInfo[];
  teams: Season["teams"];
}

export const Settings = ({ drivers, teams }: SettingsProps) => {
  const favourite = useFavourite();
  const team = useFavouriteTeam();
  const scrubAhead = useScrubAhead();
  const projectedLap = useProjectedLap();
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [value, setValue] = useState("");
  const [autoplay, setAutoplay] = useState(
    () => localStorage.getItem("autoplay") === "1",
  );
  const [spoilers, setSpoilers] = useState(
    () => localStorage.getItem("spoilers") !== "0",
  );
  const [autoupdate, setAutoupdate] = useState(
    () => localStorage.getItem("autoupdate") !== "0",
  );
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme as (typeof THEMES)[number],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [push, setPush] = useState<PushState | null>(null);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const togglePush = (on: boolean) => {
    setPush(null);
    setPushNote(null);
    (on ? enablePush() : disablePush())
      .catch((e: Error) => setPushNote(e.message))
      .then(pushState)
      .then(setPush, () => setPush("disabled"));
  };
  const save = (v: string) =>
    post(v).then(
      (s) => {
        setStatus(s);
        setTokenHidden(false);
        setValue("");
        setMessage("Saved. Reload the app to see the cars.");
      },
      (e: Error) => setMessage(e.message),
    );
  useEffect(() => {
    fetch("/api/token").then(
      async (res) =>
        res.ok ? setStatus(await res.json()) : setSignedOut(res.status === 401),
      () => undefined,
    );
    pushState().then(setPush, (e: Error) => setPushNote(e.message));
  }, []);
  const note = pushNote ?? (push && PUSH_NOTES[push]);
  const warning = status && tokenWarning(status);
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Group title="Display">
          <Row title="Theme">
            <Tabs
              items={THEMES}
              value={theme}
              onChange={(t) => {
                setTheme(t);
                localStorage.setItem("theme", t);
                document.documentElement.dataset.theme = t;
              }}
              icons={THEME_ICONS}
              iconOnly
              small
            />
          </Row>
          <Toggle
            title="Spoiler mode"
            note="Ask before showing new qualifying, sprint and race results"
            checked={spoilers}
            onChange={(checked) => {
              setSpoilers(checked);
              setSpoilerMode(checked);
            }}
          />
        </Group>
        <Group title="Favourites">
          <Row title="Driver">
            <select
              aria-label="Favourite driver"
              value={favourite?.id ?? ""}
              onChange={(e) =>
                setFavourite(
                  drivers.find((d) => d.id === e.target.value) ?? null,
                )
              }
              className={SELECT}
            >
              <option value="">None</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Row>
          <Row title="Team">
            <select
              aria-label="Favourite team"
              value={team ?? ""}
              onChange={(e) => setFavouriteTeam(e.target.value || null)}
              className={SELECT}
            >
              <option value="">None</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Row>
        </Group>
        <Group title="Live timing">
          <div className="space-y-2 px-4 py-3 text-sm">
            <Label title="TV delay" />
            <DelayInput />
          </div>
          <Toggle
            title="Team radio"
            note="Play new radio messages automatically"
            checked={autoplay}
            onChange={(checked) => {
              setAutoplay(checked);
              localStorage.setItem("autoplay", checked ? "1" : "0");
            }}
          />
          <Toggle
            title="Projected lap"
            note="Predict the lap time of each car on a qualifying push lap"
            checked={projectedLap}
            onChange={setProjectedLap}
          />
          <Toggle
            title="Order ahead in replays"
            note="Show the order ahead of the replay point in the scrub preview"
            checked={scrubAhead}
            onChange={setScrubAhead}
          />
        </Group>
      </div>
      <div className="space-y-4">
        <Group title="App">
          {status && (
            <Toggle
              title="Session reminders"
              note="Notify me 15 minutes and 5 minutes before each session"
              checked={push === "enabled"}
              disabled={push !== "enabled" && push !== "disabled"}
              onChange={togglePush}
            >
              {note && <p className="text-xs text-zinc-400">{note}</p>}
              {push === "unsupported" && needsInstall && (
                <GuideSheet title="Add to Home Screen" steps={INSTALL_STEPS} />
              )}
            </Toggle>
          )}
          <Toggle
            title="Automatic updates"
            note="Install new versions automatically"
            checked={autoupdate}
            onChange={(checked) => {
              setAutoupdate(checked);
              localStorage.setItem("autoupdate", checked ? "1" : "0");
            }}
          />
        </Group>
        {signedOut ? (
          <Group title="Account">
            <div className="space-y-3 px-4 py-3">
              <p className="text-sm text-zinc-400">
                Sync your settings, transcribe radio, get session reminders and
                add an F1TV token.
              </p>
              <a
                href={SIGN_IN}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white"
              >
                <LogIn aria-hidden="true" className="size-4" />
                Sign in with Google
              </a>
            </div>
          </Group>
        ) : status ? (
          <Group
            title={
              <>
                F1TV token
                <InfoPopover label="What the F1TV token unlocks">
                  The token unlocks live car positions and car telemetry. The
                  track map shows the cars, and Lap compare shows live speed
                  traces.
                </InfoPopover>
              </>
            }
          >
            <div className="space-y-2 px-4 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save(value);
                }}
                className="flex gap-2"
              >
                <input
                  aria-label="F1TV token"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={
                    !status || tokenProblem(status)
                      ? "Paste the login-session cookie value"
                      : status.sessionExpiresAt
                        ? `Saved until ${new Date(status.sessionExpiresAt).toLocaleDateString("nb-NO")}`
                        : "Saved"
                  }
                  className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm placeholder:text-zinc-500"
                />
                <button
                  disabled={!value}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Save aria-hidden="true" className="size-4" />
                  Save
                </button>
              </form>
              {warning && <p className="text-sm text-yellow-300">{warning}</p>}
              {message && <p className="text-sm text-zinc-400">{message}</p>}
              <GuideSheet title="Set the F1TV token" steps={TOKEN_STEPS} />
            </div>
          </Group>
        ) : null}
      </div>
    </div>
  );
};
