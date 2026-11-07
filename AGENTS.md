# Parallel work

Treat a task as done only when its changes are in a pull request and merged into `main`.
If a required step is blocked, report the current status and the blocker. Do not report the task as done.

Use one branch and one worktree for each task. Use the branch that T3 creates. Do not create a second branch.
If T3 skipped setup, run `git fetch origin main`, `git merge --ff-only origin/main`, and `CI=true pnpm install --frozen-lockfile` before edits.
Create a new branch from `origin/main` only in a detached checkout.
Keep edits in the task worktree. Do not change another task's branch or worktree.
Before you edit, run `gh pr list --state open --json number,files`. If an open PR changes a file that you must change, keep the overlap small and tell the user.
Coordinate changes to shared state with concurrent agents. Worktrees do not isolate this state:

- the main checkout at `~/Developer/f1-pitwall` and its `.git` directory, including the stash
- the dev server ports `8787` and `5173`
- the Jolpica rate limit, which all local servers share
- the Azure transcript accounts, and GitHub settings and variables

Run `PORT=0 VITE_PORT=0 pnpm dev` in each worktree. Point preview and Playwright checks at the Vite URL that it prints.

## Bug reports

Run `pnpm frames` on each screen recording that the user sends. Read the frames before you write code.
Before you write code, list each behavior that the user expects as a checklist, such as "Weather moves under the tower, and the left column stays sticky".
Check each item before you report the task as done. Report the result for each item.
Replay a reported gesture with `pnpm shot --drag`, or in the iOS Simulator for an iOS-only bug. Code reading and static screenshots do not prove a gesture or motion fix.

## Pull requests

Ship with `pnpm ship "<commit message>" --body "<what changed and why>"`. Use the commit-style format.
The command formats, commits, merges `origin/main`, runs the typecheck, test and build, pushes, opens the PR and turns on auto-merge.
Run it again for each later commit. Follow its output for conflicts and for a PR that is already merged.
Then call `link_pull_request` and `watch_pull_request`, and end the turn. T3 wakes the thread when the checks finish or a comment arrives.
If a check fails, fix it and run `pnpm ship` again.
Review the final diff. Resolve review feedback within the task scope. Resolve each review thread, because an open thread blocks auto-merge.
Run each `gh` command as a separate shell call, so the allow rules apply.
The user approves agents to merge minor visual changes and non-visual changes without more review.
Do not merge a stack of pull requests. Do not force-push, bypass branch protection, or use `gh pr merge --admin`.

## After the merge

When T3 reports that the checks passed, run `pnpm worktree:cleanup . <pr-number> --branch-only --apply`, then call `unwatch_pull_request`.
The cleanup waits for auto-merge, verifies the merged PR, detaches the checkout, and deletes the local branches.
Do not wait for deployment.
Do not file a papercut after the merge, because the merged branch cannot bring it to `main`. Report that friction in the final response.
Report cleanup only when it failed or is blocked.
Never force worktree removal. Preserve uncommitted files, ignored files that are not build output, and commits that are absent from `origin/main`.
Create each temporary checkout with `git worktree add --detach` under `/tmp`. Remove it with `git worktree remove` after you check it for local files.
Stop every dev server and preview process that you started before the final response.
Shut down each simulator that you opened with `device_close` and `shutdown: true` before the final response. A booted simulator uses about 700 MB of memory.
The cleanup output lists the booted simulators. Shut down the ones that you opened.

## Findings

Implement a fix that an investigation shows is worth doing. Do not end with a list of options and a question.
Ask only about decisions that change the design or need visual approval.

## Live timing

Test live timing changes with a recorded session. Follow `.claude/skills/live-replay/SKILL.md`.
Measure live screen performance with `pnpm perf`. The user watches live timing on an iPhone, as an installed PWA.

## UI code

Search `src/web` for an existing component before you write a new control. Use `Tabs` from `src/web/Tabs.tsx` with `small` for toggles.
Do not use a see-through red tint or glow in light mode. The user sees it as pink.
Use a solid red surface (`#e10600` to `#7f1d1d`) with white content in light mode. Redefine the zinc tokens on the red element, as `.featured` in `src/web/index.css` does.

## Visual review

Get explicit visual approval for a noticeable change to layout, navigation, typography, color, component styling, or responsive behavior.
An isolated correction that keeps the existing design is minor and needs no approval. Ask when the classification is unclear.
Capture screenshots with `pnpm shot`, and follow `.claude/skills/screenshots/SKILL.md`. Do not use the T3 preview tools for screenshots.
Show the before and after screenshots and ask for approval after the change is complete.
Ship with `--hold` until the user approves. Then run `gh pr merge <pr-number> --auto --merge`.
Treat a missing approval as a blocker. Ask again if a later change alters the approved appearance.
