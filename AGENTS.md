# AGENTS.md

Shared XUI agent skills repo for Claude Code and Codex.

## Commands

```bash
npm link
xui-skills list
xui-skills install frontend rpx-xui-webapp-developer
xui-skills install api rpx-xui-api-layer-developer
xui-skills install testing rpx-xui-webapp-ticket-to-tests
xui-skills install delivery rpx-xui-delivery-orchestrator
xui-skills install --all --global
./import.sh ~/HMCTS/dev/PROJECTS/rpx-xui-webapp
```

## Layout

```text
skills/<category>/<skill-name>/SKILL.md
```

Current categories:

- `frontend`
- `api`
- `testing`
- `delivery`

## Rules

- Keep this file short. Put detailed guidance inside the skill folders, not here.
- Keep each skill self-contained with `SKILL.md` and optional `references/` or `agents/`.
- Keep any Codex custom-agent examples inside skill `assets/`, not in this root file.
- Treat official OpenAI docs as on-demand references for Codex or OpenAI-platform tasks only. Do not preload them for normal XUI delivery work.
- Prefer markdown, reader-mode, or extracted main-content views over raw HTML when reading web pages. Inspect raw HTML only when the task depends on DOM structure, metadata, forms, hidden state, scripts, or other page mechanics.
- Preserve YAML frontmatter with `name` and `description` in every `SKILL.md`.
- Do not commit installed symlinks from `.claude/commands/` or `.codex/skills/`; add exact paths to the consuming repo `.gitignore`.
- `import.sh` should support the XUI source layout first: `.agents/skills/`, then `.claude/commands/`, `.codex/skills/`, and `agents/`.
