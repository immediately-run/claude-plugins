# immediately.run plugins for Claude Code

Claude Code plugins for building apps on [immediately.run](https://immediately.run).

## Install

In Claude Code:

```
/plugin marketplace add immediately-run/claude-plugins
/plugin install immediately-run@immediately-run-plugins
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
users pick it up with `/plugin marketplace update immediately-run-plugins`.
