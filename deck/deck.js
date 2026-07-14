/* Temporal Fixer — deck runtime.
   Owns: slide manifest loading, keyboard/hash navigation, progress, and
   per-slide interaction hooks (registered by slide markup via data-* attrs). */

const MANIFEST = [
  { file: '01-title.html',       title: 'Image models edit, video models fix' },
  { file: '02-task.html',        title: 'Task' },
  { file: '03-challenge.html',   title: 'Challenge' },
  { file: '04-insight-a.html',   title: 'Insight I — decomposition' },
  { file: '05-insight-b.html',   title: 'Insight II — the system, not the module' },
  { file: '06-novelty.html',     title: 'Novelty & positioning' },
  { file: '07-eval.html',        title: 'New evaluation protocol' },
  { file: '08-pipeline.html',    title: 'Architecture & pipeline' },
  { file: '09-algorithm.html',   title: 'Algorithm' },
  { file: '10-data.html',        title: 'Training-data engine' },
  { file: '11-stages.html',      title: 'Stages, checkpoints & gates' },
  { file: '12-risks.html',       title: 'Risks & contingencies' },
  { file: '13-evidence.html',    title: 'Evidence so far' },
  { file: '14-demo.html',        title: 'Examples' },
  { file: '15-summary.html',     title: 'Summary' }
];

const stage = document.getElementById('stage');
const wrap = document.getElementById('stage-wrap');
const counter = document.getElementById('counter');
const titleEl = document.getElementById('slide-title');
const progress = document.getElementById('progress');

let index = 0;

function fit() {
  const pad = 64;
  const k = Math.min(
    (window.innerWidth - pad) / 1280,
    (window.innerHeight - pad - 30) / 720
  );
  wrap.style.transform = `scale(${Math.max(k, 0.2)})`;
}

function render(i, push = true) {
  index = Math.max(0, Math.min(MANIFEST.length - 1, i));
  [...stage.children].forEach((el, n) => el.classList.toggle('is-active', n === index));
  counter.textContent = `${index + 1} / ${MANIFEST.length}`;
  titleEl.textContent = MANIFEST[index].title;
  progress.style.width = `${((index + 1) / MANIFEST.length) * 100}%`;
  if (push) history.replaceState(null, '', `#${index + 1}`);
  const active = stage.children[index];
  if (active) active.querySelectorAll('video[data-autoplay]').forEach(v => v.play().catch(() => {}));
  [...stage.children].forEach((el, n) => {
    if (n !== index) el.querySelectorAll('video').forEach(v => v.pause());
  });
}

/* --- interaction hooks: bound after slides are injected --- */
function bindInteractions(root) {
  // Selector groups: [data-select-group] holds buttons with data-target;
  // panels with data-panel are shown/hidden accordingly.
  root.querySelectorAll('[data-select-group]').forEach(group => {
    const buttons = group.querySelectorAll('[data-target]');
    const scope = group.closest('.slide') || root;
    const show = key => {
      buttons.forEach(b => b.classList.toggle('is-on', b.dataset.target === key));
      scope.querySelectorAll('[data-panel]').forEach(p => {
        p.hidden = p.dataset.panel !== key;
      });
    };
    buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.target)));
    if (buttons.length) show(buttons[0].dataset.target);
  });

  // Bar charts: animate widths from data-value against data-max.
  root.querySelectorAll('.bars').forEach(bars => {
    const max = parseFloat(bars.dataset.max || '100');
    bars.querySelectorAll('.bar-fill').forEach(f => {
      const v = parseFloat(f.dataset.value || '0');
      requestAnimationFrame(() => { f.style.width = `${Math.min(100, (v / max) * 100)}%`; });
    });
  });

  // Anchor slider (slide 09): sigma -> path illustration.
  const sl = root.querySelector('[data-sigma]');
  if (sl) {
    const out = root.querySelector('[data-sigma-out]');
    const dot = root.querySelector('[data-sigma-dot]');
    const note = root.querySelector('[data-sigma-note]');
    const upd = () => {
      const s = parseFloat(sl.value) / 100;
      out.textContent = s.toFixed(2);
      dot.style.left = `${s * 100}%`;
      note.textContent = s < 0.02
        ? 'σ → 0 : output = the clean, temporally consistent video.'
        : s > 0.85
          ? 'σ → 1 : state = the per-frame draft (+ tiny noise). This is where inference starts — not from Gaussian noise.'
          : 'Interior of the path: the model only has to travel the short distance from draft to clean. One Euler step covers it.';
    };
    sl.addEventListener('input', upd);
    upd();
  }
}

async function boot() {
  let parts;
  try {
    parts = await Promise.all(
      MANIFEST.map(m => fetch(`slides/${m.file}`).then(r => r.text()))
    );
  } catch (err) {
    stage.innerHTML = '<section class="slide is-active"><h2>Serve this deck over HTTP.</h2>' +
      '<p class="lede">The slides are separate files loaded by the runtime, so <code>file://</code> blocks them. ' +
      'Run <span class="mono">python -m http.server</span> in this folder, or open the deployed URL.</p></section>';
    return;
  }
  stage.innerHTML = parts.join('\n');
  bindInteractions(stage);
  const hash = parseInt(location.hash.replace('#', ''), 10);
  render(Number.isFinite(hash) ? hash - 1 : 0, false);
  fit();
}

document.addEventListener('keydown', e => {
  if (['ArrowRight', 'PageDown', ' ', 'l'].includes(e.key)) { render(index + 1); e.preventDefault(); }
  if (['ArrowLeft', 'PageUp', 'h'].includes(e.key)) { render(index - 1); e.preventDefault(); }
  if (e.key === 'Home') render(0);
  if (e.key === 'End') render(MANIFEST.length - 1);
});

document.getElementById('prev').addEventListener('click', () => render(index - 1));
document.getElementById('next').addEventListener('click', () => render(index + 1));
window.addEventListener('resize', fit);
window.addEventListener('hashchange', () => {
  const h = parseInt(location.hash.replace('#', ''), 10);
  if (Number.isFinite(h) && h - 1 !== index) render(h - 1, false);
});

boot();
