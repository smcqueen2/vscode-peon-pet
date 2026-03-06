import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

type ListenerMap = Record<string, Array<(event: unknown) => void>>;

function createListenerMap(): ListenerMap {
  return Object.create(null) as ListenerMap;
}

function runWebviewScript() {
  const windowListeners = createListenerMap();
  const canvasListeners = createListenerMap();
  const documentListeners = createListenerMap();

  const tooltip = {
    innerHTML: '',
    style: { display: 'none', left: '0px', top: '0px' },
    offsetWidth: 0,
    offsetHeight: 0,
  };

  const container = {
    style: { left: '0px', top: '0px', width: '0px', height: '0px' },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };

  const ctx = {
    imageSmoothingEnabled: false,
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    set fillStyle(_value: string) {},
    set globalAlpha(_value: number) {},
  };

  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!canvasListeners[type]) {
        canvasListeners[type] = [];
      }
      canvasListeners[type].push(listener);
    },
  };

  const documentObj = {
    body: { clientWidth: 600, clientHeight: 600 },
    getElementById: (id: string) => {
      if (id === 'pet-container') {
        return container;
      }
      if (id === 'c') {
        return canvas;
      }
      if (id === 'tooltip') {
        return tooltip;
      }
      return null;
    },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!documentListeners[type]) {
        documentListeners[type] = [];
      }
      documentListeners[type].push(listener);
    },
  };

  const vscodeApi = {
    postMessage: jest.fn(),
    setState: jest.fn(),
  };

  class FakeImage {
    public onload: null | (() => void) = null;
    public onerror: null | (() => void) = null;
    public naturalWidth = 600;
    public naturalHeight = 600;

    set src(_value: string) {
      if (this.onload) {
        this.onload();
      }
    }
  }

  const windowObj = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!windowListeners[type]) {
        windowListeners[type] = [];
      }
      windowListeners[type].push(listener);
    },
  };

  const context = {
    window: windowObj,
    document: documentObj,
    Image: FakeImage,
    acquireVsCodeApi: () => vscodeApi,
    requestAnimationFrame: () => 0,
    setTimeout: (fn: () => void) => {
      fn();
      return 1;
    },
    clearTimeout: () => undefined,
    Math,
    console,
  };

  const script = fs.readFileSync(
    path.join(process.cwd(), 'media', 'webview.js'),
    'utf8',
  ) as unknown as string;
  vm.runInNewContext(script, context);

  return {
    windowListeners,
    canvasListeners,
    tooltip,
  };
}

describe('webview tooltip behavior', () => {
  it('escapes cwd-derived labels before writing tooltip html', () => {
    const { windowListeners, canvasListeners, tooltip } = runWebviewScript();

    const onMessage = windowListeners['message'][0];
    onMessage({
      data: {
        command: 'session-update',
        sessions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            hot: true,
            warm: true,
            cwd: '/tmp/<img src=x onerror=alert(1)>',
          },
        ],
      },
    });

    const onMouseMove = canvasListeners['mousemove'][0];
    onMouseMove({ offsetX: 100, offsetY: 9 });

    expect(tooltip.innerHTML).not.toContain('<img');
    expect(tooltip.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
