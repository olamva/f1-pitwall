---
name: live-replay
description: Replay a recorded F1 live timing session through the local server, so that the app runs as during a live session. Use when you change or test live timing, the Live tab, the live stream, isLive, car positions, or other behavior that shows only during a live session. Also use to record a new session.
---

# Live replay

The `recordings/` directory keeps live sessions that `pnpm record` captured.
A recording keeps each message that the live feed got from F1, with its arrival time.
Run `ls recordings` to see the sessions. The file name gives the season, the event, and the session.

## Replay a session

Run the dev server with `LIVE_REPLAY`. The command selects unused ports:

```sh
LIVE_REPLAY=recordings/2026-bahrain-fp3.jsonl.gz LIVE_REPLAY_FROM=25 PORT=0 VITE_PORT=0 pnpm dev
```

- The server does not connect to F1. It sends the recorded messages to `/api/live` and `/api/live/stream` at the recorded pace.
- The server moves all timestamps to the current time. The session is live now. The session clock, the flags, and the car positions work as during the session.
- `LIVE_REPLAY_FROM` sets the start point in minutes after the start of the recording. The server applies the earlier messages immediately. The default is 0.
- The replay plays at real speed and does not loop. After the last message, the app shows the end of the session.
- `pnpm dev` restarts the server after each server edit. The replay then starts again at `LIVE_REPLAY_FROM`.
- Click "Continue to live timing" to pass the spoiler gate. Alternatively, set `localStorage.spoilers` to `"0"` before the page loads.
- A file without `Position.z` lines has no car positions. The app then shows the F1TV token note on the map.

## Find a moment

Each line is `[t, topic, data]`. `t` is the arrival time in epoch milliseconds.
Run this command to list the minute of each status change, flag, and race control message:

```sh
gunzip -c recordings/2026-bahrain-fp3.jsonl.gz | node -e 'let s="";process.stdin.on("data",(c)=>(s+=c)).on("end",()=>{const l=s.trim().split("\n").map(JSON.parse);for(const[t,k,d]of l)if(/^(SessionStatus|TrackStatus|RaceControlMessages)$/.test(k))console.log(((t-l[0][0])/6e4).toFixed(1),k,JSON.stringify(d).slice(0,100))})'
```

Use the minute as `LIVE_REPLAY_FROM`. Start one or two minutes early, so that the page connects before the moment.

## Capture a moment

```sh
pnpm shot / --replay recordings/2026-united-states-race.jsonl.gz --from 109 --play 15 --before origin/main
```

- `--from` sets the replay start minute. `--play` sets the capture time in seconds after that start. Do not wait with `setTimeout` in `--eval`.
- Use `--play` when the page must see an event happen, such as an overtake. Otherwise set `--from` to the moment and omit `--play`.
- Each capture gets a new server. All images then show the same moment within one second, also the `--before` images.
- A page that loads after the `--play` time gives a warning. Increase `--play`.

## Measure performance

```sh
pnpm perf / --before origin/main --replay recordings/2026-united-states-race.jsonl.gz --from 40 --wait "text=Lap compare"
```

- The command builds both states, starts a production server for each state at the same time, and opens a phone page at 3x density.
- It measures 60 seconds in WebKit and then in Chromium. It prints the CPU time of the content, GPU, and other browser processes.
- Compare the `total s` column. Two runs of the same code differ by about 2% at 60 seconds. The split between content and GPU time varies more.
- The command takes about 3 minutes. Run it in the background. Use `--browser webkit` or `--seconds` for a shorter run.
- Use `--eval` to scroll to a part of the page before the measurement.

## Race and qualifying topics

A practice recording has no race or qualifying data, such as `DriverRaceInfo`.
Use the archive replay when `recordings/` has no session of the necessary type:

- Open the Calendar tab and select the session. The URL is `/calendar/<encoded session path>`.
- Seek in the replay bar. The page writes the position to `?t=`. Open that URL again to return to the moment.
- The archive replay does not make the session live. Use a recording to test `isLive` and other live behavior.

Record a race or a qualifying session to test its live behavior.

## Record a session

Use the `/record-session` command to schedule a recording that does not depend on a T3 worktree.

```sh
pnpm record recordings/<year>-<event>-<session>.jsonl <end time in ISO format>
```

- Find the session times in `infra/sessions.json`.
- Start the command at least 15 minutes before the session. Set the end time at least 20 minutes after the scheduled end.
- The command writes `<file>.gz` at the end time and deletes the raw file. Commit the `.gz` file.
- The command reads the F1TV tokens from `$DATA_DIR/tokens.json` to record car positions. `scripts/record-job.sh` copies that file from the VM. Without a token, the recording has no car positions.
- The command records only the topics in `TOPICS` in `src/server/timing.ts`. A new topic needs a new recording.
