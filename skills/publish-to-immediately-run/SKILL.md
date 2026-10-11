---
name: publish-to-immediately-run
description: Publish a local project — a Grove report, a Lodestar board, any immediately.run app — as a GitHub repo that opens at an immediately.run link, with the GitHub Pages cache that keeps it fast for readers who are not signed in. Handles public versus private, the repo's description and homepage link, the cache workflow, and the final check that the link renders. Use when asked to "publish this on immediately.run", "put this on GitHub so people can open it", "share this report / app", or after another immediately.run skill finishes building something.
---

# Publish to immediately.run

**`$SKILL` below means the directory this SKILL.md is in.**

immediately.run runs a GitHub repo in the reader's browser. Publishing is therefore
just creating the repo — plus, for a public repo, a small workflow that keeps a
pre-built copy on the repo's own GitHub Pages so the link loads fast and stays within
GitHub's limit of 60 API requests an hour for readers who are not signed in.

**Needs:** `git`; the GitHub CLI `gh`, signed in (`gh auth status`) with rights to
create repos in the target owner; network access. Some agents sandbox the network by
default (Codex does): `gh`, `git push` and `npx` need it, so ask the user to allow it
rather than working around it. If `gh` is missing or signed out, stop and tell the user.

## 1. Settle the inputs

- **The project directory**, and what it is: a content repo (an `immediately.run.json`
  marker with `opensWith`, no app code — a Grove report, a Lodestar board) or an app (a
  `package.json` and `src/App.tsx`).
- **Owner and name.** Default to the user's own account (`gh api user --jq .login`) and
  the directory's name. `gh repo view <owner>/<name>` must fail, or the name is taken.
- **Visibility. Always ask** unless the user already said. Public: anyone with the
  link can read it, and it can be forked. Private: every reader must sign in to
  immediately.run and be able to see the repo on GitHub.

## 2. Pre-flight

Run the project's own checks first. A Grove report: `check-report.mjs` from the
`grove-report` skill. An app: `npm run build && npm run lint`. Then look at what is
about to become public:

```bash
git status --short          # everything you mean to publish is committed
git ls-files | head -100    # nothing that should not be there
```

Stop and ask if you see credentials, `.env` files, personal data the user did not
mean to share, or large binaries (more than a few MB; GitHub rejects files over 100 MB).

Squash the drafts into one commit with a message that says what this is.

## 3. Create the repo

**Public:**

```bash
mkdir -p .github/workflows && cp $SKILL/templates/cache.yml .github/workflows/cache.yml
git add .github/workflows/cache.yml && git commit -m "Publish a cache for immediately.run"
gh repo create <owner>/<name> --public --source . --push \
  --description "<one-line summary>" \
  --homepage "https://immediately.run/present/github/<owner>/<name>/main"
gh api -X POST repos/<owner>/<name>/pages -f build_type=workflow
gh workflow run cache.yml --repo <owner>/<name>
```

The Pages call turns GitHub Pages on for the workflow; it fails harmlessly if Pages is
already on, and on a free plan it works for public repos only. The push itself also
triggers the workflow, which may fail once if Pages was not on yet — the explicit run
after enabling Pages is the one that counts.

**Private:** no `cache.yml` — a Pages site is public, so it would publish the content.

```bash
gh repo create <owner>/<name> --private --source . --push \
  --description "<one-line summary>" \
  --homepage "https://immediately.run/present/github/<owner>/<name>/main"
```

immediately.run loads a private repo through the GitHub API for a signed-in reader, and
only when the **immediately.run GitHub App** can reach the repo. Tell the user to grant it
(GitHub → Settings → Applications → immediately.run → Configure → Repository access),
or readers see "GitHub couldn't find that repository".

The description and homepage matter because a content repo should not carry a
`README.md`: Grove would list it as a page. The homepage link is what a visitor to the
GitHub repo clicks to read it.

## 4. Check the published link

The link is `https://immediately.run/present/github/<owner>/<name>/main`. It works
straight away; the cache follows a minute or two later.

```bash
gh run list --repo <owner>/<name> --workflow cache.yml --limit 3   # public only
curl -sI https://<owner>.github.io/<name>/cached_repositories/main.zip | head -1   # 200 once published
```

If the run failed, read its log (`gh run view <id> --repo <owner>/<name> --log-failed`).
The usual cause is Pages not being on: run the `gh api … /pages` call above, then
`gh workflow run cache.yml` again. If the build log says files were **skipped**, those
files failed to compile; fix them before telling anyone the link works.

Then open the link the way a reader would. For a Grove report, use the `grove-report`
skill's `check-render.cjs` on the published URL. Otherwise open it in a browser if your
tools can drive one, or give the link to the user to open. A private repo can only be
checked by someone signed in, so that check is the user's; say so.

## 5. Report back

- the reading link, and the repo link;
- public or private, and for public whether the cache published (`main.zip` answered 200);
- for private, the App-access step left to the user;
- that anyone can fork the repo to make their own version (public), and that edits
  pushed to `main` appear at the same link.
