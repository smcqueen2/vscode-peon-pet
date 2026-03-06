import * as vscode from 'vscode';
import { Character } from './characters';
import { StateWatcher } from './state-watcher';
import {
  WebviewState,
  getNonce,
  getWebviewOptions,
  buildHtml,
  attachWatcher,
  sendInit,
  sendReinit,
} from './webview-helpers';

/**
 * {@link vscode.WebviewViewProvider} that renders the Peon Pet in the Explorer
 * sidebar. VS Code creates exactly one instance and calls
 * {@link resolveWebviewView} each time the panel becomes visible.
 */
export class PeonViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'peonPetView';

  private view?: vscode.WebviewView;
  private watcherDisposable?: vscode.Disposable;
  private savedState?: WebviewState;

  private static isWebviewState(value: unknown): value is WebviewState {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const state = value as Record<string, unknown>;
    return (
      typeof state['petX'] === 'number' &&
      Number.isFinite(state['petX']) &&
      typeof state['petY'] === 'number' &&
      Number.isFinite(state['petY'])
    );
  }

  constructor(
    private readonly mediaPath: string,
    private readonly watcher: StateWatcher,
    private readonly getActiveCharacter: () => Character,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<WebviewState>,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = getWebviewOptions(this.mediaPath);
    webviewView.webview.html = buildHtml(webviewView.webview, this.mediaPath, getNonce());

    if (context.state) {
      this.savedState = context.state;
    }

    webviewView.webview.onDidReceiveMessage((msg: unknown) => {
      if (!msg || typeof msg !== 'object') {
        return;
      }
      const message = msg as Record<string, unknown>;
      if (message['command'] === 'ready') {
        sendInit(webviewView.webview, this.getActiveCharacter(), this.savedState);
      } else if (
        message['command'] === 'save-state' &&
        PeonViewProvider.isWebviewState(message['state'])
      ) {
        this.savedState = message['state'];
      }
    });

    // Replace any stale watcher binding with a fresh one
    this.watcherDisposable?.dispose();
    this.watcherDisposable = attachWatcher(webviewView.webview, this.watcher);

    webviewView.onDidDispose(() => {
      this.watcherDisposable?.dispose();
      this.watcherDisposable = undefined;
      this.view = undefined;
    });
  }

  /** Call when the user changes character or size settings to push new assets. */
  reinit(): void {
    if (this.view) {
      sendReinit(this.view.webview, this.getActiveCharacter());
    }
  }
}
