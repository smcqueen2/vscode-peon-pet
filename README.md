# Peon Pet

[![Version](https://img.shields.io/visual-studio-marketplace/v/stephenmcqueen.vscode-peon-pet)](https://marketplace.visualstudio.com/items?itemName=stephenmcqueen.vscode-peon-pet)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/stephenmcqueen.vscode-peon-pet)](https://marketplace.visualstudio.com/items?itemName=stephenmcqueen.vscode-peon-pet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An animated Orc Peon that lives in your editor and reacts to your AI coding agent events in real time — powered by [peon-ping](https://github.com/PeonPing/peon-ping).

<!-- TODO: add a demo GIF here once recorded -->

---

## Features

- **Live animations** — the orc reacts to peon-ping events:

  | peon-ping event       | Animation   |
  |-----------------------|-------------|
  | `SessionStart`        | Waking up   |
  | `UserPromptSubmit`    | Typing      |
  | `PermissionRequest`   | Alarmed     |
  | `PostToolUseFailure`  | Annoyed     |
  | `Stop` (task done)    | Celebrate 🎉 |
  | `PreCompact`          | Alarmed     |
  | Idle (30 s)           | Sleeping    |

- **Session dots** — coloured dots above the orc show how many AI sessions are active (green = hot, dark = warm, grey = cold). Hover for the working directory.
- **Drag to reposition** — click and drag the orc anywhere in the panel.
- **Sidebar or editor tab** — show in the Explorer sidebar or open as a floating editor tab via the command palette.
- **Custom character packs** — drop your own sprite atlas into `~/.openpeon/characters/` and switch with one command.

---

## Requirements

- [peon-ping](https://github.com/PeonPing/peon-ping) installed and running

peon-ping writes event state to `~/.claude/hooks/peon-ping/.state.json`. The extension polls this file every 200 ms — no daemon or socket required.

---

## Installation

### From the VS Code Marketplace

Search for **Peon Pet** in the Extensions panel, or install via:

```
ext install stephenmcqueen.vscode-peon-pet
```

### From VSIX (manual)

1. Download the latest `.vsix` from the [Releases](https://github.com/smcqueen2/vscode-peon-pet/releases) page.
2. In VS Code / Cursor: `Cmd+Shift+P` → **Extensions: Install from VSIX…**

---

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `Peon Pet: Open Panel` | Opens the orc as a floating editor tab |
| `Peon Pet: Change Character` | QuickPick to switch between installed character packs |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `peon-pet.position` | `explorer` | `explorer` = sidebar, `panel` = editor tab |
| `peon-pet.character` | `orc` | Active character pack ID |
| `peon-pet.size` | `medium` | Sprite size: `small` (150px), `medium` (200px), `large` (250px) |

---

## Custom Characters

Drop a folder into `~/.openpeon/characters/<your-character>/` containing:

```
~/.openpeon/characters/
  my-character/
    sprite-atlas.png   ← required
    manifest.json      ← optional
    borders.png        ← optional overlay
    bg.png             ← optional background
```

### `sprite-atlas.png`

A single PNG sprite sheet with **6 columns × 6 rows** of animation frames.

| Spec | Value |
|------|-------|
| Format | PNG with alpha |
| Grid | 6 cols × 6 rows |
| Recommended frame size | 512 × 512 px (atlas = 3072 × 3072) |
| Style | Pixel art — must read clearly at 150–250 px display size |

**Row layout (fixed order):**

| Row | Animation |
|-----|-----------|
| 0 | Sleeping |
| 1 | Waking |
| 2 | Typing |
| 3 | Alarmed |
| 4 | Celebrate |
| 5 | Annoyed |

### `manifest.json` (optional)

```json
{
  "name": "My Character",
  "author": "Your Name",
  "description": "A short description."
}
```

After adding a pack, run **Peon Pet: Change Character** — it re-scans and shows the new entry immediately.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up the development environment, submit bug reports, or contribute a new character pack.

---

## Acknowledgements

This extension would not exist without these projects:

- **[peon-ping](https://github.com/PeonPing/peon-ping)** — the AI coding event sound system that this extension hooks into for its animations and session tracking.
- **[peon-pet](https://github.com/PeonPing/peon-pet)** — the original macOS Electron desktop pet that inspired this VS Code port. The sprite atlas format, session-dot concept, and character spec all originate there.
- **[vscode-pokemon](https://github.com/jakobhoeg/vscode-pokemon)** by [jakobhoeg](https://github.com/jakobhoeg) — the VS Code extension that inspired the overall approach: webview-based pet, sidebar + panel dual placement, custom character support, and the project structure conventions used here.

---

## License

[MIT](LICENSE)
