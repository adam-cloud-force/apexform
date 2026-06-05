const STORAGE_KEY = 'apexform_v1';

const defaultState = () => ({
  exercises: { 1: { sets: [], done: false }, 2: { sets: [], done: false }, 3: { sets: [], done: false }, 4: { sets: [], done: false } },
  supps: { d3: false, cr: false, hy: false },
  completedDates: [],
  streak: 0,
  joined: false,
  lastActiveDate: null,
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
const todayKey = () => new Date().toISOString().slice(0, 10);

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ── PAGE NAV ──
function showPage(name, closeNav = true) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-links [data-nav]').forEach((b) => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const navBtn = document.querySelector(`[data-nav="${name}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
    navBtn.setAttribute('aria-current', 'page');
  }
  window.scrollTo(0, 0);
  if (closeNav) document.querySelector('nav')?.classList.remove('open');
  history.replaceState(null, '', '#' + name);
}

function showArticle(id, btn) {
  document.querySelectorAll('.research-article').forEach((a) => a.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav li button').forEach((b) => b.classList.remove('active'));
  const article = document.getElementById('article-' + id);
  if (article) article.classList.add('active');
  if (btn) btn.classList.add('active');
}

function openResearch(articleId) {
  showPage('research');
  const btn = document.querySelector(`.sidebar-nav button[data-article="${articleId}"]`);
  if (btn) showArticle(articleId, btn);
}

// ── NAV MOBILE ──
document.getElementById('nav-toggle')?.addEventListener('click', () => {
  document.querySelector('nav')?.classList.toggle('open');
});

// ── HASH ROUTING ──
const validPages = ['home', 'research', 'tracker', 'forum'];
function initRoute() {
  const hash = (location.hash || '#home').slice(1).split('/')[0];
  if (validPages.includes(hash)) showPage(hash, false);
  const article = (location.hash || '').match(/research\/(\w+)/)?.[1];
  if (article) openResearch(article);
}
window.addEventListener('hashchange', initRoute);

// ── WEEK GRID ──
function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const now = new Date();
  const todayIdx = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - todayIdx);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const isToday = key === todayKey();
    const done = state.completedDates.includes(key);
    const el = document.createElement('div');
    el.className = 'week-day' + (done ? ' done' : '') + (isToday ? ' today' : '');
    el.innerHTML = `<div class="wd-name">${days[i]}</div><div class="wd-num">${d.getDate()}</div><div class="wd-check">${done ? '✓' : isToday ? '●' : ''}</div>`;
    grid.appendChild(el);
  }
}

// ── EXERCISES ──
function applyExerciseUI() {
  for (let id = 1; id <= 4; id++) {
    const ex = state.exercises[id];
    const card = document.getElementById('ex-' + id);
    const check = document.getElementById('excheck-' + id);
    if (!card) continue;
    card.classList.toggle('completed', ex.done);
    check.textContent = ex.done ? '✓' : '';
    document.querySelectorAll(`#sets-${id} .set-dot`).forEach((dot, idx) => {
      dot.classList.toggle('done', ex.sets.includes(idx + 1));
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
  saveState(state);
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
  saveState(state);
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
  const today = todayKey();
  const hasToday = dates.includes(today);
  if (!hasToday) cursor.setDate(cursor.getDate() - 1);
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
      state.streak = computeStreak();
      showToast('Routine complete — streak updated');
      renderWeekGrid();
    }
  } else {
    state.completedDates = state.completedDates.filter((d) => d !== key);
    state.streak = computeStreak();
    renderWeekGrid();
  }
  document.getElementById('streak-count').textContent = state.streak || (allExercisesDone() ? 1 : 0);
}

function resetToday() {
  state.exercises = defaultState().exercises;
  state.supps = defaultState().supps;
  state.completedDates = state.completedDates.filter((d) => d !== todayKey());
  state.streak = computeStreak();
  applyExerciseUI();
  applySuppsUI();
  renderWeekGrid();
  saveState(state);
  showToast('Today reset');
}

// ── SUPPS ──
function applySuppsUI() {
  ['d3', 'cr', 'hy'].forEach((id) => {
    document.getElementById('supp-' + id)?.classList.toggle('taken', state.supps[id]);
  });
}

function toggleSupp(id) {
  state.supps[id] = !state.supps[id];
  applySuppsUI();
  saveState(state);
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

// ── MODAL ──
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
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.getElementById('join-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('join-email')?.value?.trim();
  if (!email) return;
  const list = JSON.parse(localStorage.getItem('apexform_waitlist') || '[]');
  if (!list.includes(email)) list.push(email);
  localStorage.setItem('apexform_waitlist', JSON.stringify(list));
  state.joined = true;
  saveState(state);
  closeModal('modal-join');
  showToast("You're on the list — we'll be in touch");
  e.target.reset();
});

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── POST CARDS → forum ──
document.querySelectorAll('.post-card[data-goto]').forEach((card) => {
  card.addEventListener('click', () => showPage('forum'));
});

// ── INIT ──
if (state.lastActiveDate && state.lastActiveDate !== todayKey()) {
  state.exercises = defaultState().exercises;
  state.supps = defaultState().supps;
}
state.lastActiveDate = todayKey();
state.streak = computeStreak();
saveState(state);

applyExerciseUI();
applySuppsUI();
renderWeekGrid();
document.getElementById('streak-count').textContent = state.streak;

const scmWeeks = Math.min(12, Math.max(1, state.completedDates.length));
const scmBar = document.getElementById('scm-bar');
const scmPct = document.getElementById('scm-pct');
if (scmBar) scmBar.style.width = Math.round((scmWeeks / 12) * 100) + '%';
if (scmPct) scmPct.textContent = `Week ${scmWeeks} of 12`;

initRoute();

// Expose for inline handlers
window.showPage = showPage;
window.showArticle = showArticle;
window.openResearch = openResearch;
window.toggleSet = toggleSet;
window.toggleEx = toggleEx;
window.toggleSupp = toggleSupp;
window.resetToday = resetToday;
window.openModal = openModal;
