# immediately.run plugins for Claude Code and opencode

Plugins for building apps on [immediately.run](https://immediately.run).

## Install

In Claude Code:

```
/plugin marketplace add immediately-run/claude-plugins
/plugin install immediately-run@immediately-run-plugins
```

In opencode, add the skills URL to `opencode.json` (project) or
`~/.config/opencode/opencode.json` (global):

```json
{
  "skills": {
    "urls": [
      "https://raw.githubusercontent.com/immediately-run/claude-plugins/main/plugins/immediately-run/skills/"
    ]
  }
}
```

opencode fetches `index.json` from that directory, downloads the listed skill files
into `~/.cache/opencode/skills/`, and re-downloads when the index's `version`
changes. For a local checkout instead of the remote URL, point `skills.paths` at
the checkout:

```json
{ "skills": { "paths": ["<checkout>/plugins/immediately-run/skills"] } }
```

## What's in it

### `immediately-run` plugin

| Skill | What it does |
| --- | --- |
| `create-immediately-run-artifact` | Turns a Claude artifact (a claude.ai artifact link or a saved HTML page) into an immediately.run app in its own GitHub repo — prose in MDX, repeated records as typed data, imported images, host theme and host-safe links — then verifies it on the real host and publishes it. Also diagnoses artifact-style apps that "don't load". |

Ask Claude something like *"turn this artifact into an immediately.run app: &lt;link&gt;"*.

**Needs:** `gh` (signed in), Node 20+, Python 3 and Google Chrome. The immediately.run
CLI runs through `npx @immediately-run/cli`.

## Updating

Bump `version` in `plugins/immediately-run/.claude-plugin/plugin.json` with every change;
Claude Code users pick it up with `/plugin marketplace update immediately-run-plugins`.
When a skill's files change, also bump that skill's `version` in
`plugins/immediately-run/skills/index.json` — that is what makes opencode re-download.
New skill files must be added to the skill's `files` list there (every entry must keep
`SKILL.md` listed, or opencode skips the skill).

## Editing the skills

This repo is the only copy. The immediately.run workspace enables the plugin from
`docs/.claude/settings.json` rather than keeping its own. To try an edit before
publishing it, run `claude --plugin-dir plugins/immediately-run` from this checkout —
or, for opencode, use the `skills.paths` form above against the checkout. The skills
are written to run under both hosts: `$SKILL` means `${CLAUDE_SKILL_DIR}` in Claude
Code and the base directory opencode names when it loads the skill.

## License

MIT
