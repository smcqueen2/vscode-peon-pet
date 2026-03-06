# Contributing to Peon Pet

Thank you for your interest in contributing! This project builds on the work of:

- **[peon-ping](https://github.com/PeonPing/peon-ping)** — the event/sound system this extension hooks into
- **[peon-pet](https://github.com/PeonPing/peon-pet)** — the original Electron desktop pet
- **[vscode-pokemon](https://github.com/jakobhoeg/vscode-pokemon)** — the VS Code extension that inspired this approach

There are two main ways to contribute: **code** and **character packs**.

---

## Development Setup

### Prerequisites

- Node.js 18+
- VS Code or Cursor
- [peon-ping](https://github.com/PeonPing/peon-ping) installed (for testing live animations)

### Getting Started

```bash
git clone https://github.com/smcqueen2/vscode-peon-pet.git
cd vscode-peon-pet
npm install
npm run compile
```

Press **F5** in VS Code / Cursor to launch the Extension Development Host — a fresh window with the extension loaded from your local source.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Build in development mode (with source maps) |
| `npm run watch` | Rebuild on file changes |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run package` | Build for production and create `.vsix` |

### Code Style

- **TypeScript** for all extension host code in `src/`
- **ESLint** (flat config, see `eslint.config.js`) + **Prettier** (see `.prettierrc`)
- Pre-commit hooks via Husky + lint-staged run ESLint and Prettier automatically

### Project Structure

```
src/
  extension.ts          ← activation entry point
  characters.ts         ← character pack scanning and asset resolution
  state-watcher.ts      ← polls peon-ping state file, emits events
  session-tracker.ts    ← in-memory session state
  PeonViewProvider.ts   ← sidebar WebviewViewProvider
  webview-helpers.ts    ← shared HTML building and message helpers
media/
  webview.html          ← webview HTML template
  webview.css           ← webview styles
  webview.js            ← canvas renderer (plain JS, runs inside the webview sandbox)
  assets/               ← built-in orc assets
```

### Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and ensure `npm run lint` and `npm run format:check` pass
3. Open a PR against `main` with a clear description of what changed and why

---

## Submitting a Custom Character

Character packs are sprite-based. Each pack is a folder of assets following the spec below. Submissions are reviewed before merging into the built-in pack list.

### File Structure

```
characters/
  your-character-name/
    manifest.json        ← required: metadata
    sprite-atlas.png     ← required: animation frames
    borders.png          ← optional: decorative overlay
    bg.png               ← optional: background texture
```

### `manifest.json`

```json
{
  "name": "Display Name",
  "author": "Your Name",
  "website": "https://optional-link.com",
  "description": "Short description of the character."
}
```

### `sprite-atlas.png`

A single PNG sprite sheet with **6 columns × 6 rows** of animation frames.

| Spec | Value |
|------|-------|
| Format | PNG with alpha (transparent background) |
| Grid | 6 cols × 6 rows |
| Recommended frame size | 512 × 512 px (atlas = 3072 × 3072) |
| Style | Pixel art — must be clearly readable at 150–250 px display size |

**Row layout (fixed — do not reorder):**

| Row | Animation | Description |
|-----|-----------|-------------|
| 0 | `sleeping` | Idle/resting |
| 1 | `waking` | Session start |
| 2 | `typing` | Working on a prompt |
| 3 | `alarmed` | Permission request or compact |
| 4 | `celebrate` | Task complete |
| 5 | `annoyed` | Tool failure |

Each row must contain exactly 6 frames, even if the animation uses fewer (pad with the last frame).

### Testing Locally

1. Place your character folder in `~/.openpeon/characters/<your-name>/`
2. Run **Peon Pet: Change Character** in VS Code — the pack appears immediately
3. Trigger animations by running `peon fire <event>` in the terminal

---

## Reporting Issues

Please use the [GitHub issue tracker](https://github.com/smcqueen2/vscode-peon-pet/issues). Include:

- VS Code / Cursor version
- Extension version
- Steps to reproduce
- Any relevant output from the Developer Tools console (`Help → Toggle Developer Tools`)
