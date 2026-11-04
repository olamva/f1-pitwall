# Parallel work

Treat a task as done only when its changes are in a pull request and merged into `main`.
Do not wait for deployment after the merge. Settle the thread and clean up immediately.
If a required step is blocked, report the current status and the blocker. Do not report the task as done.

Use one branch and one worktree for each task.
Start each task in a new T3 thread and its worktree.
Import the `Setup Worktree` action from `t3.json` in T3 project settings once.
Let T3 run the action for new worktrees. It updates the new branch to `origin/main` and installs dependencies.
The action also removes the worktrees and branches of merged tasks with `pnpm worktree:cleanup --merged --apply`.
If T3 skips setup, run `git fetch origin main`, `git merge --ff-only origin/main`, and `CI=true pnpm install --frozen-lockfile` before edits.
Use the branch that T3 creates for the worktree. Rename it with `git branch -m` when needed. Do not create a second branch.
Create a new branch from the current `origin/main` only in a detached checkout.
Keep edits in the task worktree. Do not change another task's branch or worktree.
Coordinate changes to shared state with concurrent agents. Worktrees do not isolate this state:

- the main checkout at `~/Developer/f1-pitwall` and its `.git` directory, including the stash
- the dev server ports `8787` and `5173`
- the Jolpica rate limit, which all local servers share
- the Azure transcript accounts, and GitHub settings and variables

Run `PORT=0 VITE_PORT=0 pnpm dev` in each worktree. The command then selects unused ports.
Point preview and Playwright checks at the Vite URL that the command prints.

## Pull requests

Create a pull request into `main` for each completed task. Do not merge a stack of pull requests.
Explain the change and report validation in the pull request description.
Run `pnpm format` before each commit. `pnpm test` fails on unformatted files.
Run relevant local checks before pushing. Use `pnpm test`, `pnpm typecheck`, and `pnpm build` when applicable.
Review the final diff. Resolve review feedback within the task scope.
Resolve each review thread. Unresolved threads block auto-merge.
Fetch `origin/main` before you push. Merge it into the task branch if the branch is behind.
Do not push when this merge fast-forwards the task branch. The PR is then already merged. Start cleanup instead.
Enable auto-merge on your own PR with `gh pr merge --auto --merge` immediately after you push.
The user explicitly approves agents to merge minor visual changes and non-visual changes.
Do not ask for additional user review before you merge these changes.
Let GitHub merge the PR when the required checks pass.
Run `gh pr checks --watch --fail-fast` to wait. Then run `gh pr view --json state,mergeStateStatus`.
If a check fails, fix the failure and push the correction. Auto-merge stays enabled for the new head commit.
If the state is `BEHIND`, merge `origin/main` into the task branch, resolve conflicts, and push.
Do not force-push, bypass branch protection, or merge with blocked checks. Do not use `gh pr merge --admin`.

## Findings

Implement a fix that an investigation shows is worth doing. Do not end with a list of options and a question.
Ask only about decisions that change the design or need visual approval.

## Live timing

Test live timing changes with a recorded session. Follow `.claude/skills/live-replay/SKILL.md`.
Measure live screen performance in Playwright WebKit at 3x density, and also in Chrome. The user watches live timing on an iPhone, as an installed PWA.
Count the CPU time of the WebKit WebContent and GPU processes with `ps`.
Delete `window.PushManager` in an init script for WebKit runs. WebKit kills its content process silently on `pushManager.getSubscription()`.
For an A/B test, start two replay servers at the same time with the same `LIVE_REPLAY_FROM` and different `DIST_DIR`.

## UI code

Search `src/web` for an existing component before you write a new control. Use `Tabs` from `src/web/Tabs.tsx` with `small` for toggles.
Do not use a see-through red tint or glow in light mode. The user sees it as pink.
Use a solid red surface (`#e10600` to `#7f1d1d`) with white content in light mode. Redefine the zinc tokens on the red element, as `.featured` in `src/web/index.css` does.

## Visual review

Require explicit visual approval for changes beyond a minor correction.
Require approval for noticeable layout, navigation, typography, color, component styling, or responsive changes.
Treat an isolated correction that preserves the existing design as minor.
Require approval when the classification is unclear.
Capture web UI screenshots with `pnpm shot`. Follow `.claude/skills/screenshots/SKILL.md`.
Do not use the T3 preview tools for screenshots. `preview_snapshot` times out on every call.
Embed images only from `~/.t3/userdata/attachments`. T3 does not show images from `/tmp`.
For required review, capture the changed UI with `pnpm shot --before origin/main`. Include the before and after states.
Publish the review images with `pnpm shot:publish`.
Show the screenshots to the user and ask for approval after the change is complete.
Do not enable auto-merge before the user approves the reviewed change.
Treat a missing required approval as a blocker.
Request renewed approval if later changes materially alter the reviewed appearance.
Crop a reference image at 6 to 8 times zoom. Put your result next to it at the same zoom before you claim a match.

## Deployment and cleanup

Keep deployment on `main` through the existing workflow.
Do not watch the deployment run. Start cleanup as soon as the PR state is `MERGED`.
Let GitHub delete the merged remote branch. Preserve thread history.
Push visual review images only to a `screenshots/pr-<pr-number>` branch. Cleanup does not delete other branch names.
Stop every dev server and preview process that you started before the final response.
Create each temporary checkout, such as a visual review "before" state, with `git worktree add --detach` under `/tmp`.
Remove a temporary checkout with `git worktree remove <path>` after checking for local files.
After merge, run `pnpm worktree:cleanup . <pr-number> --branch-only --apply` in the task worktree.
This verifies the merged PR, detaches the checkout, and deletes the local task branch.
It also deletes the local `screenshots/pr-<pr-number>` branch.
The `Screenshots cleanup` workflow deletes the remote `screenshots/pr-<pr-number>` branch when the PR closes.
A PR watch does not wake the thread on merge. The next `Setup Worktree` run cleans up a task that merges after the turn ends.
The `--merged` sweep removes each merged worktree unless a process uses it as its working directory.
The sweep also deletes merged `t3/*` branches without a worktree and local `screenshots/pr-*` branches of merged PRs.
Run `pnpm worktree:cleanup --merged --apply` from any checkout to remove all merged worktrees. T3 can keep running.
Report cleanup in the final response only when you ran it, or when it failed or is blocked.
Never force worktree removal. Preserve uncommitted files, ignored files that are not build output, and commits that are absent from `origin/main`.
