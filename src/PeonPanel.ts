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
 * {@link vscode.WebviewPanel} that opens the Peon Pet as an editor-area tab.
 * Only one instance runs at a time (singleton via {@link currentPanel}).
 * Implements {@link vscode.WebviewPanelSerializer} via {@link PeonPanelSerializer}
 * so the panel is restored after VS Code / Cursor restarts.
 */
export class PeonPanel {
  public static readonly viewType = 'peonPet';

  /** The currently active panel, or `undefined` if none is open. */
  public static currentPanel: PeonPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private watcherDisposable?: vscode.Disposable;
  private savedState?: WebviewState;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly mediaPath: string,
    private readonly watcher: StateWatcher,
    private readonly getActiveCharacter: () => Character,
    savedState?: WebviewState,
  ) {
    this.panel = panel;
    this.savedState = savedState;
    this.setup();
  }

  /**
   * Opens the panel in the same column as the active editor, or reveals it if
   * one already exists.
   */
  static createOrShow(
    mediaPath: string,
    watcher: StateWatcher,
    getActiveCharacter: () => Character,
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (PeonPanel.currentPanel) {
      PeonPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      PeonPanel.viewType,
      'Peon Pet',
      column ?? vscode.ViewColumn.One,
      getWebviewOptions(mediaPath),
    );

    PeonPanel.currentPanel = new PeonPanel(panel, mediaPath, watcher, getActiveCharacter);
  }

  /**
   * Restores a serialized panel after VS Code / Cursor restarts. Called by
   * {@link PeonPanelSerializer}.
   */
  static revive(
    panel: vscode.WebviewPanel,
    mediaPath: string,
    watcher: StateWatcher,
    getActiveCharacter: () => Character,
    savedState?: WebviewState,
  ): void {
    PeonPanel.currentPanel = new PeonPanel(
      panel,
      mediaPath,
      watcher,
      getActiveCharacter,
      savedState,
    );
  }

  private setup(): void {
    this.panel.webview.options = getWebviewOptions(this.mediaPath);
    this.panel.webview.html = buildHtml(this.panel.webview, this.mediaPath, getNonce());

    this.panel.webview.onDidReceiveMessage(
      (msg) => {
        if (msg.command === 'ready') {
          sendInit(this.panel.webview, this.getActiveCharacter(), this.savedState);
        } else if (msg.command === 'save-state') {
          this.savedState = msg.state as WebviewState;
        }
      },
      null,
      this.disposables,
    );

    this.watcherDisposable = attachWatcher(this.panel.webview, this.watcher);
    this.disposables.push(this.watcherDisposable);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /** Push new character/size assets to the running webview. */
  reinit(): void {
    sendReinit(this.panel.webview, this.getActiveCharacter());
  }

  dispose(): void {
    PeonPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

/**
 * Deserializes a {@link PeonPanel} after VS Code / Cursor restarts, restoring
 * the pet's last saved position.
 */
export class PeonPanelSerializer implements vscode.WebviewPanelSerializer<WebviewState> {
  constructor(
    private readonly mediaPath: string,
    private readonly watcher: StateWatcher,
    private readonly getActiveCharacter: () => Character,
  ) {}

  async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: WebviewState): Promise<void> {
    panel.webview.options = getWebviewOptions(this.mediaPath);
    PeonPanel.revive(panel, this.mediaPath, this.watcher, this.getActiveCharacter, state);
  }
}
