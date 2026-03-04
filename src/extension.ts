import * as path from 'path';
import * as vscode from 'vscode';
import { scanCharacters, getCharacterById, Character } from './characters';
import { StateWatcher } from './state-watcher';
import { PeonViewProvider } from './PeonViewProvider';

/**
 * Extension entry point. Called once by VS Code / Cursor when the extension
 * first activates (see `activationEvents` in `package.json`).
 *
 * Registers:
 * - The Explorer sidebar {@link PeonViewProvider}
 * - The `peon-pet.changeCharacter` command
 * - A configuration-change listener that propagates setting updates to live webviews
 */
export function activate(context: vscode.ExtensionContext): void {
  const mediaPath = path.join(context.extensionPath, 'media');

  // ── Character state ────────────────────────────────────────────────────────
  let characters = scanCharacters(mediaPath);
  let activeCharId = vscode.workspace.getConfiguration('peon-pet').get<string>('character', 'orc');
  let activeChar: Character = getCharacterById(characters, activeCharId);

  function getActiveCharacter(): Character {
    return activeChar;
  }

  // ── State watcher ──────────────────────────────────────────────────────────
  const watcher = new StateWatcher();
  watcher.start();
  context.subscriptions.push(watcher);

  // ── Sidebar view ───────────────────────────────────────────────────────────
  const viewProvider = new PeonViewProvider(mediaPath, watcher, getActiveCharacter);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PeonViewProvider.viewId, viewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ── Commands ───────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('peon-pet.changeCharacter', async () => {
      // Re-scan so newly dropped packs are immediately available
      characters = scanCharacters(mediaPath);

      const items: vscode.QuickPickItem[] = characters.map((c) => ({
        label: c.manifest.name,
        description: c.isBuiltIn ? '(built-in)' : c.id,
        detail: c.manifest.description,
        picked: c.id === activeChar.id,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        title: 'Peon Pet — Change Character',
        placeHolder: 'Select a character pack',
        matchOnDetail: true,
      });

      if (!picked) {
        return;
      }

      const chosen = characters.find((c) => c.manifest.name === picked.label);
      if (!chosen || chosen.id === activeChar.id) {
        return;
      }

      activeChar = chosen;
      activeCharId = chosen.id;

      await vscode.workspace
        .getConfiguration('peon-pet')
        .update('character', chosen.id, vscode.ConfigurationTarget.Global);

      viewProvider.reinit();

      vscode.window.showInformationMessage(`Peon Pet: switched to ${chosen.manifest.name}`);
    }),
  );

  // ── Configuration change listener ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('peon-pet.character')) {
        activeCharId = vscode.workspace
          .getConfiguration('peon-pet')
          .get<string>('character', 'orc');
        activeChar = getCharacterById(characters, activeCharId);
        viewProvider.reinit();
      }
      if (e.affectsConfiguration('peon-pet.size')) {
        viewProvider.reinit();
      }
    }),
  );
}

/** Called when the extension is deactivated. The {@link StateWatcher} is stopped
 *  automatically via `context.subscriptions`. */
export function deactivate(): void {
  // intentionally empty — cleanup handled by context.subscriptions
}
