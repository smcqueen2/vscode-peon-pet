# vscode-peon-pet — Agent Context

## What This Project Is

A VS Code / Cursor extension that renders an animated **Orc Peon** sprite in the editor. The orc reacts in real time to AI coding agent events emitted by [peon-ping](https://github.com/PeonPing/peon-ping) — a separate CLI tool that writes events to `~/.claude/hooks/peon-ping/.state.json`.

**GitHub repo:** https://github.com/smcqueen2/vscode-peon-pet (currently private)  
**Installed in:** Cursor at `~/.cursor/extensions/peonpet.vscode-peon-pet-0.1.0/`  
**Extension ID:** `stephenmcqueen.vscode-peon-pet`  
**Version:** 0.1.0

---

## Current State

- Extension is **built, installed, and working** in Cursor
- All source code is clean: ESLint + Prettier passing, TypeScript compiling with no errors
- Git repo initialised with local identity `smcqueen2 <mcqueen_4@hotmail.co.uk>` (repo-local config, not global)
- Two commits pushed to GitHub:
  - `7e48795` — Initial release
  - `3892f7a` — AI-generated artwork disclaimer added to README
- GitHub Actions CI configured (lints, compiles, packages VSIX on every push/PR)
- Husky pre-commit hook runs lint-staged on every commit

---

## Project Structure

```
vscode-peon-pet/
├── src/
│   ├── extension.ts          ← activation entry point; registers commands, providers, config listeners
│   ├── characters.ts         ← scans built-in + custom character packs; resolves asset paths
│   ├── state-watcher.ts      ← polls peon-ping state file every 200ms; emits per-listener disposables
│   ├── session-tracker.ts    ← in-memory session ID → timestamp map; builds SessionState[]
│   ├── PeonViewProvider.ts   ← WebviewViewProvider for Explorer sidebar
│   ├── PeonPanel.ts          ← WebviewPanel (editor tab) + PeonPanelSerializer (restore on restart)
│   └── webview-helpers.ts    ← shared HTML builder, CSP, asset URI conversion, watcher wiring
├── media/
│   ├── webview.html          ← HTML template with CSP/CSS/script placeholders
│   ├── webview.css           ← webview styles (transparent bg, drag cursor)
│   ├── webview.js            ← canvas 2D renderer (plain JS, runs inside webview sandbox)
│   └── assets/
│       ├── orc-sprite-atlas.png   ← 6×6 animation atlas (AI-generated, 3072×3072)
│       ├── orc-borders.png        ← decorative border overlay
│       ├── bg-pixel.png           ← pixel background
│       └── icon.png               ← extension marketplace icon
├── dist/
│   └── extension.js          ← webpack bundle (committed to repo for VSIX)
├── .github/
│   ├── workflows/ci.yml      ← lint + format check + compile + package VSIX
│   └── ISSUE_TEMPLATE/       ← bug_report.md, feature_request.md
├── eslint.config.js          ← ESLint v9 flat config (TypeScript + prettier)
├── .prettierrc               ← singleQuote, trailingComma all, semi, printWidth 100
├── .husky/pre-commit         ← runs lint-staged on staged .ts files
├── package.json              ← publisher: stephenmcqueen, license: MIT
├── tsconfig.json
├── webpack.config.js
└── CHANGELOG.md / CONTRIBUTING.md / LICENSE / README.md / CODE_OF_CONDUCT.md
```

---

## Key Technical Decisions

### State watcher (per-listener disposables)
`StateWatcher.onPeonEvent()` and `onSessionUpdate()` each return a `vscode.Disposable` that removes only that specific listener. This means closing the sidebar panel never silences the editor-tab panel's listeners (and vice versa).

### Webview communication flow
```
peon-ping writes .state.json
  → StateWatcher.poll() (every 200ms)
    → emits PeonEvent / SessionUpdate
      → attachWatcher() forwards as postMessage to webview
        → webview.js handles 'peon-event' / 'session-update' messages
          → canvas animation / dot update
```

### Animations (6×6 sprite atlas)
| Row | Animation | Trigger |
|-----|-----------|---------|
| 0 | sleeping | idle 30s |
| 1 | waking | SessionStart |
| 2 | typing | UserPromptSubmit |
| 3 | alarmed | PermissionRequest, PreCompact |
| 4 | celebrate | Stop (task done) |
| 5 | annoyed | PostToolUseFailure |

### Custom character packs
Drop a folder into `~/.openpeon/characters/<name>/` with `sprite-atlas.png` + optional `manifest.json`. The `scanCharacters()` function in `characters.ts` picks them up on the next "Change Character" command call.

### Drag-to-reposition
Mouse events in `webview.js` move the `#pet-container` div. Position is saved via `vscodeApi.setState()` and restored on the `init` message.

---

## Settings

| Key | Default | Values |
|-----|---------|--------|
| `peon-pet.position` | `explorer` | `explorer` \| `panel` |
| `peon-pet.character` | `orc` | any installed pack ID |
| `peon-pet.size` | `medium` | `small` (150px) \| `medium` (200px) \| `large` (250px) |

---

## Commands

| Command | ID |
|---------|----|
| Peon Pet: Open Panel | `peon-pet.start` |
| Peon Pet: Change Character | `peon-pet.changeCharacter` |

---

## Development Workflow

```bash
cd ~/Dev/vscode-peon-pet
npm run compile          # dev build (webpack, source maps)
npm run watch            # rebuild on change
npm run lint             # ESLint
npm run format           # Prettier
npm run package          # production build + .vsix

# Install into Cursor:
/Applications/Cursor.app/Contents/Resources/app/bin/cursor --install-extension vscode-peon-pet-0.1.0.vsix

# Then reload: Cmd+Shift+P → Developer: Reload Window
```

Git identity for this repo is set locally (not global):
- `user.name = smcqueen2`
- `user.email = mcqueen_4@hotmail.co.uk`

---

## Licensing Status

- **npm dependencies:** All MIT/Apache/BSD — clear
- **Extension code:** MIT (original work)
- **Sprite assets:** AI-generated pixel art (original, not ripped from any game). Disclaimer in README.
- **peon-ping / peon-pet repos:** No license on those repos (not owned by this author). Outstanding action: get explicit permission from the peon-ping/peon-pet owners before making this repo public, OR regenerate assets independently.

---

## Known Pending Items

1. **Licensing sign-off** — contact peon-ping/peon-pet owner for permission to bundle the sprite assets, or regenerate them independently using `~/peon-pet/docs/sprite-atlas-prompt.md`
2. **Demo GIF** — README has a placeholder comment for a demo GIF; needs recording
3. **Marketplace publishing** — publisher account `stephenmcqueen` needs to be registered at https://marketplace.visualstudio.com/manage before `vsce publish` will work
4. **Make repo public** — once licensing is resolved, flip the GitHub repo to public
