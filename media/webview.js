// Peon Pet webview — canvas 2D sprite renderer
// Runs inside a VS Code webview (sandboxed iframe), no imports.
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const ATLAS_COLS = 6;
  const ATLAS_ROWS = 6;

  const ANIM_CONFIG = {
    sleeping: { row: 0, frames: 6, fps: 3, loop: true, loops: 1 },
    waking: { row: 1, frames: 6, fps: 2, loop: false, loops: 1 },
    typing: { row: 2, frames: 6, fps: 8, loop: false, loops: 3 },
    alarmed: { row: 3, frames: 6, fps: 8, loop: false, loops: 3 },
    celebrate: { row: 4, frames: 6, fps: 8, loop: false, loops: 3 },
    annoyed: { row: 5, frames: 6, fps: 8, loop: false, loops: 3 },
  };

  const FLASH_COLORS = {
    waking: [0.4, 0.8, 1.0, 0.3],
    alarmed: [1.0, 0.1, 0.1, 0.5],
    celebrate: [1.0, 0.8, 0.0, 0.5],
    annoyed: [0.8, 0.4, 0.0, 0.3],
  };

  const IDLE_TIMEOUT_MS = 30000;
  const MAX_DOTS = 10;
  const DOT_R = 5;
  const DOT_GAP = 4;
  const PARTICLE_COUNT = 28;
  const PARTICLE_DUR = 1.2;

  // ── DOM ───────────────────────────────────────────────────────────────────
  const vscodeApi = acquireVsCodeApi();
  const container = document.getElementById('pet-container');
  const canvas = document.getElementById('c');
  const tooltip = document.getElementById('tooltip');
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;

  // ── State ─────────────────────────────────────────────────────────────────
  let petSize = 200;
  let currentAnim = 'sleeping';
  let currentFrame = 0;
  let frameTimer = 0;
  let remainingLoops = 0;
  let pendingIdle = false;
  let anySessionActive = false;
  let currentSessions = [];
  let idleTimer = null;

  // Flash overlay
  let flashR = 0,
    flashG = 0,
    flashB = 0,
    flashIntensity = 0,
    flashDecay = 2.0;

  // Screen shake
  let shakeIntensity = 0;
  const SHAKE_DECAY = 8.0;

  // Particles
  const particlePos = new Float32Array(PARTICLE_COUNT * 2);
  const particleVel = [];
  const particleCol = [];
  let particleLife = 0;

  // Assets
  let atlasImg = null;
  let bordersImg = null;
  let bgImg = null;
  let assetsReady = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function loadImage(uri) {
    return new Promise((resolve) => {
      if (!uri) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = uri;
    });
  }

  function resize(size) {
    petSize = size;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    container.style.width = size + 'px';
    container.style.height = size + 'px';
  }

  // ── Animation state machine ───────────────────────────────────────────────
  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      if (!anySessionActive) {
        playAnim('sleeping');
      }
    }, IDLE_TIMEOUT_MS);
  }

  function playAnim(name) {
    if (!ANIM_CONFIG[name]) {
      return;
    }
    pendingIdle = false;
    currentAnim = name;
    currentFrame = 0;
    frameTimer = 0;
    remainingLoops = ANIM_CONFIG[name].loops - 1;

    const flash = FLASH_COLORS[name];
    if (flash) {
      flashR = flash[0];
      flashG = flash[1];
      flashB = flash[2];
      flashIntensity = flash[3];
      flashDecay = name === 'alarmed' ? 2.5 : 2.0;
    }

    if (name === 'celebrate') {
      burstParticles();
    }
    if (name !== 'sleeping') {
      resetIdleTimer();
    }
  }

  // ── Particle burst ────────────────────────────────────────────────────────
  const GOLD = [
    [255, 217, 0],
    [255, 255, 102],
    [230, 153, 25],
  ];

  function burstParticles() {
    particleLife = PARTICLE_DUR;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePos[i * 2] = (Math.random() - 0.5) * petSize * 0.3 + petSize / 2;
      particlePos[i * 2 + 1] = petSize * 0.6 + (Math.random() - 0.5) * petSize * 0.15;
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const speed = (petSize / 200) * (40 + Math.random() * 80);
      particleVel[i] = {
        vx: Math.cos(angle) * speed,
        vy: -(Math.abs(Math.sin(angle)) * speed + 20),
        gravity: (petSize / 200) * (60 + Math.random() * 40),
      };
      particleCol[i] = GOLD[Math.floor(Math.random() * GOLD.length)];
    }
  }

  // ── Session dots ──────────────────────────────────────────────────────────
  function drawDots(time) {
    const count = Math.min(currentSessions.length, MAX_DOTS);
    if (count === 0) {
      return;
    }
    const totalW = count * DOT_R * 2 + Math.max(0, count - 1) * DOT_GAP;
    const startX = (petSize - totalW) / 2 + DOT_R;
    const dotY = DOT_R + 4;

    for (let i = 0; i < count; i++) {
      const s = currentSessions[i];
      const cx = startX + i * (DOT_R * 2 + DOT_GAP);
      const cy = dotY;
      const pulse = s.hot ? (Math.sin(time * 0.003 + i) + 1) / 2 : 0;

      // Outer glow
      if (s.hot) {
        const glowR = DOT_R + 3 + pulse * 2;
        const grad = ctx.createRadialGradient(cx, cy, DOT_R * 0.5, cx, cy, glowR);
        grad.addColorStop(0, `rgba(68,255,68,${0.3 * pulse})`);
        grad.addColorStop(1, 'rgba(68,255,68,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Core dot
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = s.hot ? '#44ff44' : s.warm ? '#1a4d1a' : '#333';
      ctx.fill();
    }
  }

  // ── Tooltip hit-test ──────────────────────────────────────────────────────
  function hitTestDots(px, py) {
    const count = Math.min(currentSessions.length, MAX_DOTS);
    if (count === 0) {
      return -1;
    }
    const totalW = count * DOT_R * 2 + Math.max(0, count - 1) * DOT_GAP;
    const startX = (petSize - totalW) / 2 + DOT_R;
    const dotY = DOT_R + 4;
    for (let i = 0; i < count; i++) {
      const cx = startX + i * (DOT_R * 2 + DOT_GAP);
      const dx = px - cx;
      const dy = py - dotY;
      if (dx * dx + dy * dy < DOT_R * 2 * (DOT_R * 2)) {
        return i;
      }
    }
    return -1;
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  let lastTime = 0;

  function render(time) {
    requestAnimationFrame(render);
    if (!assetsReady) {
      return;
    }

    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    ctx.clearRect(0, 0, petSize, petSize);

    // Background
    if (bgImg) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, 0, 0, petSize, petSize);
      ctx.globalAlpha = 1.0;
    }

    // Screen shake offset
    let ox = 0,
      oy = 0;
    if (shakeIntensity > 0) {
      shakeIntensity = Math.max(0, shakeIntensity - SHAKE_DECAY * delta);
      ox = (Math.random() - 0.5) * shakeIntensity;
      oy = (Math.random() - 0.5) * shakeIntensity;
    }

    // Sprite from atlas
    if (atlasImg) {
      const cfg = ANIM_CONFIG[currentAnim];
      const fw = atlasImg.naturalWidth / ATLAS_COLS;
      const fh = atlasImg.naturalHeight / ATLAS_ROWS;
      const sx = currentFrame * fw;
      const sy = cfg.row * fh;
      ctx.drawImage(atlasImg, sx, sy, fw, fh, ox, oy, petSize, petSize);
    }

    // Border overlay
    if (bordersImg) {
      ctx.drawImage(bordersImg, 0, 0, petSize, petSize);
    }

    // Session dots
    drawDots(time);

    // Flash overlay
    if (flashIntensity > 0) {
      flashIntensity = Math.max(0, flashIntensity - delta * flashDecay);
      ctx.fillStyle = `rgba(${Math.round(flashR * 255)},${Math.round(flashG * 255)},${Math.round(flashB * 255)},${flashIntensity.toFixed(3)})`;
      ctx.fillRect(0, 0, petSize, petSize);
    }

    // Particles
    if (particleLife > 0) {
      particleLife -= delta;
      const opacity = Math.max(0, particleLife / PARTICLE_DUR);
      ctx.globalAlpha = opacity;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const v = particleVel[i];
        if (!v) {
          continue;
        }
        particlePos[i * 2] += v.vx * delta;
        particlePos[i * 2 + 1] += v.vy * delta;
        v.vy += v.gravity * delta;
        const c = particleCol[i];
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(particlePos[i * 2] - 2, particlePos[i * 2 + 1] - 2, 5, 5);
      }
      ctx.globalAlpha = 1.0;
    }

    // Advance animation frame
    const cfg = ANIM_CONFIG[currentAnim];
    frameTimer += delta;
    if (frameTimer >= 1 / cfg.fps) {
      frameTimer = 0;
      currentFrame++;
      if (currentFrame >= cfg.frames) {
        if (cfg.loop) {
          currentFrame = 0;
        } else if (remainingLoops > 0) {
          remainingLoops--;
          currentFrame = 0;
        } else {
          currentFrame = cfg.frames - 1;
          if (!pendingIdle) {
            pendingIdle = true;
            setTimeout(() => {
              pendingIdle = false;
              playAnim(anySessionActive ? 'typing' : 'sleeping');
            }, 300);
          }
        }
      }
    }
  }

  requestAnimationFrame(render);

  // ── Message handling ──────────────────────────────────────────────────────
  window.addEventListener('message', async (e) => {
    const msg = e.data;
    switch (msg.command) {
      case 'init': {
        resize(msg.size || 200);
        [atlasImg, bordersImg, bgImg] = await Promise.all([
          loadImage(msg.assets.spriteAtlas),
          loadImage(msg.assets.borders),
          loadImage(msg.assets.bg),
        ]);
        assetsReady = true;
        playAnim('sleeping');

        // Restore saved position
        if (msg.state && typeof msg.state.petX === 'number') {
          applyPosition(msg.state.petX, msg.state.petY);
        } else {
          defaultPosition();
        }
        break;
      }

      case 'peon-event': {
        const anim = msg.anim;
        if (anim === 'waking' && currentAnim !== 'sleeping') {
          break;
        }
        playAnim(anim);
        break;
      }

      case 'session-update': {
        currentSessions = msg.sessions || [];
        const wasActive = anySessionActive;
        anySessionActive = currentSessions.some((s) => s.hot);
        if (anySessionActive && !wasActive && currentAnim === 'sleeping') {
          playAnim('typing');
        }
        break;
      }

      case 'reinit': {
        // Character/size change
        assetsReady = false;
        resize(msg.size || petSize);
        [atlasImg, bordersImg, bgImg] = await Promise.all([
          loadImage(msg.assets.spriteAtlas),
          loadImage(msg.assets.borders),
          loadImage(msg.assets.bg),
        ]);
        assetsReady = true;
        playAnim('sleeping');
        break;
      }
    }
  });

  // ── Tooltip ───────────────────────────────────────────────────────────────
  canvas.addEventListener('mousemove', (e) => {
    const px = e.offsetX,
      py = e.offsetY;
    const idx = hitTestDots(px, py);
    let html;
    if (idx >= 0) {
      const s = currentSessions[idx];
      const status = s.hot
        ? '<span style="color:#44ff44">active</span>'
        : s.warm
          ? '<span style="color:#1aaa1a">idle</span>'
          : '<span style="color:#555">cold</span>';
      const label = s.cwd ? s.cwd.split('/').filter(Boolean).pop() : '…' + s.id.slice(-8);
      html = `${label} &bull; ${status}`;
    } else if (currentSessions.length === 0) {
      html = 'Peon Pet';
    } else {
      const names = currentSessions
        .map((s) => (s.cwd ? s.cwd.split('/').filter(Boolean).pop() : null))
        .filter(Boolean);
      html = names.length
        ? names.join('<br>')
        : `${currentSessions.filter((s) => s.hot).length}/${currentSessions.length} sessions`;
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    // Clamp tooltip inside the webview
    const bodyW = document.body.clientWidth;
    const bodyH = document.body.clientHeight;
    const rect = container.getBoundingClientRect();
    const absX = rect.left + px;
    const absY = rect.top + py;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    tooltip.style.left = Math.min(absX + 8, bodyW - tw - 4) + 'px';
    tooltip.style.top = Math.min(absY + 8, bodyH - th - 4) + 'px';
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  // ── Drag to reposition ────────────────────────────────────────────────────
  let dragging = false;
  let dragOffX = 0,
    dragOffY = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) {
      return;
    }
    dragging = true;
    dragOffX = e.clientX - container.getBoundingClientRect().left;
    dragOffY = e.clientY - container.getBoundingClientRect().top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) {
      return;
    }
    applyPosition(e.clientX - dragOffX, e.clientY - dragOffY);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    const left = parseInt(container.style.left, 10) || 0;
    const top = parseInt(container.style.top, 10) || 0;
    saveState(left, top);
  });

  function applyPosition(x, y) {
    const maxX = Math.max(0, document.body.clientWidth - petSize);
    const maxY = Math.max(0, document.body.clientHeight - petSize);
    container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  }

  function defaultPosition() {
    const x = 10;
    const y = Math.max(0, document.body.clientHeight - petSize - 10);
    applyPosition(x, y);
  }

  function saveState(x, y) {
    vscodeApi.setState({ petX: x, petY: y });
    vscodeApi.postMessage({ command: 'save-state', state: { petX: x, petY: y } });
  }

  // Notify extension that webview is ready
  vscodeApi.postMessage({ command: 'ready' });
})();
