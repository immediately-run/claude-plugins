# immediately.run skills

Agent skills for publishing on [immediately.run](https://immediately.run), which runs a
GitHub repo in the reader's browser: no server, no build, a link anyone can open,
and a repo anyone can fork.

| Skill | What it does |
| --- | --- |
| [`grove-report`](skills/grove-report/SKILL.md) | Writes a polished, artifact-style report as a [Grove](https://github.com/immediately-run/grove) wiki: one small MDX file per section composed into one page, figures as JSON data, themed stat tiles, charts and cards. The source can be your research, notes, data, an HTML page, a Claude artifact or a ChatGPT, Codex or Gemini canvas. |
| [`publish-to-immediately-run`](skills/publish-to-immediately-run/SKILL.md) | Publishes a project as a GitHub repo with an immediately.run link, public or private, with the Pages cache that keeps it fast for anonymous readers. |

Ask your agent something like *"write up our Q3 support numbers as a report and
publish it"* or *"turn this canvas into a Grove report"*.

**Needs:** `git`, the GitHub CLI `gh` (signed in), Node 18+, and Python 3 for pulling
images out of an HTML page. Previewing the render uses `npx @immediately-run/cli` and a
local Chrome or Chromium.

The skills are written to the open [Agent Skills](https://agentskills.io) format, so
they work in any agent that reads `SKILL.md`. `skills/grove-report/example/` is a
complete sample report the skill copies from.

## Install

### Any agent, with the `skills` CLI

```bash
npx skills add immediately-run/skills
```

It asks which agents to install into (Claude Code, Codex, Antigravity, Pi, opencode
and many more); `-a <agent>` picks one without asking, and `-g` installs for your user
instead of the current project.

### Claude Code

```
/plugin marketplace add immediately-run/skills
/plugin install immediately-run@immediately-run-plugins
```

Update with `/plugin marketplace update immediately-run-plugins`.

### Codex

Inside a Codex session:

```
$skill-installer install https://github.com/immediately-run/skills/tree/main/skills/grove-report
$skill-installer install https://github.com/immediately-run/skills/tree/main/skills/publish-to-immediately-run
```

or copy the two folders under `skills/` into `~/.agents/skills/` (for you) or a
project's `.agents/skills/`. Restart Codex afterwards. Codex sandboxes network access by
default; publishing needs it for `gh`, `git push` and `npx`.

### Antigravity

`npx skills add immediately-run/skills -a antigravity`, or copy the two folders under
`skills/` into `~/.gemini/antigravity/skills/` (for you) or a workspace's
`.agents/skills/`.

### Pi

```bash
pi install git:github.com/immediately-run/skills
```

Pi finds the skills in the repo's `skills/` folder. Add `-l` to install for the
current project only.

### opencode

Add the skills URL to `opencode.json` (project) or `~/.config/opencode/opencode.json`
(global):

```json
{
  "skills": {
    "urls": ["https://raw.githubusercontent.com/immediately-run/skills/main/skills/"]
  }
}
```

opencode reads `skills/index.json` there and re-downloads a skill when its `version`
changes. For a local checkout instead: `{ "skills": { "paths": ["<checkout>/skills"] } }`.

## Working on the skills

Each skill is a self-contained folder under `skills/`, because most installers copy
one folder at a time; a skill may not reach into another's files. Where two skills need
the same file, each carries a copy, and the check below keeps the copies identical.

After changing anything under `skills/`:

```bash
node scripts/gen-index.mjs           # regenerate skills/index.json (opencode)
node scripts/gen-index.mjs --check   # what CI runs: index, marketplace and copies agree
```

Bump `version` in `.claude-plugin/marketplace.json` with every release so Claude Code
users pick it up; opencode versions are content hashes and update on their own.

Try an edit before publishing it: `claude --plugin-dir .` from this checkout, or point
any other agent's skills path at `skills/`. To see the sample report on the real host,
commit a copy of `skills/grove-report/example/` into its own git repo and run
`npx @immediately-run/cli dev` there.

The first skill published here, `create-immediately-run-artifact`, turned a Claude
artifact into a standalone app. `grove-report` replaces it; the last version is at the
tag `create-immediately-run-artifact-v0.1.2`.

## License

MIT
