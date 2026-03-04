import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  isValidSessionId,
  createSessionTracker,
  buildSessionStates,
  EVENT_TO_ANIM,
  SessionState,
} from './session-tracker';

const STATE_FILE = path.join(os.homedir(), '.claude', 'hooks', 'peon-ping', '.state.json');

/** How often to poll the state file (ms). */
const POLL_MS = 200;
/** Sessions older than this are pruned from memory. */
const SESSION_PRUNE_MS = 10 * 60 * 1000;
/** A session is "hot" (actively running) within this window. */
const HOT_MS = 30 * 1000;
/** A session is "warm" (recently active) within this window. */
const WARM_MS = 2 * 60 * 1000;
/** Maximum number of concurrent sessions to track. */
const MAX_SESSIONS = 10;

/** Fired when a peon-ping event maps to an animation. */
export interface PeonEvent {
  anim: string;
  event: string;
}

/** Fired on every poll cycle with the current session list. */
export interface SessionUpdate {
  sessions: SessionState[];
}

type PeonEventListener = (e: PeonEvent) => void;
type SessionListener = (e: SessionUpdate) => void;

/**
 * Polls `~/.claude/hooks/peon-ping/.state.json` and emits events whenever
 * peon-ping writes a new entry. A single shared instance is used by all
 * webviews; each webview receives its own {@link vscode.Disposable} via
 * {@link onPeonEvent} / {@link onSessionUpdate} so that closing one view does
 * not remove another view's listeners.
 */
export class StateWatcher implements vscode.Disposable {
  private lastTimestamp = 0;
  private tracker = createSessionTracker();
  private sessionCwds = new Map<string, string>();
  private eventListeners: PeonEventListener[] = [];
  private sessionListeners: SessionListener[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  /** Start polling the state file. Safe to call multiple times. */
  start(): void {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => this.poll(), POLL_MS);
  }

  /** Stop polling. */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  dispose(): void {
    this.stop();
  }

  /**
   * Register a listener for animation events. Returns a {@link vscode.Disposable}
   * that removes only this listener when disposed — safe to use alongside other
   * active webviews.
   */
  onPeonEvent(listener: PeonEventListener): vscode.Disposable {
    this.eventListeners.push(listener);
    return new vscode.Disposable(() => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    });
  }

  /**
   * Register a listener for session-state updates. Returns a {@link vscode.Disposable}
   * that removes only this listener when disposed.
   */
  onSessionUpdate(listener: SessionListener): vscode.Disposable {
    this.sessionListeners.push(listener);
    return new vscode.Disposable(() => {
      this.sessionListeners = this.sessionListeners.filter((l) => l !== listener);
    });
  }

  private poll(): void {
    let raw: string;
    try {
      raw = fs.readFileSync(STATE_FILE, 'utf8');
    } catch {
      return;
    }

    let state: Record<string, unknown>;
    try {
      state = JSON.parse(raw);
    } catch {
      return;
    }

    const active = state['last_active'] as Record<string, unknown> | undefined;
    if (!active) {
      return;
    }

    const { timestamp, event, session_id, cwd } = active as {
      timestamp: number;
      event: string;
      session_id: string;
      cwd?: string;
    };

    if (timestamp === this.lastTimestamp) {
      return;
    }
    this.lastTimestamp = timestamp;

    const now = Date.now();

    if (isValidSessionId(session_id)) {
      if (event === 'SessionEnd') {
        this.tracker.remove(session_id);
        this.sessionCwds.delete(session_id);
      } else {
        // Deduplicate resume events: if exactly one other session started within 5 s, replace it
        if (event === 'SessionStart') {
          const existing = this.tracker.entries();
          const isNew = !existing.some(([id]) => id === session_id);
          if (isNew && existing.length === 1) {
            const [oldId, oldTime] = existing[0];
            if (now - oldTime < 5000) {
              this.tracker.remove(oldId);
            }
          }
        }
        this.tracker.update(session_id, now);
        if (cwd) {
          this.sessionCwds.set(session_id, cwd);
        }
      }

      this.tracker.prune(now - SESSION_PRUNE_MS);
      for (const id of this.sessionCwds.keys()) {
        if (!this.tracker.entries().some(([sid]) => sid === id)) {
          this.sessionCwds.delete(id);
        }
      }
    }

    const sessions = buildSessionStates(this.tracker.entries(), now, HOT_MS, WARM_MS, MAX_SESSIONS);
    const sessionsWithCwd: SessionState[] = sessions.map((s) => ({
      ...s,
      cwd: this.sessionCwds.get(s.id) ?? null,
    }));

    for (const l of this.sessionListeners) {
      l({ sessions: sessionsWithCwd });
    }

    const anim = EVENT_TO_ANIM[event];
    if (anim) {
      for (const l of this.eventListeners) {
        l({ anim, event });
      }
    }
  }
}
