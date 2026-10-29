import { cases } from './case-data.js?v=f93fd7af506a';
import { initSystems } from './systems.js';

const root = document.documentElement;
root.classList.add('js');
let requestCanvasFrame = () => {};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let userMotion = null;
try {
  const saved = localStorage.getItem('rb-motion');
  if (saved === 'on' || saved === 'off') userMotion = saved;
} catch { /* A preference is optional when browser storage is unavailable. */ }
let motionOff = userMotion === 'off' || (userMotion !== 'on' && reducedMotion.matches);

function enhance(name, initialize) {
  try { initialize(); }
  catch (error) { console.warn(`${name} enhancement unavailable; static content remains usable.`, error); }
}

enhance('Motion controls', () => {
  const buttons = document.querySelectorAll('.motion-toggle');
  function updateMotion() {
    motionOff = userMotion === 'off' || (userMotion !== 'on' && reducedMotion.matches);
    root.classList.toggle('motion-off', motionOff);
    root.classList.toggle('motion-explicit-on', userMotion === 'on');
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(motionOff));
      button.querySelector('[data-motion-state]').textContent = motionOff ? 'on' : 'off';
    });
    requestCanvasFrame();
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    userMotion = motionOff ? 'on' : 'off';
    try { localStorage.setItem('rb-motion', userMotion); } catch { /* No persistence required. */ }
    updateMotion();
  }));
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', updateMotion);
  else reducedMotion.addListener?.(updateMotion);
  updateMotion();
  root.classList.add('motion-ready');
});

enhance('Content entrances', () => {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  root.classList.add('reveal-ready');
});

enhance('Navigation', () => {
  const button = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#mobile-nav');
  function close({ restoreFocus = false } = {}) {
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
    navigation.hidden = true;
    if (wasOpen && restoreFocus) button.focus({ preventScroll: true });
  }
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.hidden = !open;
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  addEventListener('keydown', event => { if (event.key === 'Escape') close({ restoreFocus: true }); });
  const desktop = matchMedia('(min-width: 601px)');
  desktop.addEventListener?.('change', event => { if (event.matches) close(); });
  root.classList.add('nav-ready');
});

enhance('Reading progress', () => {
  const progress = document.querySelector('.read-progress');
  let queued = false;
  const update = () => {
    const length = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${length > 0 ? Math.min(1, scrollY / length) : 0})`;
    queued = false;
  };
  addEventListener('scroll', () => {
    if (!queued) { requestAnimationFrame(update); queued = true; }
  }, { passive: true });
  addEventListener('resize', update);
  document.querySelectorAll('.timeline details').forEach(detail => detail.addEventListener('toggle', update));
  addEventListener('portfolio-filter', update);
  update();
});

let setProjectFilter = () => {};
enhance('Project filters', () => {
  const buttons = document.querySelectorAll('[data-filter]');
  setProjectFilter = filter => {
    let count = 0;
    buttons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-category]').forEach(project => {
      const visible = filter === 'all' || project.dataset.category === filter;
      project.hidden = !visible;
      if (visible) { count++; project.classList.add('visible'); }
    });
    const pair = document.querySelector('.project-pair');
    const visible = [...pair.children].filter(project => !project.hidden);
    pair.hidden = visible.length === 0;
    pair.classList.toggle('single-project', visible.length === 1);
    document.querySelector('#filter-status').textContent = `Showing ${count} ${count === 1 ? 'project' : 'projects'}`;
    dispatchEvent(new Event('portfolio-filter'));
  };
  buttons.forEach(button => button.addEventListener('click', () => setProjectFilter(button.dataset.filter)));
  document.querySelectorAll('[data-work-jump]').forEach(link => link.addEventListener('click', () => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target?.hidden) setProjectFilter('all');
    target?.classList.add('visible');
  }));
  root.classList.add('filters-ready');
});

enhance('Case studies', () => {
  const dialog = document.querySelector('#case-dialog');
  if (typeof dialog.showModal !== 'function') return;
  const content = document.querySelector('#case-content');
  const defaultTitle = document.title;
  let trigger = null;
  let skipHistoryOnClose = false;
  let pendingReturnFocus = null;
  function render(key, source = null) {
    const item = cases[key];
    if (!Object.hasOwn(cases, key)) return false;
    trigger = source || document.querySelector(`[data-case="${key}"]`);
    const project = trigger?.closest('[data-category]');
    if (project?.hidden) setProjectFilter('all');
    project?.classList.add('visible');
    content.innerHTML = `<p class="eyebrow">${item.category}</p><h2 id="case-title">${item.title}</h2><p class="case-lead">${item.lead}</p>${item.body}<p class="case-tags">${item.tags}</p>${item.links ? `<div class="case-links">${item.links.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}</div>` : ''}`;
    document.querySelector('.dialog-full-case').href = `work/${item.slug || key}/`;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    document.querySelector('.dialog-close').focus({ preventScroll: true });
    document.title = `${item.title.replace(/<[^>]+>/g, ' ')} | Ruslan Botashev`;
    return true;
  }
  function syncLocation() {
    const key = new URL(location.href).searchParams.get('case');
    if (key && Object.hasOwn(cases, key)) render(key);
    else if (dialog.open) { skipHistoryOnClose = true; dialog.close(); }
  }
  document.querySelectorAll('[data-case]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!render(link.dataset.case, link)) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.searchParams.set('case', link.dataset.case);
    history.pushState({ ...history.state, rbCaseEntry: true }, '', url);
  }));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    document.title = defaultTitle;
    if (skipHistoryOnClose) { skipHistoryOnClose = false; trigger?.focus({ preventScroll: true }); return; }
    const url = new URL(location.href);
    if (!url.searchParams.has('case')) { trigger?.focus({ preventScroll: true }); return; }
    if (history.state?.rbCaseEntry) { pendingReturnFocus = trigger; history.back(); }
    else {
      url.searchParams.delete('case');
      history.replaceState(history.state, '', url);
      trigger?.focus({ preventScroll: true });
    }
  });
  addEventListener('popstate', () => {
    syncLocation();
    const target = pendingReturnFocus;
    pendingReturnFocus = null;
    // History traversal can restore document focus after popstate dispatch.
    if (target) setTimeout(() => { if (!dialog.open && target.isConnected) target.focus({ preventScroll: true }); }, 0);
  });
  syncLocation();
});

enhance('Contact copy', () => {
  document.querySelector('.copy-email').addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    try { await navigator.clipboard.writeText('mail@ruslanbotashev.com'); status.textContent = 'Copied.'; }
    catch { status.textContent = 'Select the email above to copy it.'; }
    setTimeout(() => { status.textContent = ''; }, 4000);
  });
});

enhance('Conceptual systems study', () => {
  initSystems({
    isMotionOff: () => motionOff,
    registerFrameRequest: callback => { requestCanvasFrame = callback; root.classList.add('canvas-ready'); }
  });
});
