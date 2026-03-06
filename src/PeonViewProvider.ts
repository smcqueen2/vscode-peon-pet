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

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.command === 'ready') {
        sendInit(webviewView.webview, this.getActiveCharacter(), this.savedState);
      } else if (msg.command === 'save-state') {
        this.savedState = msg.state as WebviewState;
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
