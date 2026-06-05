const STORAGE_KEY = 'ascend_v1';
const LEGACY_KEY = 'apexform_v1';

const defaultState = () => ({
  exercises: { 1: { sets: [], done: false }, 2: { sets: [], done: false }, 3: { sets: [], done: false }, 4: { sets: [], done: false } },
  supps: { d3: false, cr: false, hy: false },
  completedDates: [],
  streak: 0,
  displayName: '',
  threads: [],
  lastActiveDate: null,
});

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        raw = legacy;
      }
    }
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
const todayKey = () => new Date().toISOString().slice(0, 10);

function parseName(input) {
  const raw = (input || '').trim();
  if (!raw || raw.toLowerCase() === 'anonymous') {
    return { name: 'Anonymous', trip: '' };
  }
  const tripMatch = raw.match(/^(.+?)(!!.+)$/);
  if (tripMatch) {
    return { name: tripMatch[1].trim() || 'Anonymous', trip: tripMatch[2] };
  }
  return { name: raw, trip: '' };
}

function formatDisplayName() {
  const { name, trip } = parseName(state.displayName);
  return trip ? `${name}${trip}` : name;
}

function updateNameUI() {
  const el = document.getElementById('display-name');
  if (!el) return;
  const { name, trip } = parseName(state.displayName);
  if (trip) {
    el.innerHTML = `${escapeHtml(name)}<span class="post-trip">${escapeHtml(trip)}</span>`;
  } else {
    el.textContent = name;
  }
  const input = document.getElementById('input-name');
  if (input) input.value = state.displayName || '';
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatBody(text) {
  return text
    .split('\n')
    .map((line) => {
      const t = escapeHtml(line);
      if (line.trimStart().startsWith('>')) {
        return `<span class="greentext">${t}</span>`;
      }
      if (line.trim()) return `<p>${t}</p>`;
      return '';
    })
    .join('');
}

function randomPostNo() {
  return Math.floor(10000 + Math.random() * 89999);
}

function renderUserThreads() {
  const container = document.getElementById('user-threads');
  if (!container) return;
  container.innerHTML = '';
  state.threads.slice().reverse().forEach((t) => {
    const div = document.createElement('div');
    div.className = 'post forum-thread';
    div.dataset.cat = t.cat || 'progress';
    const { name, trip } = parseName(t.author);
    div.innerHTML = `
      <div class="post-head">
        <span class="post-name">${escapeHtml(name)}</span>
        ${trip ? `<span class="post-trip">${escapeHtml(trip)}</span>` : ''}
        <span class="post-no"><a href="#">&gt;&gt;${t.no}</a></span>
        <span>just now</span>
      </div>
      <div class="post-subject">${escapeHtml(t.subject)}</div>
      <div class="post-body">${formatBody(t.body)}</div>
    `;
    container.appendChild(div);
  });
}

// ── NAV ──
function showPage(name, closeNav = true) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.board-nav [data-nav]').forEach((b) => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  document.getElementById('page-' + name)?.classList.add('active');
  const navBtn = document.querySelector(`[data-nav="${name}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
    navBtn.setAttribute('aria-current', 'page');
  }
  window.scrollTo(0, 0);
  if (closeNav) document.getElementById('site-bar')?.classList.remove('open');
  history.replaceState(null, '', '#' + name);
}

function showArticle(id, btn) {
  document.querySelectorAll('.wiki-article').forEach((a) => a.classList.remove('active'));
  document.querySelectorAll('.wiki-side button').forEach((b) => b.classList.remove('active'));
  document.getElementById('article-' + id)?.classList.add('active');
  btn?.classList.add('active');
}

function openWiki(id) {
  showPage('research');
  const btn = document.querySelector(`.wiki-side button[data-article="${id}"]`);
  if (btn) showArticle(id, btn);
}

const validPages = ['home', 'research', 'tracker', 'forum'];
function initRoute() {
  const hash = (location.hash || '#home').slice(1).split('/')[0];
  if (validPages.includes(hash)) showPage(hash, false);
  const article = (location.hash || '').match(/wiki\/(\w+)/)?.[1];
  if (article) openWiki(article);
}

window.addEventListener('hashchange', initRoute);

document.getElementById('nav-toggle')?.addEventListener('click', () => {
  document.getElementById('site-bar')?.classList.toggle('open');
});

// ── WEEK ──
function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const now = new Date();
  const todayIdx = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - todayIdx);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const el = document.createElement('div');
    el.className = 'log-cell' + (state.completedDates.includes(key) ? ' done' : '') + (key === todayKey() ? ' today' : '');
    el.innerHTML = `${days[i]}<br><b>${d.getDate()}</b>`;
    grid.appendChild(el);
  }
}

// ── EXERCISES ──
function applyExerciseUI() {
  for (let id = 1; id <= 4; id++) {
    const ex = state.exercises[id];
    const row = document.getElementById('ex-' + id);
    const check = document.getElementById('excheck-' + id);
    if (!row) continue;
    row.classList.toggle('done', ex.done);
    check.textContent = ex.done ? '✓' : '';
    document.querySelectorAll(`#sets-${id} .set-dot`).forEach((dot, idx) => {
      dot.classList.toggle('on', ex.sets.includes(idx + 1));
    });
  }
  updateProgress();
}

