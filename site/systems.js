// An original conceptual study, not production telemetry or a measured simulation.
export function initSystems({ isMotionOff = () => false, registerFrameRequest = () => {} } = {}) {
  const canvas = document.querySelector('#systems-canvas');
  const study = canvas?.closest('.system-study');
  if (!canvas || !study) return;
  let ctx;
  try { ctx = canvas.getContext('2d'); } catch { return; }
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const COUNT = 168;
  const GROUP = 56;
  const RING = 14;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const ease = value => value * value * (3 - 2 * value);
  const mix = (a, b, amount) => a + (b - a) * amount;
  const pointBetween = (a, b, amount) => ({ x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount), z: mix(a.z, b.z, amount) });
  const targets = [[], [], []];
  const edges = [[], [], []];

  for (let i = 0; i < COUNT; i++) {
    const group = Math.floor(i / GROUP);
    const local = i % GROUP;
    const band = Math.floor(local / RING);
    const segment = local % RING;
    const angle = segment / RING * TAU;
    const radius = band % 2 ? .88 : 1.08;
    // Three decks: a common operation layer connects clients to many workflows.
    targets[0].push({ x: Math.cos(angle) * radius, y: (group - 1) * .70 + (band - 1.5) * .035, z: Math.sin(angle) * radius * .62 });
    // A globe with latitude and longitude connections, rather than arbitrary traffic.
    const latitude = -.5 * Math.PI + .14 + Math.floor(i / 24) / 6 * (Math.PI - .28);
    const longitude = i % 24 / 24 * TAU;
    targets[1].push({ x: Math.cos(longitude) * Math.cos(latitude) * .94, y: Math.sin(latitude) * .94, z: Math.sin(longitude) * Math.cos(latitude) * .94 });
    // Three small wire cages form an explicit build / validate / release pipeline.
    targets[2].push({ x: (group - 1) * 1.05 + (band - 1.5) * .12, y: Math.cos(angle) * .32, z: Math.sin(angle) * .32 });
    for (const mode of [0, 2]) {
      edges[mode].push([i, group * GROUP + band * RING + (segment + 1) % RING]);
      if (band < 3) edges[mode].push([i, i + RING]);
    }
    const row = Math.floor(i / 24);
    edges[1].push([i, row * 24 + (i % 24 + 1) % 24]);
    if (row < 6) edges[1].push([i, i + 24]);
  }

  let width = 0, height = 0, frameId = 0, inView = false;
  let mode = 0, labelMode = 0, transition = null;
  let elapsed = 0, modeTime = 0, lastTime = 0;
  let yaw = -.22, pitch = -.16;
  let pointer = { x: 0, y: 0 }, easedPointer = { x: 0, y: 0 };
  let positions = targets[0].map(point => ({ ...point }));
  let topology = [1, 0, 0];
  const captions = [
    'REUSABLE OPERATIONS.<br>COMPOSED INTO SOMETHING BIGGER.',
    'CONNECTED SIGNALS.<br>COORDINATED RECOVERY.',
    'FROM BUILD TO RELEASE.<br>WITH GUARDRAILS ALONG THE WAY.'
  ];
  const caption = document.querySelector('#study-label');
  const buttons = Array.from(study.querySelectorAll('[data-mode]'));
  const hasFrame = typeof window.requestAnimationFrame === 'function';
  const safeArea = () => ({ top: 66, bottom: Math.max(186, height - 157) });
  function project(point) {
    const area = safeArea();
    const scale = Math.min(width * .29, (area.bottom - area.top) * .48);
    const ry = yaw + easedPointer.x * .18;
    const rx = pitch + easedPointer.y * .12;
    const x = point.x * Math.cos(ry) + point.z * Math.sin(ry);
    const z = point.z * Math.cos(ry) - point.x * Math.sin(ry);
    const y = point.y * Math.cos(rx) - z * Math.sin(rx);
    const depth = point.y * Math.sin(rx) + z * Math.cos(rx);
    const perspective = 5 / (5 + depth);
    return { x: width * .5 + x * scale * perspective, y: (area.top + area.bottom) * .5 + y * scale * perspective, z: depth, s: perspective };
  }
  function line(a, b, alpha = .3, lineWidth = 1) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(190,217,149,${clamp(alpha)})`; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function dot(point, radius = 2.6, alpha = 1) {
    ctx.beginPath(); ctx.arc(point.x, point.y, radius + 4, 0, TAU);
    ctx.fillStyle = `rgba(204,238,162,${alpha * .08})`; ctx.fill();
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, TAU);
    ctx.fillStyle = `rgba(224,248,187,${alpha})`; ctx.fill();
  }
  function halo(point, progress, alpha) {
    ctx.beginPath(); ctx.arc(point.x, point.y, 5 + ease(progress) * 10, 0, TAU);
    ctx.strokeStyle = `rgba(204,238,162,${alpha * (1 - progress) * .65})`; ctx.lineWidth = 1; ctx.stroke();
  }
  function route(a, b, alpha) { line(project(a), project(b), alpha * .28); }
  function packet(a, b, progress, alpha) {
    const amount = ease(clamp(progress));
    const head = project(pointBetween(a, b, amount));
    const tail = project(pointBetween(a, b, Math.max(0, amount - .12)));
    line(tail, head, alpha * .85, 1.5); dot(head, 2.5, alpha);
  }
  function drawBehavior(alpha) {
    if (alpha < .01) return;
    if (mode === 0) {
      const inputs = [-.72, 0, .72].map(x => ({ x, y: -.70, z: .10 }));
      const operation = { x: 0, y: 0, z: .10 };
      const outputs = [-.72, 0, .72].map(x => ({ x, y: .70, z: .10 }));
      const time = modeTime % 7.6;
      inputs.forEach(input => route(input, operation, alpha));
      outputs.forEach(output => route(operation, output, alpha));
      dot(project(operation), 3, alpha * .9);
      if (time < 2.2) inputs.forEach(input => packet(input, operation, time / 2.2, alpha));
      else if (time < 3.2) halo(project(operation), time - 2.2, alpha);
      else if (time < 5.5) outputs.forEach(output => packet(operation, output, (time - 3.2) / 2.3, alpha));
      else outputs.forEach(output => dot(project(output), 2, alpha * .6));
    } else if (mode === 1) {
      const signals = [{ x: -.65, y: -.42, z: .51 }, { x: .56, y: -.58, z: .42 }, { x: -.44, y: .57, z: .53 }];
      const correlation = { x: 0, y: 0, z: .20 };
      const recovery = { x: .73, y: .35, z: .46 };
      const time = modeTime % 8;
      signals.forEach(signal => route(signal, correlation, alpha));
      route(correlation, recovery, alpha);
      dot(project(correlation), 3, alpha * .9);
      if (time < 2.5) signals.forEach((signal, i) => packet(signal, correlation, (time - i * .15) / 2.2, alpha));
      else if (time < 3.7) halo(project(correlation), (time - 2.5) / 1.2, alpha);
      else if (time < 6) packet(correlation, recovery, (time - 3.7) / 2.3, alpha);
      else dot(project(recovery), 2.5, alpha * .75);
    } else {
      const build = { x: -1.05, y: 0, z: 0 };
      const validation = { x: 0, y: 0, z: 0 };
      const release = { x: 1.05, y: 0, z: 0 };
      const gate = project(validation);
      const time = modeTime % 9;
      route(build, validation, alpha); route(validation, release, alpha);
      // A visible stationary hold separates validation from onward release.
      if (time < 2.4) packet(build, validation, time / 2.4, alpha);
      else if (time < 4.8) {
        dot(gate, 3, alpha);
        halo(gate, (time - 2.4) % 1.2 / 1.2, alpha);
      } else if (time < 7.1) packet(validation, release, (time - 4.8) / 2.3, alpha);
      else dot(project(release), 2.5, alpha * .75);
      const held = time < 4.8;
      if (held) {
        line({ x: gate.x - 5, y: gate.y - 10 }, { x: gate.x - 5, y: gate.y + 10 }, alpha * .75, 1.4);
        line({ x: gate.x + 5, y: gate.y - 10 }, { x: gate.x + 5, y: gate.y + 10 }, alpha * .75, 1.4);
      } else {
        line({ x: gate.x - 5, y: gate.y }, { x: gate.x - 1, y: gate.y + 4 }, alpha * .7);
        line({ x: gate.x - 1, y: gate.y + 4 }, { x: gate.x + 7, y: gate.y - 5 }, alpha * .7);
      }
    }
  }
  function label(text, x, y, alpha, align = 'left') {
    const area = safeArea();
    ctx.font = '10px SFMono-Regular,Consolas,monospace';
    const textWidth = ctx.measureText(text).width;
    const left = clamp(align === 'center' ? x - textWidth * .5 : x, 18, width - textWidth - 18);
    const baseline = clamp(y, area.top + 10, area.bottom - 3);
    ctx.fillStyle = `rgba(32,37,31,${alpha * .88})`; ctx.fillRect(left - 5, baseline - 11, textWidth + 10, 16);
    ctx.fillStyle = `rgba(196,214,171,${alpha})`; ctx.fillText(text, left, baseline);
  }
  function drawLabels(alpha) {
    if (alpha < .01) return;
    if (labelMode === 0) {
      ['CLIENTS', 'OPERATIONS', 'WORKFLOWS'].forEach((text, i) => {
        const anchor = project({ x: -.95, y: (i - 1) * .70, z: -.05 });
        label(text, Math.max(23, anchor.x - 38), anchor.y - 7, alpha);
      });
    } else if (labelMode === 1) {
      const area = safeArea();
      label('SIGNALS', width * .14, area.top + 24, alpha);
      label('CORRELATE', width * .50, (area.top + area.bottom) * .5 - 17, alpha, 'center');
      label('RECOVERY', width * .70, area.bottom - 13, alpha, 'center');
    } else {
      ['BUILD', 'VALIDATE', 'RELEASE'].forEach((text, i) => {
        const anchor = project({ x: (i - 1) * 1.05, y: .47, z: 0 });
        label(text, anchor.x, anchor.y + 10, alpha, 'center');
      });
    }
  }
  function draw(time) {
    frameId = 0;
    if (!inView || document.hidden || !width || !height) { lastTime = 0; return; }
    const paused = isMotionOff() || !hasFrame;
    const delta = !paused && lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = paused ? 0 : time;
    if (!paused) { elapsed += delta; if (!transition) modeTime += delta; }
    const damping = 1 - Math.exp(-delta * 4);
    if (!paused) {
      easedPointer.x = mix(easedPointer.x, pointer.x, damping);
      easedPointer.y = mix(easedPointer.y, pointer.y, damping);
      yaw = mix(yaw, mode === 1 ? -.2 + Math.sin(elapsed * .10) * .55 : -.22 + Math.sin(elapsed * .16) * .055, damping);
      pitch = mix(pitch, mode === 1 ? -.12 : -.16, damping);
    }
    let labelAlpha = 1, behaviorAlpha = 1;
    if (transition) {
      transition.progress = paused ? 1 : clamp(transition.progress + delta / 1.15);
      const amount = ease(transition.progress);
      positions = transition.positions.map((point, i) => pointBetween(point, targets[mode][i], amount));
      topology = transition.topology.map((weight, i) => mix(weight, i === mode ? 1 : 0, amount));
      labelAlpha = Math.abs(transition.progress - .5) * 2;
      behaviorAlpha = ease(clamp((transition.progress - .70) / .30));
      if (transition.progress >= .5 && labelMode !== mode) { labelMode = mode; if (caption) caption.innerHTML = captions[mode]; }
      if (transition.progress === 1) { transition = null; modeTime = 0; labelAlpha = 1; behaviorAlpha = 1; }
    }
    ctx.clearRect(0, 0, width, height);
    const area = safeArea();
    const glow = ctx.createRadialGradient(width * .5, (area.top + area.bottom) * .5, 0, width * .5, (area.top + area.bottom) * .5, width * .50);
    glow.addColorStop(0, 'rgba(132,164,88,.10)'); glow.addColorStop(1, 'rgba(32,37,31,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, area.top - 4, width, area.bottom - area.top + 14);
    ctx.strokeStyle = 'rgba(165,186,124,.035)'; ctx.lineWidth = .5;
    for (let x = 20; x < width; x += 38) { ctx.beginPath(); ctx.moveTo(x, area.top); ctx.lineTo(x, area.bottom); ctx.stroke(); }
    for (let y = area.top; y < area.bottom; y += 38) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(width - 20, y); ctx.stroke(); }
    const projected = positions.map(project);
    topology.forEach((weight, topologyMode) => {
      if (weight < .005) return;
      edges[topologyMode].forEach(([a, b]) => {
        const p = projected[a], q = projected[b];
        line(p, q, Math.max(.055, .20 - (p.z + q.z) * .055) * weight, .65);
      });
    });
    projected.forEach((point, i) => {
      const bright = i % RING === 0;
      ctx.beginPath(); ctx.arc(point.x, point.y, (bright ? 1.9 : .95) * point.s, 0, TAU);
      ctx.fillStyle = `rgba(${bright ? '214,239,173' : '158,184,123'},${clamp((bright ? .82 : .45) - point.z * .12)})`; ctx.fill();
    });
    drawBehavior(behaviorAlpha);
    drawLabels(labelAlpha);
    if (!paused) frameId = window.requestAnimationFrame(draw);
  }
  function requestCanvasFrame() {
    if (frameId || !inView || document.hidden) return;
    if (hasFrame) frameId = window.requestAnimationFrame(draw);
    else draw(0);
  }
  registerFrameRequest(requestCanvasFrame);
  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0; lastTime = 0;
  }
  function setVisibility(visible) {
    if (inView === visible) return;
    inView = visible;
    if (visible) { lastTime = 0; requestCanvasFrame(); } else stop();
  }
  function checkVisibility() {
    const rect = canvas.getBoundingClientRect();
    setVisibility(rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    checkVisibility(); requestCanvasFrame();
  }
  let observedResize = false, observedVisibility = false;
  try {
    if (typeof ResizeObserver === 'function') { new ResizeObserver(resize).observe(canvas); observedResize = true; }
  } catch { /* The window resize fallback keeps the drawing useful. */ }
  try {
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => setVisibility(entries[0].isIntersecting), { threshold: .01 }).observe(canvas);
      observedVisibility = true;
    }
  } catch { /* A passive scroll fallback still suspends offscreen work. */ }
  if (!observedResize) window.addEventListener('resize', resize, { passive: true });
  if (!observedVisibility) {
    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else { checkVisibility(); lastTime = 0; requestCanvasFrame(); }
  });
  study.addEventListener('pointermove', event => {
    if (isMotionOff() || event.pointerType === 'touch') return;
    const rect = study.getBoundingClientRect();
    pointer = { x: clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5), y: clamp((event.clientY - rect.top) / rect.height - .5, -.5, .5) };
  });
  study.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
  buttons.forEach(button => button.addEventListener('click', () => {
    const nextMode = Number(button.dataset.mode);
    if (!Number.isInteger(nextMode) || nextMode < 0 || nextMode > 2) return;
    modeTime = 0;
    if (nextMode !== mode) {
      mode = nextMode;
      transition = { progress: 0, positions: positions.map(point => ({ ...point })), topology: topology.slice() };
    }
    buttons.forEach(tab => { const active = Number(tab.dataset.mode) === mode; tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active)); });
    requestCanvasFrame();
  }));
  resize();
}
