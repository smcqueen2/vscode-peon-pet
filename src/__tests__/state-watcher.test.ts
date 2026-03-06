jest.mock(
  'vscode',
  () => ({
    Disposable: class Disposable {
      private readonly fn: () => void;
      constructor(fn: () => void) {
        this.fn = fn;
      }
      dispose(): void {
        this.fn();
      }
    },
  }),
  { virtual: true },
);
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    readFileSync: jest.fn(),
  };
});

import * as fs from 'fs';
import { StateWatcher } from '../state-watcher';

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

function stateFilePayload(timestamp: number, event: string, sessionId = SESSION_ID): string {
  return JSON.stringify({
    last_active: {
      timestamp,
      event,
      session_id: sessionId,
      cwd: '/Users/me/workspace',
    },
  });
}

describe('StateWatcher', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    (fs.readFileSync as jest.Mock).mockReset();
  });

  it('emits mapped animation + session update for valid entries', () => {
    jest.useFakeTimers();
    const watcher = new StateWatcher();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const readSpy = fs.readFileSync as jest.Mock;
    readSpy.mockReturnValue(
      stateFilePayload(1, 'UserPromptSubmit') as unknown as ReturnType<typeof fs.readFileSync>,
    );

    const events: string[] = [];
    const sessionCounts: number[] = [];
    watcher.onPeonEvent((event) => events.push(event.anim));
    watcher.onSessionUpdate((update) => sessionCounts.push(update.sessions.length));

    watcher.start();
    jest.advanceTimersByTime(200);
    watcher.stop();

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['typing']);
    expect(sessionCounts).toEqual([1]);
    nowSpy.mockRestore();
  });

  it('removes a session after SessionEnd and emits empty session list', () => {
    jest.useFakeTimers();
    const watcher = new StateWatcher();
    jest.spyOn(Date, 'now').mockReturnValue(2_000);
    const readSpy = fs.readFileSync as jest.Mock;
    readSpy
      .mockReturnValueOnce(
        stateFilePayload(1, 'SessionStart') as unknown as ReturnType<typeof fs.readFileSync>,
      )
      .mockReturnValueOnce(
        stateFilePayload(2, 'SessionEnd') as unknown as ReturnType<typeof fs.readFileSync>,
      );

    const sessionCounts: number[] = [];
    watcher.onSessionUpdate((update) => sessionCounts.push(update.sessions.length));

    watcher.start();
    jest.advanceTimersByTime(200);
    jest.advanceTimersByTime(200);
    watcher.stop();

    expect(sessionCounts).toEqual([1, 0]);
  });

  it('ignores invalid JSON without throwing or notifying listeners', () => {
    jest.useFakeTimers();
    const watcher = new StateWatcher();
    (fs.readFileSync as jest.Mock).mockReturnValue(
      '{this is not json' as unknown as ReturnType<typeof fs.readFileSync>,
    );

    const onEvent = jest.fn();
    const onSession = jest.fn();
    watcher.onPeonEvent(onEvent);
    watcher.onSessionUpdate(onSession);

    expect(() => {
      watcher.start();
      jest.advanceTimersByTime(200);
      watcher.stop();
    }).not.toThrow();
    expect(onEvent).not.toHaveBeenCalled();
    expect(onSession).not.toHaveBeenCalled();
  });
});
