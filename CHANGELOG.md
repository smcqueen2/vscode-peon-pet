# Changelog

All notable changes to Peon Pet will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2025-03-02

### Added

- Initial release of the VS Code extension, ported from the [peon-pet](https://github.com/PeonPing/peon-pet) Electron app.
- Canvas 2D sprite renderer with a 6×6 animation atlas (sleeping, waking, typing, alarmed, celebrate, annoyed).
- Live reaction to [peon-ping](https://github.com/PeonPing/peon-ping) events via `~/.claude/hooks/peon-ping/.state.json` polling.
- Session dots: coloured indicators showing active AI sessions with hover tooltips.
- Visual effects: flash overlay, screen shake, and gold particle burst on celebrate.
- Sidebar placement via `WebviewViewProvider` in the Explorer panel.
- Editor-tab placement via `WebviewPanel` with state persistence across restarts (`WebviewPanelSerializer`).
- Drag-to-reposition — pet position saved automatically via `vscodeApi.setState()`.
- Built-in **Orc Peon** character pack.
- Custom character pack support via `~/.openpeon/characters/<name>/`.
- `Peon Pet: Change Character` command with re-scan QuickPick.
- `peon-pet.position`, `peon-pet.character`, and `peon-pet.size` settings.
