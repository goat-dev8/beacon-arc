# PUSH-GUIDE — publishing the rescue branch

The VM that built this work cannot push (its egress proxy kills all requests
carrying an Authorization header). Everything is committed locally on branch
`rescue/p0` (commit `a67ed45`, author goat-dev8) and packaged as a git bundle.
Publish it from your own machine in under 5 minutes.

## 1. Get the bundle

Take the file `beacon-rescue.bundle` from the agent delivery and put it somewhere,
e.g. `~/Downloads/beacon-rescue.bundle`.

## 2. Clone from the bundle and push the branch

```bash
git clone ~/Downloads/beacon-rescue.bundle beacon-push
cd beacon-push
git log --oneline -1          # expect: a67ed45 (author goat-dev8)
git remote add origin https://github.com/goat-dev8/beacon-arc.git
git push origin rescue/p0
```

Authenticate with your usual GitHub credentials when prompted (the same ones
that work for your other pushes — HTTPS is fine).

## 3. Get it onto main (this is what deploys)

Option A — pull request (recommended, keeps history reviewable):
open https://github.com/goat-dev8/beacon-arc/pull/new/rescue/p0 and merge it.

Option B — fast-forward from your machine:
```bash
git fetch origin
git checkout main
git merge --ff-only origin/rescue/p0
git push origin main
```

## 4. What deploys automatically

- **Vercel** (web): auto-deploys `main` → https://beacon-arc-one.vercel.app
- **Render** (API): auto-deploys `main` → https://beacon-arc-api.onrender.com

No manual deploy clicks needed if auto-deploy is on (it was for the previous
releases). If a deploy doesn't trigger, check the Vercel/Render dashboards.

## 5. After the deploy is live

Work through `POST-PUSH-CHECKLIST.md` — it has the exact URLs and what each
page/endpoint must show.

## Notes

- Do NOT force-push. `rescue/p0` is a clean linear branch off `0f589ec`.
- The bundle contains only the rescue commits — no secrets. (`.env` is
  gitignored; the staged tree was scanned before commit.)
- If you want the e2e results first: they were still running at commit time.
  Pushing without them is safe — they touch only `e2e/` and change no product
  behavior.
