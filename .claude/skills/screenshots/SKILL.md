---
name: screenshots
description: Capture screenshots of the f1-pitwall web app for visual review, before and after states, and PR images. Use whenever you need to see, check, or show the UI, including dark and light mode, phone, iPad, and desktop sizes. Also covers motion, touch gestures, and iOS-only bugs.
---

# Screenshots

Use `pnpm shot` for every screenshot of the web app.
Do not use the T3 preview tools for screenshots. `preview_snapshot` times out after 15 seconds on every call, because the preview tab stays `visible: false`.
Do not install Playwright in the scratchpad. The repo pins `playwright-core` to the version of the cached browsers.

## Capture

```sh
pnpm shot /calendar/2026/19 --favourite piastri:PIA --team williams --before origin/main
```

- The command starts its own dev server on unused ports and stops it at the end. You do not need `pnpm dev`.
- `--before <ref>` also captures the ref from a temporary checkout under `/tmp`. The command captures the two states one after the other, and removes the checkout at the end.
- The command prints one PNG path for each capture. The default directory is `~/.t3/userdata/attachments/<branch>`, so you can embed the files directly.
- The file name is `<path>-[before|after]-<theme>.png`.
- The command waits for open `/api/` requests, the loading indicators, the fonts, and the visible images. Do not add fixed sleeps.
- CSS animations and transitions show their end state. The command cancels infinite animations when they start, because each repaint is slow in headless WebKit. Add `--animate` to keep them running and capture their current frame.
- A failed step stops after 10 seconds. The capture itself stops after 30 seconds. The error names the step and the path of a `-error.png` capture of the page state.
- A selector that matches nothing gives the closest visible labels. A selector that matches only hidden elements gives the number of matches. Correct the selector from this output.
- Run the command again after each edit. Each run takes about 5 to 30 seconds.

Options:

| Option                             | Effect                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `--theme dark\|light\|both`        | Color scheme. The default is `both`.                                        |
| `--size phone\|ipad\|desktop\|WxH` | Viewport. `phone` is 430×932, `ipad` is 1024×1366, `desktop` is 1440×900.   |
| `--browser webkit\|chromium`       | The default is WebKit, because the user uses an iPhone and an iPad.         |
| `--favourite id:CODE`, `--team id` | Mocked favourite driver and team.                                           |
| `--layout <json>`                  | Mocked live board columns for all sizes. See the gestures section.          |
| `--replay <file>`, `--from <min>`  | Replay a recording from a minute. See the live-replay skill.                |
| `--play <seconds>`                 | Capture this many seconds after the replay start.                           |
| `--click <selector>`               | Click a visible element, then wait for the page. Repeat it for more steps.  |
| `--hover <selector>`               | Keep the mouse on a visible element, such as `[data-hover]`.                |
| `--wait <selector>`                | Wait for a visible element.                                                 |
| `--eval <js>`                      | Run JavaScript in the page before the capture.                              |
| `--drag <point>`, `--to <point>`   | Press, hold, drag and release before the capture. See the gestures section. |
| `--hold <ms>`                      | Hold time before the drag moves. The default is 600.                        |
| `--video`                          | Record a video and save contact sheets of its frames.                       |
| `--element <selector>`             | Capture one element. The tab bar is hidden.                                 |
| `--full`                           | Capture the full page.                                                      |
| `--confetti`                       | Show the confetti. It is off by default, because it makes WebKit slow.      |
| `--animate`                        | Keep animations running, such as the live-dot pulse.                        |
| `--name`, `--out`                  | File name prefix and output directory.                                      |

A full `http://` URL uses a server that already runs. Then `--before` and `--replay` are not available.

## App state

- The command sets `localStorage.spoilers` to `"0"`. The spoiler gate does not show. The value `"off"` does not turn the gate off.
- The command mocks `/api/settings`. A capture does not change the real settings. Without `--favourite` and `--team`, the app has no favourite.
- Other `localStorage` keys: `theme` (`system`, `light`, `dark`), `seen`, and `confetti`. Use `--eval` to change them, then reload with `--eval "location.reload()"` and `--wait`.

## Routes

| Page           | Path                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| Live session   | `/`                                                                     |
| Race list      | `/calendar` or `/calendar/<year>`                                       |
| Race weekend   | `/calendar/<year>/<round>`                                              |
| Standings      | `/stats/standings` or `/stats/standings/<year>`                         |
| Other stats    | `/stats/title-fight`, `/stats/h2h`, `/stats/season`, `/stats/race-pace` |
| Driver profile | `/stats/drivers/<id>`, such as `/stats/drivers/piastri`                 |
| Settings       | `/settings`                                                             |

## Selectors

