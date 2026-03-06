import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Character, CharacterAssets, getCharacterAssets, sizeFromSetting } from './characters';
import { StateWatcher, PeonEvent, SessionUpdate } from './state-watcher';

/** Position of the draggable pet within the webview, persisted across reloads. */
export interface WebviewState {
  petX: number;
  petY: number;
}

/** Generates a cryptographically-random nonce for the Content-Security-Policy. */
export function getNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns the {@link vscode.WebviewOptions} used by both the sidebar view and
 * the editor panel. Grants access to the extension's `media/` directory and the
 * user's `~/.openpeon/` directory (for custom character packs).
 */
export function getWebviewOptions(mediaPath: string): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.file(mediaPath),
      vscode.Uri.file(path.join(os.homedir(), '.openpeon')),
    ],
  };
}

/**
 * Builds the final HTML for a webview by reading `media/webview.html` and
 * injecting the CSP header, stylesheet URI, nonce, and script URI.
 */
export function buildHtml(webview: vscode.Webview, mediaPath: string, nonce: string): string {
  const template = fs.readFileSync(path.join(mediaPath, 'webview.html'), 'utf8');

  const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'webview.css')));
  const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, 'webview.js')));
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  return template
    .replace(
      '<!--CSP_PLACEHOLDER-->',
      `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    )
    .replace('<!--CSS_URI-->', cssUri.toString())
    .replace('<!--NONCE-->', nonce)
    .replace('<!--SCRIPT_URI-->', scriptUri.toString());
}

/**
 * Converts local character asset paths to webview-safe URIs so the sandboxed
 * iframe can load them.
 */
export function buildAssetUris(
  webview: vscode.Webview,
  assets: CharacterAssets,
): { spriteAtlas: string; borders: string | null; bg: string | null } {
  return {
    spriteAtlas: webview.asWebviewUri(vscode.Uri.file(assets.spriteAtlas)).toString(),
    borders: assets.borders
      ? webview.asWebviewUri(vscode.Uri.file(assets.borders)).toString()
      : null,
    bg: assets.bg ? webview.asWebviewUri(vscode.Uri.file(assets.bg)).toString() : null,
  };
}

/**
 * Wires up {@link StateWatcher} listeners to forward events into a live webview.
 * Returns a {@link vscode.Disposable} that removes only this webview's listeners,
 * so disposing one view never silences another.
 */
export function attachWatcher(webview: vscode.Webview, watcher: StateWatcher): vscode.Disposable {
  const onEvent = (e: PeonEvent) => webview.postMessage({ command: 'peon-event', ...e });
  const onSession = (e: SessionUpdate) => webview.postMessage({ command: 'session-update', ...e });

  const d1 = watcher.onPeonEvent(onEvent);
  const d2 = watcher.onSessionUpdate(onSession);

  return new vscode.Disposable(() => {
    d1.dispose();
    d2.dispose();
  });
}

/** Reads the current size setting and converts it to pixels. */
function getSizePx(): number {
  return sizeFromSetting(
    vscode.workspace.getConfiguration('peon-pet').get<string>('size', 'medium') ?? 'medium',
  );
}

/**
 * Sends the `init` message to the webview once it signals it is ready.
 * Includes character asset URIs, display size, and any previously saved
 * drag position.
 */
export function sendInit(
  webview: vscode.Webview,
  character: Character,
  savedState: WebviewState | undefined,
): void {
  const assets = getCharacterAssets(character);
  webview.postMessage({
    command: 'init',
    assets: buildAssetUris(webview, assets),
    size: getSizePx(),
    state: savedState ?? null,
  });
}

/**
 * Sends the `reinit` message to the webview when the character or size setting
 * changes at runtime. The webview reloads its assets without a full page reload.
 */
export function sendReinit(webview: vscode.Webview, character: Character): void {
  const assets = getCharacterAssets(character);
  webview.postMessage({
    command: 'reinit',
    assets: buildAssetUris(webview, assets),
    size: getSizePx(),
  });
}