function toggleSet(e, exId, setNum) {
  e.stopPropagation();
  const sets = state.exercises[exId].sets;
  const idx = sets.indexOf(setNum);
  if (idx > -1) sets.splice(idx, 1);
  else sets.push(setNum);
  if (sets.length === 3) markExDone(exId);
  else unmarkExDone(exId);
  applyExerciseUI();
  persistIfComplete();
  saveState();
}

function toggleEx(exId) {
  const ex = state.exercises[exId];
  if (ex.done) {
    ex.done = false;
    ex.sets = [];
  } else {
    ex.sets = [1, 2, 3];
    markExDone(exId);
  }
  applyExerciseUI();
  persistIfComplete();
  saveState();
}

function markExDone(exId) {
  state.exercises[exId].done = true;
  state.exercises[exId].sets = [1, 2, 3];
}

function unmarkExDone(exId) {
  state.exercises[exId].done = false;
}

function updateProgress() {
  const done = Object.values(state.exercises).filter((e) => e.done).length;
  const pct = Math.round((done / 4) * 100);
  const bar = document.getElementById('completion-bar');
  const label = document.getElementById('completion-pct');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

function allExercisesDone() {
  return Object.values(state.exercises).every((e) => e.done);
}

function computeStreak() {
  const dates = [...new Set(state.completedDates)].sort().reverse();
  if (!dates.length) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dates.includes(todayKey())) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (dates.includes(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function persistIfComplete() {
  const key = todayKey();
  if (allExercisesDone()) {
    if (!state.completedDates.includes(key)) {
      state.completedDates.push(key);
      showToast('>>routine complete');
      renderWeekGrid();
    }
  } else {
    state.completedDates = state.completedDates.filter((d) => d !== key);
    renderWeekGrid();
  }
  state.streak = computeStreak();
  const sc = document.getElementById('streak-count');
  if (sc) sc.textContent = state.streak;
}

function resetToday() {
  state.exercises = defaultState().exercises;
  state.supps = defaultState().supps;
  state.completedDates = state.completedDates.filter((d) => d !== todayKey());
  state.streak = computeStreak();
  applyExerciseUI();
  applySuppsUI();
  renderWeekGrid();
  saveState();
  showToast('>>reset');
}

function applySuppsUI() {
  ['d3', 'cr', 'hy'].forEach((id) => {
    const el = document.getElementById('supp-' + id);
    if (!el) return;
    el.classList.toggle('done', state.supps[id]);
    const dot = el.querySelector('.supp-dot');
    if (dot) dot.textContent = state.supps[id] ? '✓' : '';
  });
}

function toggleSupp(id) {
  state.supps[id] = !state.supps[id];
  applySuppsUI();
  saveState();
}

// ── FORUM FILTER ──
document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
    this.classList.add('active');
    const cat = this.dataset.cat;
    document.querySelectorAll('.forum-thread').forEach((thread) => {
      const threadCat = thread.dataset.cat;
      const show = cat === 'all' || threadCat === cat || thread.dataset.pinned;
      thread.classList.toggle('hidden', !show);
    });
  });
});

document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', () => showPage(el.dataset.goto));
});

// ── MODALS ──
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-open-modal]').forEach((el) => {
  el.addEventListener('click', () => openModal(el.dataset.openModal));
});
document.querySelectorAll('[data-close-modal]').forEach((el) => {
  el.addEventListener('click', () => closeModal(el.dataset.closeModal));
});
document.querySelectorAll('.modal-bg').forEach((bg) => {
  bg.addEventListener('click', (e) => {
    if (e.target === bg) closeModal(bg.id);
  });
});

document.getElementById('name-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  state.displayName = document.getElementById('input-name')?.value?.trim() || '';
  saveState();
  updateNameUI();
  closeModal('modal-name');
  showToast('>>name set');
});

document.getElementById('reply-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const subject = document.getElementById('input-subject')?.value?.trim();
  const body = document.getElementById('input-comment')?.value?.trim();
  if (!subject || !body) return;
  state.threads.push({
    no: randomPostNo(),
    subject,
    body,
    author: state.displayName || 'Anonymous',
    cat: 'progress',
    at: Date.now(),
  });
  saveState();
  renderUserThreads();
  closeModal('modal-reply');
  showPage('forum');
  e.target.reset();
  showToast('>>posted');
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── INIT ──
if (state.lastActiveDate && state.lastActiveDate !== todayKey()) {
  state.exercises = defaultState().exercises;
  state.supps = defaultState().supps;
}
state.lastActiveDate = todayKey();
state.streak = computeStreak();

applyExerciseUI();
applySuppsUI();
renderWeekGrid();
renderUserThreads();
updateNameUI();
document.getElementById('streak-count').textContent = state.streak;
saveState();
initRoute();

window.showPage = showPage;
window.showArticle = showArticle;
window.openWiki = openWiki;
window.toggleSet = toggleSet;
window.toggleEx = toggleEx;
window.toggleSupp = toggleSupp;
window.resetToday = resetToday;
window.openModal = openModal;