- Use Playwright selectors: CSS, `text=Constructors`, or `role=button[name="Constructors"]`.
- The tabs are buttons, not `role=tab`.
- Some labels are lowercase in the DOM and capitalised by CSS. `text=` ignores case. `getByText(..., { exact: true })` does not.
- The swipe container keeps hidden copies of the other tabs. The command uses only visible matches. Your own `--eval` code must check visibility, for example with `checkVisibility()`.

## Look at the images

- The Read tool scales an image taller than 2000 pixels down. Use `--element` or a smaller `--size` to see details.
- Use `--hover` for hover states and hover cards. Hover cards need a desktop or iPad size, because they react only to a mouse. Without `--hover`, the command moves the pointer to the top-right corner.
- Compare the before and after images before you report a match.

## Publish to the PR

```sh
pnpm shot:publish <pr-number> ~/.t3/userdata/attachments/<branch>/*.png
```

- The command adds the files to the `screenshots/pr-<pr-number>` branch with git plumbing. It does not touch the worktree.
- It prints Markdown. Files with `-before-` and `-after-` in the name form a before and after table.
- Add the Markdown to the PR body with `gh pr edit <pr-number> --body-file <file>`.
- The URLs use the commit SHA, so a new upload never shows a cached old image.

## Visual review

- Capture the changed UI with `--before origin/main`. Show the before and after images to the user.
- Embed images only from `~/.t3/userdata/attachments`. T3 does not show images from `/tmp`.
- To match a reference image, crop it at 6 to 8 times zoom. Put your result next to it at the same zoom before you claim a match.

## Gestures and screen recordings

Replay the gesture that the user reported before you report a gesture fix as done.

```sh
pnpm shot / --size ipad --replay recordings/2026-united-states-race.jsonl.gz --from 109 \
  --layout '[{"w":7,"tiles":[{"id":"tower","h":null},{"id":"weather","h":null}]},{"w":5,"tiles":[{"id":"battle","h":null}]}]' \
  --click 'text=Customize' --drag 'text=Weather' --to=+500,-200 --video
```

- A point is a selector, `x,y` in CSS pixels, or `+dx,+dy` from the start point. Write `--to=-500,+150` with `=` when the value starts with `-`.
- The command scrolls a selector into view before the press.
- On `phone` and `ipad`, the drag uses touch in Chromium. On `desktop`, it uses the mouse.
- A long press on a widget opens customize mode. In customize mode, the hold is 150 ms. A touch that moves more than 8 px before the hold ends cancels the drag.
- The command saves `-held.png` before the release and the normal image after it.
- `--video` also saves a `.webm` file and contact sheets of the drag at 10 frames each second. The drag runs slower than real time while the video records.
- `--layout` sets the board for the reported bug. The widget ids are in `src/web/live/widgets.ts`.

For a screen recording from the user, read the frames before you write code:

```sh
pnpm frames <video> --from 2 --to 6 --fps 4
pnpm frames <video> --at 3.5
```

- Each sheet shows 8 frames with their times. Read it left to right, then top to bottom.
- `--at` saves one frame at full size for details.

## Motion, touch, and iOS

- A screenshot does not show a transition. To check motion, use `--video` or the iOS Simulator. Then check the frames one by one before you report the motion as correct. Check the frames around each release and state change.
- For your own WebKit scripts, delete `window.PushManager` in an init script. WebKit kills its content process silently on `pushManager.getSubscription()`.
- Paused animation frames (`getAnimations()` with a set `currentTime`) miss CSS transitions that start in the same frame. Check the real recording at full size, cropped to the moving edge. Also check the case where the layout moves.
- Headless WebKit does not move an `opacity: 0` range input on a mouse drag. Use Chromium for a drag on a range input, or set its value and dispatch `input`.
- The first `/api/pace` request for a round can take more than 60 seconds, because the local servers share the Jolpica rate limit. Request each round once with `curl` before a motion test. The `DATA_DIR` store then keeps it for all worktrees.
- Desktop WebKit has no `Touch` constructor. Use Chromium with the CDP command `Input.dispatchTouchEvent` for touch gestures.
- Headless WebKit does not show iOS swipe, overscroll, and home-screen app artifacts. Use the iOS Simulator through the T3 device tools for these bugs.
- When you finish with the simulator, call `device_close` with `shutdown: true`. `device_close` cannot shut down a simulator that is not open in your thread.
- `pnpm shot` and `pnpm perf` wait for each other across all worktrees, so only one browser run uses the CPU at a time.
- To open the home-screen app in the simulator, run `open com.apple.springboard`, then `press 'label="F1 Pitwall"'`. A tap on the icon by coordinates can open Safari instead.
- In the simulator, `swipe` is a fling. Use `gesture pan <x> <y> <dx> <dy> <ms>` for a slow drag. Keep the first 150 ms under 8 px of movement, for example `gesture pan 200 300 0 350 8000`.
