'use strict';
(() => {
/* =========================================================================
   CSSBB Cards — offline flashcards and quizzes for the CSSBB exam.
   All progress is stored on the device (IndexedDB); nothing is sent anywhere.
   ========================================================================= */

// ---------- utilities ----------
const DAY = 864e5;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const sod = (t = now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const dkey = (t = now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = (t, o = { month: 'short', day: 'numeric', year: 'numeric' }) => new Date(t).toLocaleDateString('en-US', o);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, w, p) => `${n.toLocaleString()} ${n === 1 ? w : (p || w + 's')}`;
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- icons ----------
const P = {
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M9 15l2 2 4-4"/>',
  study: '<rect x="7.5" y="3.5" width="13" height="14" rx="2.5"/><path d="M4 7.5V18a2.5 2.5 0 0 0 2.5 2.5H15"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  decks: '<path d="M12 3.5 3 8l9 4.5L21 8z"/><path d="M3 12l9 4.5 9-4.5M3 16l9 4.5 9-4.5"/>',
  progress: '<path d="M4 20.5h16M7 17v-5M12 17V6.5M17 17v-8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l2 2M16.6 16.6l2 2M5.4 18.6l2-2M16.6 7.4l2-2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  dots: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  starOn: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  right: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  left: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  filter: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.3" fill="var(--bg)"/><circle cx="15" cy="17" r="2.3" fill="var(--bg)"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2.2 4.2 2.2 4.3h-11"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6.1c.5-.1.9-.1 1.4-.1 5 0 8.5 4.5 9.5 6-.4.7-1.3 1.8-2.5 3M6.6 6.7C4.7 7.9 3.3 9.8 2.5 12c1 1.5 4.5 6 9.5 6 1.6 0 3.1-.5 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  reset: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  share: '<path d="M12 15V3.5M8 7.5l4-4 4 4"/><path d="M7 11H5.5v9.5h13V11H17"/>',
  addHome: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  spark: '<path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6-5.6-1.9 5.6-1.9z"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.8" cy="17.5" r="1" fill="currentColor" stroke="none"/>',
  gauge: '<path d="M4 17.5a8 8 0 1 1 16 0"/><path d="M12 17.5l3.8-4.6"/>',
  base: '<path d="M3 9l9-5.5L21 9z"/><path d="M4 20h16M6 20v-8M12 20v-8M18 20v-8"/>',
  missed: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  upload: '<path d="M12 15V4M8 8l4-4 4 4M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

// ---------- storage ----------
const DB = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('cssbb-cards', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch { res(null); }
    });
  },
  get(k) {
    if (!this.db) { try { return Promise.resolve(JSON.parse(localStorage.getItem('cssbb:' + k))); } catch { return Promise.resolve(null); } }
    return new Promise(res => {
      const r = this.db.transaction('kv').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror = () => res(null);
    });
  },
  set(k, v) {
    if (!this.db) { try { localStorage.setItem('cssbb:' + k, JSON.stringify(v)); } catch {} return Promise.resolve(); }
    return new Promise(res => {
      const tx = this.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(JSON.parse(JSON.stringify(v)), k);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  },
};

const DEF = {
  onboarded: false, examDate: null, newPerDay: 10, maxReviews: 0, termFormat: 'both', front: 'term',
  showDots: true, includeNonBok: true, quizLen: 10, explain: true, theme: 'system', sessionLen: 40,
};
const fresh = () => ({ v: 1, settings: { ...DEF }, cards: {}, days: {}, quizzes: [], lastBackup: null, contentVersion: null });
let S = fresh();
let saveTimer;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.set('state', S), 200); };
const saveNow = () => { clearTimeout(saveTimer); return DB.set('state', S); };

// ---------- content ----------
let D = null, TERMS = [];
const TB = {}, QB = {};
const fullName = t => (t.acr ? `${t.term} (${t.acr})` : t.term);
const disp = t => { const f = S.settings.termFormat; if (!t.acr || f === 'both') return fullName(t); return f === 'acr' ? t.acr : t.term; };
const faceNames = t => { const f = S.settings.termFormat; if (!t.acr) return [t.term, '']; if (f === 'acr') return [t.acr, t.term]; if (f === 'full') return [t.term, '']; return [t.term, t.acr]; };
const secShort = t => D.sections[t.sec].short;
const optLabel = o => (o.tid && TB[o.tid] ? disp(TB[o.tid]) : o.text);
const dotsHtml = n => (S.settings.showDots
  ? `<span class="dots" role="img" aria-label="Difficulty ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<b class="${i <= n ? 'f' : ''}"></b>`).join('')}</span>` : '');

// Definitions written as "(1) …; (2) …" become real numbered lists.
function renderDef(text, cls = '') {
  const s = String(text);
  const m = s.match(/^([\s\S]*?)\(1\)\s*([\s\S]*)$/);
  if (!m || !/;\s*\(2\)/.test(s)) return `<div class="def ${cls}"><p>${esc(s)}</p></div>`;
  const lead = m[1].trim();
  const parts = m[2].split(/;\s*\(\d+\)\s*/);
  let last = parts.pop(), tail = '';
  const tm = last.match(/^([\s\S]+?)\.\s+(?=[A-Z])([\s\S]*)$/);
  if (tm) { last = tm[1]; tail = tm[2]; } else last = last.replace(/\.$/, '');
  parts.push(last);
  return `<div class="def ${cls}">${lead ? `<p>${esc(lead)}</p>` : ''}<ol>${parts.map(p => `<li>${esc(p.trim())}</li>`).join('')}</ol>${tail ? `<p>${esc(tail)}</p>` : ''}</div>`;
}
const maskDef = t => {
  let s = t.def;
  [t.term, t.acr].filter(x => x && x.length > 1).forEach(x => { s = s.replace(new RegExp(`(^|[^A-Za-z])${reEsc(x)}(?![A-Za-z])`, 'gi'), '$1_____'); });
  return s;
};

// ---------- card state ----------
const peek = id => S.cards[id];
const card = id => S.cards[id] || (S.cards[id] = { s: 'new', due: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: 0, qc: 0, qt: 0, qwrong: false, qmiss: 0 });
const isMastered = c => !!c && c.s === 'review' && c.ivl >= 21;
function status(id) {
  const c = peek(id);
  if (!c) return 'new';
  if (c.susp) return 'suspended';
  if (c.s === 'new') return 'new';
  if (isMastered(c)) return 'mastered';
  if (c.lapses >= 2 || (c.qwrong && c.qmiss >= 2)) return 'struggling';
  return 'learning';
}
const STATUS = { new: 'New', learning: 'Learning', struggling: 'Struggling', mastered: 'Mastered', suspended: 'Suspended' };
const pool = () => TERMS.filter(t => S.settings.includeNonBok || !t.nonBok);
const live = () => pool().filter(t => !peek(t.id)?.susp);
const blankDay = () => ({ rev: 0, newc: 0, qq: 0, qc: 0 });
const day = () => S.days[dkey()] || (S.days[dkey()] = blankDay());
const dayPeek = () => S.days[dkey()] || blankDay();
const started = c => c && c.s !== 'new';

function dueList() {
  const end = addDays(sod(), 1);
  return live().filter(t => { const c = peek(t.id); return started(c) && c.due < end; }).sort((a, b) => peek(a.id).due - peek(b.id).due);
}
const newList = () => live().filter(t => !started(peek(t.id)));
function todayPlan() {
  let due = dueList();
  const mr = S.settings.maxReviews;
  if (mr > 0) due = due.slice(0, Math.max(0, mr - dayPeek().rev));
  const nw = newList().slice(0, Math.max(0, S.settings.newPerDay - dayPeek().newc));
  return { due, nw, relearn: due.filter(t => peek(t.id).s === 'learning').length };
}
function rank(t) {
  const c = peek(t.id);
  if (started(c) && c.due < addDays(sod(), 1)) return 0;
  return { struggling: 1, learning: 2, new: 3, mastered: 4, suspended: 5 }[status(t.id)];
}
const prioritize = ts => shuffle(ts).sort((a, b) => rank(a) - rank(b));

// ---------- scheduling (simplified SM-2) ----------
function preview(c, r) {
  if (c.s !== 'review') {
    if (r === 0) return { mins: 1 };
    if (r === 1) return { mins: 10 };
    if (r === 2) return { days: 1 };
    return { days: c.lapses ? 2 : 4 };
  }
  if (r === 0) return { mins: 1 };
  const { ivl, ease } = c;
  if (r === 1) return { days: Math.max(ivl + 1, Math.round(ivl * 1.2)) };
  if (r === 2) return { days: Math.max(ivl + 1, Math.round(ivl * ease)) };
  return { days: Math.max(ivl + 2, Math.round(ivl * ease * 1.3)) };
}
const span = p => (p.mins ? `${p.mins} min`
  : p.days < 31 ? plural(p.days, 'day') : p.days < 365 ? `${Math.round(p.days / 30)} mo` : `${(p.days / 365).toFixed(1)} yr`);
function rate(id, r) {
  const c = card(id);
  const before = JSON.parse(JSON.stringify(c));
  const p = preview(c, r);
  const wasNew = c.s === 'new', wasM = isMastered(c);
  if (c.s === 'review' && r === 0) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.s = 'learning'; c.ivl = 0; }
  else if (c.s === 'review' && r === 1) c.ease = Math.max(1.3, c.ease - 0.15);
  else if (c.s === 'review' && r === 3) c.ease = Math.min(3.5, c.ease + 0.15);
  if (p.mins) { if (c.s === 'new') c.s = 'learning'; c.due = now() + p.mins * 60000; }
  else { c.s = 'review'; c.ivl = p.days; c.due = addDays(sod(), p.days); }
  c.reps++; c.last = now();
  if (isMastered(c) && !wasM) c.mAt = now();
  if (!isMastered(c)) c.mAt = null;
  const d = day(); d.rev++; if (wasNew) d.newc++;
  save();
  return { before, wasNew, requeue: !!p.mins };
}
function resetCard(id) {
  const c = peek(id); if (!c) return;
  S.cards[id] = { s: 'new', due: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: now(), qc: 0, qt: 0, qwrong: false, qmiss: 0, star: c.star, flag: c.flag };
  save();
}
function recordQuiz(tid, ok) {
  const c = card(tid);
  c.qt++;
  if (ok) { c.qc++; c.qwrong = false; }
  else { c.qmiss++; c.qwrong = true; if (c.s === 'review' && c.due > now()) c.due = now(); }
  c.last = Math.max(c.last || 0, now());
  const d = day(); d.qq++; if (ok) d.qc++;
  save();
}

// ---------- UI state ----------
const TAB_NAMES = { today: 'Today', study: 'Study', quiz: 'Quiz', decks: 'Decks', progress: 'Progress' };
const UI = {
  tab: 'today', stacks: { today: [], study: [], quiz: [], decks: [], progress: [] },
  studySrc: 'due', studySecs: new Set(), studyDiffs: new Set(),
  quizSrc: 'mixed', quizSecs: new Set(), quizDiffs: new Set(),
  deckMode: 'sections', q: '', sort: 'bok', fDiff: new Set(), fStatus: new Set(),
  range: 30, onboardStep: 1, installFrom: null,
  installSkipped: sessionStorage.getItem('installSkipped') === '1',
};
let mode = null;      // full-screen mode: install | onboard | session | summary | quiz | results
let SS = null;        // study session
let QS = null;        // quiz session
let OPS = [];         // callbacks for the open sheet or dialog
let MP = null;        // multi-pick sheet state
let advanceTimer = null;

// ---------- overlays ----------
const layer = () => $('#layer');
function closeLayer() { layer().innerHTML = ''; MP = null; }
function openOverlay(inner, cls = '') {
  layer().innerHTML = `<div class="overlay ${cls}" data-a="dismiss">${inner}</div>`;
  const f = layer().querySelector('button:not(.cancel), textarea'); if (f && f.tagName === 'TEXTAREA') f.focus();
}
function actionSheet(title, items) {
  OPS = items.map(x => x.fn);
  openOverlay(`<div class="actions" data-a="noop" role="menu"><div class="box">${title ? `<div class="ttl">${esc(title)}</div>` : ''}${items.map((x, i) =>
    `<button data-a="op" data-i="${i}" role="menuitem" class="${x.danger ? 'danger' : ''}">${x.icon ? ic(x.icon) : ''}${esc(x.label)}</button>`).join('')}</div>
    <div class="box"><button class="cancel" data-a="dismiss">Cancel</button></div></div>`);
}
function alertBox(title, msg, buttons) {
  OPS = buttons.map(b => b.fn || null);
  openOverlay(`<div class="alert" data-a="noop" role="alertdialog" aria-label="${esc(title)}"><div class="body"><div class="t">${esc(title)}</div>${msg ? `<div class="m">${esc(msg)}</div>` : ''}</div>
    <div class="btns ${buttons.length > 2 ? 'col' : ''}">${buttons.map((b, i) => `<button data-a="op" data-i="${i}" class="${b.cls || ''}">${esc(b.label)}</button>`).join('')}</div></div>`, 'mid');
}
function sheet(inner) { openOverlay(`<div class="sheet" data-a="noop" role="dialog"><div class="grab"></div>${inner}</div>`); }
function chooseOne(title, opts, cur, onPick) {
  OPS = opts.map(o => () => onPick(o.v));
  sheet(`<div class="bar3"><span></span><span class="t">${esc(title)}</span><button class="link r" data-a="dismiss">Done</button></div>
    <div class="grp">${opts.map((o, i) => `<button class="row" data-a="op" data-i="${i}"><span class="grow">${esc(o.label)}${o.sub ? `<div class="sub">${esc(o.sub)}</div>` : ''}</span>${o.v === cur ? `<span style="color:var(--accent)">${ic('check')}</span>` : ''}</button>`).join('')}</div>`);
}
function multiPick(title, opts, set, onDone) {
  MP = { title, opts, set: new Set(set), onDone };
  renderMulti();
}
function renderMulti() {
  const { title, opts, set } = MP;
  OPS = [() => MP.onDone(MP.set)];
  sheet(`<div class="bar3"><button class="link" data-a="mpAll">${set.size === opts.length ? 'Clear' : 'Select all'}</button><span class="t">${esc(title)}</span><button class="link r" data-a="mpDone" style="font-weight:600">Done</button></div>
    <div class="grp">${opts.map(o => `<button class="row" data-a="mp" data-v="${o.v}" aria-pressed="${set.has(o.v)}"><span class="grow">${esc(o.label)}</span><span class="val">${o.count ?? ''}</span><span style="color:var(--accent);width:20px">${set.has(o.v) ? ic('check') : ''}</span></button>`).join('')}</div>`);
}
function noteSheet(title, initial, onSave) {
  OPS = [onSave];
  sheet(`<div class="bar3"><button class="link" data-a="dismiss">Cancel</button><span class="t">${esc(title)}</span><button class="link r" data-a="noteSave" style="font-weight:600">Save</button></div>
    <p class="cap" style="margin:4px 0 10px">Describe what looks wrong. Flags are saved on this phone and included in your backups; share them from Settings.</p>
    <textarea id="noteText" placeholder="The definition says 1.33, but the Handbook uses 1.67">${esc(initial || '')}</textarea>`);
}
function termSheet(id) {
  const t = TB[id], [a, b] = faceNames(t);
  OPS = [];
  sheet(`<div class="bar3"><span></span><span class="t">Term details</span><button class="link r" data-a="dismiss">Done</button></div>
    <div style="font-size:24px;font-weight:700;margin-top:6px">${esc(a)}</div>${b ? `<div class="cap">${esc(b)}</div>` : ''}
    <div class="chips" style="margin:10px 0 12px"><span class="pill">${esc(secShort(t))}</span><span class="pill gray">${esc(t.bok)}</span>${dotsHtml(t.diff)}</div>
    ${renderDef(t.def)}`);
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(e => e.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ---------- rendering ----------
function applyTheme() {
  const th = S.settings.theme;
  if (th === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
}
function render(keep = false) {
  const main = $('#main');
  const st = keep ? main.scrollTop : 0;
  applyTheme();
  let html;
  if (mode) html = FULL[mode]();
  else {
    const stack = UI.stacks[UI.tab], top = stack[stack.length - 1];
    html = top ? VIEWS[top.v](top) : ROOTS[UI.tab]();
  }
  main.innerHTML = html;
  main.classList.toggle('full', !!mode);
  main.scrollTop = st;
  const tb = $('#tabbar');
  tb.classList.toggle('hide', !!mode);
  if (!mode) tb.innerHTML = Object.entries(TAB_NAMES).map(([k, n]) =>
    `<button data-a="tab" data-tab="${k}" ${UI.tab === k ? 'aria-current="page"' : ''}>${ic(k)}<span>${n}</span></button>`).join('');
  if (mode === 'session') bindSwipe();
}
const push = v => { UI.stacks[UI.tab].push(v); render(); };
const back = () => { UI.stacks[UI.tab].pop(); render(); };
function goTab(tab, stack = []) { UI.tab = tab; UI.stacks[tab] = stack; mode = null; render(); }
function backLabel() {
  const st = UI.stacks[UI.tab];
  const prev = st[st.length - 2];
  if (!prev) return TAB_NAMES[UI.tab];
  if (prev.v === 'section') return D.sections[prev.sec].short;
  if (prev.v === 'settings') return 'Settings';
  if (prev.v === 'data') return 'Data';
  return 'Back';
}
const navbar = (title, right = '') => `<div class="navbar"><button class="link" data-a="back">${ic('left')}${esc(backLabel())}</button><span class="t">${esc(title)}</span><span class="r">${right}</span></div>`;
const tog = (k, on, label) => `<button class="tog" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-a="set" data-k="${k}"></button>`;
const seg = (a, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-a="${a}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join('')}</div>`;
const chev = `<span class="chev">${ic('right')}</span>`;

// ---------- stats helpers ----------
function secStats(sec) {
  const ts = pool().filter(t => t.sec === sec);
  const m = ts.filter(t => isMastered(peek(t.id))).length;
  const st = ts.filter(t => started(peek(t.id))).length;
  const end = addDays(sod(), 1);
  const due = ts.filter(t => { const c = peek(t.id); return started(c) && !c.susp && c.due < end; }).length;
  return { n: ts.length, m, st, due, pct: pct(m, ts.length) };
}
function streaks() {
  const active = k => { const d = S.days[k]; return d && (d.rev > 0 || d.qq > 0); };
  let cur = 0, t = sod();
  if (!active(dkey(t))) t = addDays(t, -1);
  while (active(dkey(t))) { cur++; t = addDays(t, -1); }
  const keys = Object.keys(S.days).filter(active).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(k => {
    const tk = new Date(k + 'T00:00:00').getTime();
    run = prev !== null && dkey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run); prev = tk;
  });
  return { cur, best: Math.max(best, cur) };
}
const examDays = () => (S.settings.examDate ? Math.round((S.settings.examDate - sod()) / DAY) : null);
const totalReviews = () => Object.values(S.days).reduce((a, d) => a + (d.rev || 0), 0);
function needsBackup() {
  const tr = totalReviews();
  if (!S.lastBackup) return tr >= 30;
  const lastAct = Math.max(0, ...Object.values(S.cards).map(c => c.last || 0));
  return now() - S.lastBackup > 7 * DAY && lastAct > S.lastBackup;
}
function planNote() {
  const remaining = newList().length, per = S.settings.newPerDay, ed = examDays();
  if (per === 0) return 'New cards are paused. Only reviews will be scheduled.';
  const finish = addDays(sod(), Math.ceil(remaining / per) - 1);
  let msg = `At ${per} new cards a day, you'll see all ${remaining} remaining terms by ${fmtDate(finish, { month: 'short', day: 'numeric' })}.`;
  if (ed !== null) {
    if (ed <= 7) msg += ' Your exam is close, so focus on due and missed cards.';
    else if (finish > addDays(S.settings.examDate, -7)) msg += ` Try ${Math.ceil(remaining / (ed - 7))} a day to finish a week before your exam.`;
    else msg += ' That leaves time to review before your exam.';
  }
  return msg;
}

// ---------- sessions ----------
function sessionLen() { return S.settings.sessionLen === 0 ? Infinity : S.settings.sessionLen; }
function startSession(ids) {
  ids = [...new Set(ids)].filter(id => TB[id] && !peek(id)?.susp);
  if (!ids.length) { toast('There are no cards to study here'); return; }
  closeLayer();
  SS = { ids, i: 0, flipped: false, faces: {}, counts: [0, 0, 0, 0], again: {}, undo: [], start: now(), rated: 0, seen: new Set() };
  mode = 'session'; render();
}
function studyIds(src = UI.studySrc) {
  const L = sessionLen();
  if (src === 'due') { const p = todayPlan(); return [...p.due, ...p.nw].slice(0, L).map(t => t.id); }
  if (src === 'new') return newList().slice(0, L).map(t => t.id);
  let ts = live();
  if (src === 'sec') ts = ts.filter(t => UI.studySecs.has(t.sec));
  else if (src === 'diff') ts = ts.filter(t => UI.studyDiffs.has(t.diff));
  else if (src === 'fund') ts = ts.filter(t => t.sec === 0);
  else if (src === 'star') ts = ts.filter(t => peek(t.id)?.star);
  else if (src === 'missed') ts = ts.filter(t => peek(t.id)?.qwrong);
  return shuffle(prioritize(ts).slice(0, L)).map(t => t.id);
}
function rateCurrent(r) {
  if (!SS || !SS.flipped) return;
  const id = SS.ids[SS.i];
  const res = rate(id, r);
  SS.counts[r]++; SS.rated++;
  if (r === 0) SS.again[id] = (SS.again[id] || 0) + 1;
  let at = -1;
  if (res.requeue) { at = Math.min(SS.ids.length, SS.i + 1 + (r === 0 ? 4 : 8)); SS.ids.splice(at, 0, id); }
  SS.undo.push({ id, before: res.before, wasNew: res.wasNew, r, at, i: SS.i });
  SS.i++; SS.flipped = false;
  if (SS.i >= SS.ids.length) finishSession(); else render();
}
function undoRating() {
  const u = SS?.undo.pop(); if (!u) return;
  S.cards[u.id] = u.before;
  const d = day(); d.rev = Math.max(0, d.rev - 1); if (u.wasNew) d.newc = Math.max(0, d.newc - 1);
  SS.counts[u.r]--; SS.rated--;
  if (u.r === 0) { SS.again[u.id]--; if (!SS.again[u.id]) delete SS.again[u.id]; }
  if (u.at >= 0) SS.ids.splice(u.at, 1);
  SS.i = u.i; SS.flipped = true; save();
  mode = 'session'; render();
}
function finishSession() { SS.end = now(); mode = 'summary'; render(); }
function endSession() {
  if (SS && SS.rated > 0) {
    alertBox('End this session?', 'Your ratings so far are saved.', [{ label: 'Keep studying' }, { label: 'End session', cls: 'strong', fn: finishSession }]);
  } else { SS = null; mode = null; render(); }
}

// ---------- quizzes ----------
const questionsFor = ts => ts.map(t => QB[t.id]).filter(Boolean);
function weightedPick(items, w, n) {
  return items.map(x => ({ x, k: Math.pow(Math.random(), 1 / Math.max(0.05, w(x))) })).sort((a, b) => b.k - a.k).slice(0, n).map(o => o.x);
}
function quizWeight(t) {
  const st = status(t.id), c = peek(t.id);
  return 1 + (c?.qwrong ? 4 : 0) + (st === 'struggling' ? 3 : 0) + (st === 'learning' ? 1.5 : 0) - (st === 'mastered' ? 0.5 : 0);
}
function quizTerms(src = UI.quizSrc) {
  let ts = live().filter(t => QB[t.id]);
  if (src === 'mixed') return ts;
  if (src === 'sec') return ts.filter(t => UI.quizSecs.has(t.sec));
  if (src === 'diff') return ts.filter(t => UI.quizDiffs.has(t.diff));
  if (src === 'missed') return ts.filter(t => peek(t.id)?.qwrong);
  if (src === 'star') return ts.filter(t => peek(t.id)?.star);
  return ts;
}
function buildQuiz(src = UI.quizSrc, n = S.settings.quizLen) {
  const ts = quizTerms(src);
  const pick = src === 'mixed' ? weightedPick(ts, quizWeight, n) : shuffle(ts).slice(0, n);
  return questionsFor(pick);
}
function makeItem(q) {
  const wrong = shuffle(q.wrong).slice(0, 3).map(w => ({ tid: w.tid, text: w.text, why: w.why }));
  return { q, chosen: -1, opts: shuffle([{ tid: q.tid, correct: true }, ...wrong]) };
}
function startQuiz(qs) {
  if (!qs.length) { toast('There are no questions here yet'); return; }
  closeLayer();
  QS = { items: qs.map(makeItem), i: 0, correct: 0, start: now() };
  mode = 'quiz'; render();
}
function answer(k) {
  const it = QS?.items[QS.i];
  if (!it || it.chosen >= 0) return;
  it.chosen = k;
  const ok = !!it.opts[k].correct;
  if (ok) QS.correct++;
  recordQuiz(it.q.tid, ok);
  render(true);
  if (!S.settings.explain) { clearTimeout(advanceTimer); advanceTimer = setTimeout(nextQuestion, ok ? 700 : 1300); }
}
function nextQuestion() {
  clearTimeout(advanceTimer);
  if (!QS) return;
  QS.i++;
  if (QS.i >= QS.items.length) finishQuiz(); else render();
}
function finishQuiz() {
  const answered = QS.items.filter(it => it.chosen >= 0);
  QS.items = answered;
  if (!answered.length) { QS = null; mode = null; render(); return; }
  S.quizzes.push({ at: now(), n: answered.length, c: QS.correct });
  S.quizzes = S.quizzes.slice(-200);
  save(); mode = 'results'; render();
}
function endQuiz() {
  const n = QS.items.filter(it => it.chosen >= 0).length;
  if (!n) { QS = null; mode = null; render(); return; }
  alertBox('End this quiz?', "Questions you've answered are saved and scored.", [{ label: 'Keep going' }, { label: 'End quiz', cls: 'strong', fn: finishQuiz }]);
}
function reviewQuestion(i) {
  const it = QS.items[i], t = TB[it.q.tid], o = it.opts[it.chosen];
  OPS = [];
  sheet(`<div class="bar3"><span></span><span class="t">Question review</span><button class="link r" data-a="dismiss">Done</button></div>
    <div class="prompt" style="font-size:17px">${esc(it.q.prompt)}</div>
    <div class="choice wrong"><span class="k">${ic('x')}</span><span>${esc(optLabel(o))}</span><span class="tag">Your answer</span></div>
    <div class="choice right"><span class="k">${ic('check')}</span><span>${esc(disp(t))}</span></div>
    <div class="explain"><div class="h">Why not ${esc(optLabel(o))}?</div><div class="b">${esc(o.why)}</div></div>
    <div class="explain"><div class="h">${esc(disp(t))}</div><div class="b">${renderDef(t.def, 'sm')}</div></div>`);
}

// ---------- import / export ----------
async function exportProgress() {
  const name = `cssbb-progress-${dkey()}.json`;
  const body = JSON.stringify({ app: 'cssbb-cards', format: 1, exportedAt: new Date().toISOString(), content: D.version.id, state: S });
  const blob = new Blob([body], { type: 'application/json' });
  const mark = () => { S.lastBackup = now(); saveNow(); render(true); toast('Backup saved'); };
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'CSSBB Cards backup' }); mark(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  mark();
}
function importProgress() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json'; inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files[0]; inp.remove(); if (!f) return;
    let obj = null;
    try { obj = JSON.parse(await f.text()); } catch {}
    if (!obj || obj.app !== 'cssbb-cards' || !obj.state || typeof obj.state.cards !== 'object') {
      alertBox("That file isn't a backup", 'Choose a .json file exported from CSSBB Cards.', [{ label: 'OK' }]); return;
    }
    const n = Object.keys(obj.state.cards).length;
    const when = obj.exportedAt ? fmtDate(Date.parse(obj.exportedAt)) : 'an unknown date';
    alertBox('Restore this backup?', `Saved ${when}, with progress on ${plural(n, 'card')}. Merge keeps the newest history for each card. Replace discards the progress on this phone.`, [
      { label: 'Merge', cls: 'strong', fn: () => applyImport(obj.state, false) },
      { label: 'Replace', cls: 'danger', fn: () => applyImport(obj.state, true) },
      { label: 'Cancel' },
    ]);
  };
  inp.click();
}
function applyImport(st, replace) {
  if (replace) {
    S = { ...fresh(), ...st, settings: { ...DEF, ...(st.settings || {}), onboarded: true } };
  } else {
    for (const [id, c] of Object.entries(st.cards || {})) {
      const cur = S.cards[id];
      if (!cur || (c.last || 0) > (cur.last || 0)) S.cards[id] = { ...c, star: !!(c.star || cur?.star), flag: cur?.flag || c.flag };
      else { if (c.star) cur.star = true; if (c.flag && !cur.flag) cur.flag = c.flag; }
    }
    for (const [k, d] of Object.entries(st.days || {})) {
      const cur = S.days[k];
      S.days[k] = cur ? { rev: Math.max(cur.rev, d.rev || 0), newc: Math.max(cur.newc, d.newc || 0), qq: Math.max(cur.qq, d.qq || 0), qc: Math.max(cur.qc, d.qc || 0) } : { ...blankDay(), ...d };
    }
    const seen = new Set(S.quizzes.map(q => q.at));
    S.quizzes = [...S.quizzes, ...(st.quizzes || []).filter(q => !seen.has(q.at))].sort((a, b) => a.at - b.at).slice(-200);
    S.lastBackup = Math.max(S.lastBackup || 0, st.lastBackup || 0) || null;
    S.settings.onboarded = true;
  }
  S.contentVersion = D.version.id;
  saveNow();
  if (mode === 'onboard' || mode === 'install') { mode = null; UI.tab = 'today'; }
  render(); toast('Backup restored');
}
async function shareFlags() {
  const ts = TERMS.filter(t => peek(t.id)?.flag);
  const text = ts.map(t => `${t.id} ${fullName(t)}: ${peek(t.id).flag.note || '(no note)'}`).join('\n');
  try { if (navigator.share) { await navigator.share({ title: 'CSSBB Cards flagged terms', text }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { toast("Couldn't share the list"); }
}

// ---------- card actions (shared by study, decks, flags) ----------
function toggleStar(id) { const c = card(id); c.star = !c.star; save(); toast(c.star ? 'Starred' : 'Star removed'); }
function flagCard(id, after) {
  const c = card(id);
  noteSheet(c.flag ? 'Edit flag' : 'Flag for review', c.flag?.note, note => { card(id).flag = { note, at: now() }; save(); toast('Flag saved'); after && after(); });
}
function suspendCard(id, after) { const c = card(id); c.susp = !c.susp; save(); toast(c.susp ? 'Card suspended' : 'Card restored to reviews'); after && after(); }
function confirmReset(id, after) {
  alertBox('Reset this card?', 'It will be treated as a new card. Its star and flag are kept.', [{ label: 'Cancel' }, { label: 'Reset', cls: 'danger', fn: () => { resetCard(id); toast('Card reset'); after && after(); } }]);
}
function termMenu(id) {
  const c = peek(id);
  actionSheet(fullName(TB[id]), [
    { label: c?.susp ? 'Restore to reviews' : 'Suspend card', icon: 'eyeOff', fn: () => suspendCard(id, () => render(true)) },
    { label: c?.flag ? 'Edit flag' : 'Flag for review', icon: 'flag', fn: () => flagCard(id, () => render(true)) },
    { label: 'Reset card progress', icon: 'reset', danger: true, fn: () => confirmReset(id, () => render(true)) },
  ]);
}

// ---------- deck filtering ----------
const filtersOn = () => UI.fDiff.size + UI.fStatus.size + (UI.sort !== 'bok' ? 1 : 0);
function filterTerms(ts) {
  const q = UI.q.trim().toLowerCase();
  if (q) ts = ts.filter(t => t.term.toLowerCase().includes(q) || t.acr.toLowerCase().includes(q) || t.def.toLowerCase().includes(q));
  if (UI.fDiff.size) ts = ts.filter(t => UI.fDiff.has(t.diff));
  if (UI.fStatus.size) ts = ts.filter(t => UI.fStatus.has(status(t.id)) || (UI.fStatus.has('starred') && peek(t.id)?.star));
  const s = UI.sort;
  if (s === 'az') ts = ts.slice().sort((a, b) => disp(a).localeCompare(disp(b)));
  else if (s === 'diff') ts = ts.slice().sort((a, b) => b.diff - a.diff);
  else if (s === 'weak') { const w = { struggling: 0, learning: 1, new: 2, suspended: 3, mastered: 4 }; ts = ts.slice().sort((a, b) => w[status(a.id)] - w[status(b.id)] || (peek(b.id)?.lapses || 0) - (peek(a.id)?.lapses || 0)); }
  else if (s === 'missed') ts = ts.slice().sort((a, b) => (peek(b.id)?.qwrong ? 1 : 0) - (peek(a.id)?.qwrong ? 1 : 0) || (peek(b.id)?.qmiss || 0) - (peek(a.id)?.qmiss || 0));
  return ts;
}
const termRow = (t, showSec) => `<button class="row" data-a="term" data-id="${t.id}"><span class="st ${status(t.id)}" title="${STATUS[status(t.id)]}"></span>
  <span class="grow">${esc(disp(t))}${showSec ? `<div class="sub">${esc(secShort(t))}</div>` : ''}</span>${peek(t.id)?.star ? `<span style="color:var(--orange-fill)">${ic('starOn')}</span>` : ''}${dotsHtml(t.diff)}${chev}</button>`;
function deckListHtml() {
  if (UI.q.trim() || UI.deckMode === 'az') {
    let ts = filterTerms(pool());
    if (UI.sort === 'bok' && UI.deckMode === 'az' && !UI.q.trim()) ts = ts.slice().sort((a, b) => disp(a).localeCompare(disp(b)));
    if (!ts.length) return `<div class="empty">No terms match${UI.q ? ` "${esc(UI.q)}"` : ' these filters'}.</div>`;
    return `<p class="small" style="margin:4px 4px 0">${plural(ts.length, 'term')}</p><div class="grp">${ts.map(t => termRow(t, true)).join('')}</div>`;
  }
  return `<div class="grp">${D.sections.map((s, i) => {
    const n = filterTerms(pool().filter(t => t.sec === i)).length, st = secStats(i);
    return `<button class="row" data-a="section" data-sec="${i}"><span class="grow">${esc(s.short)}</span><span class="val">${n}</span><span class="bar" title="${st.pct}% mastered"><i style="width:${st.pct}%"></i></span>${chev}</button>`;
  }).join('')}</div>`;
}
function filterSheet() {
  OPS = [];
  const sorts = [['bok', 'Body of Knowledge order'], ['az', 'Alphabetical'], ['diff', 'Difficulty, hardest first'], ['weak', 'Weakest first'], ['missed', 'Most recently missed']];
  const stats = [['new', 'New'], ['learning', 'Learning'], ['struggling', 'Struggling'], ['mastered', 'Mastered'], ['suspended', 'Suspended'], ['starred', 'Starred']];
  sheet(`<div class="bar3"><button class="link" data-a="fReset">Reset</button><span class="t">Filter and sort</span><button class="link r" data-a="fDone" style="font-weight:600">Done</button></div>
    <div class="label">Sort by</div><div class="grp">${sorts.map(([v, l]) => `<button class="row" data-a="fSort" data-v="${v}"><span class="grow">${l}</span>${UI.sort === v ? `<span style="color:var(--accent)">${ic('check')}</span>` : ''}</button>`).join('')}</div>
    <div class="label">Difficulty</div><div class="chips">${[1, 2, 3, 4, 5].map(d => `<button class="chip" data-a="fDiff" data-v="${d}" aria-pressed="${UI.fDiff.has(d)}">${d}</button>`).join('')}</div>
    <div class="label">Status</div><div class="chips">${stats.map(([v, l]) => `<button class="chip" data-a="fStat" data-v="${v}" aria-pressed="${UI.fStatus.has(v)}">${l}</button>`).join('')}</div>`);
}

// =========================================================================
// Tab root screens
// =========================================================================
const ROOTS = {
  today() {
    const plan = todayPlan(), total = plan.due.length + plan.nw.length;
    const reviewed = dayPeek().rev, sk = streaks(), ed = examDays();
    const tomorrow = live().filter(t => { const c = peek(t.id); return started(c) && c.due >= addDays(sod(), 1) && c.due < addDays(sod(), 2); }).length;
    const missed = live().filter(t => peek(t.id)?.qwrong).length;
    let h = `<div class="hdr"><span class="cap">${fmtDate(now(), { weekday: 'long', month: 'long', day: 'numeric' })}</span><button class="ib" data-a="settings" aria-label="Settings">${ic('gear')}</button></div>
      <h1 class="lt">Today</h1>`;
    if (isIOS && !standalone()) h += `<div class="note warn">${ic('warn')}<span>This app isn't installed, so your progress may be erased. <button data-a="install">Install it</button></span></div>`;
    if (total > 0) {
      h += `<div class="hero"><div class="hdr"><span class="cap">Due today</span><span class="small">About ${Math.max(1, Math.round(total / 3))} min</span></div>
        <div class="big">${total} <small>${total === 1 ? 'card' : 'cards'}</small></div>
        <div class="chips" style="margin:8px 0 14px">${plan.due.length - plan.relearn ? `<span class="pill">${plan.due.length - plan.relearn} review</span>` : ''}${plan.relearn ? `<span class="pill orange">${plan.relearn} relearn</span>` : ''}${plan.nw.length ? `<span class="pill green">${plan.nw.length} new</span>` : ''}</div>
        <div class="stack"><button class="btn" data-a="startToday">Start review</button><button class="btn sec" data-a="quickQuiz">${ic('quiz')} Quick quiz, ${S.settings.quizLen} questions</button></div></div>`;
    } else {
      h += `<div class="hero center"><div class="done-mark">${ic('check')}</div><div style="font-size:19px;font-weight:600;margin-top:10px">You're done for today</div>
        <div class="cap" style="margin-top:2px">${reviewed ? `${plural(reviewed, 'card')} reviewed. ` : 'Nothing is due right now. '}${tomorrow ? `${tomorrow} due tomorrow.` : ''}</div></div>
        <div class="h3">Keep going</div><div class="grp">
        ${newList().length ? `<button class="row ico" data-a="extraNew"><span class="lead">${ic('spark')}</span><span class="grow">Learn 10 more new cards</span>${chev}</button>` : ''}
        <button class="row ico" data-a="quickQuiz"><span class="lead">${ic('quiz')}</span><span class="grow">Quick quiz, ${S.settings.quizLen} questions</span>${chev}</button>
        ${missed ? `<button class="row ico" data-a="retryMissed"><span class="lead">${ic('reset')}</span><span class="grow">Retry missed quiz questions</span><span class="val">${missed}</span>${chev}</button>` : ''}</div>`;
    }
    h += `<div class="metrics"><div class="metric"><div class="cap">Study streak</div><div class="n">${plural(sk.cur, 'day')}</div></div>
      ${ed !== null ? `<div class="metric"><div class="cap">${ed >= 0 ? 'Until exam' : 'Exam date'}</div><div class="n">${ed >= 0 ? plural(ed, 'day') : 'Passed'}</div></div>`
        : `<div class="metric"><div class="cap">Mastered</div><div class="n">${pool().filter(t => isMastered(peek(t.id))).length} of ${pool().length}</div></div>`}</div>`;
    const startedAll = pool().filter(t => started(peek(t.id))).length;
    if (startedAll < 20) {
      const f = secStats(0);
      if (f.n > f.st) h += `<div class="h3">Where to start</div><div class="grp"><button class="row ico" data-a="studySec" data-sec="0"><span class="lead">${ic('base')}</span><span class="grow">Learn the fundamentals<div class="sub">${f.n} core terms that appear across the whole exam</div></span>${chev}</button></div>`;
    } else {
      const secs = D.sections.map((s, i) => ({ i, s, ...secStats(i) })).filter(x => x.n).sort((a, b) => a.pct - b.pct || b.due - a.due).slice(0, 3);
      h += `<div class="h3">Focus areas</div><div class="grp">${secs.map(x => `<button class="row" data-a="studySec" data-sec="${x.i}"><span class="grow">${esc(x.s.short)}</span><span class="bar"><i style="width:${x.pct}%"></i></span><span class="val" style="width:38px">${x.pct}%</span>${chev}</button>`).join('')}</div>
        <p class="gf">Lowest mastery first. Tap a section to study it.</p>`;
    }
    if (needsBackup()) h += `<div class="note warn">${ic('upload')}<span>${S.lastBackup ? `Last backup was ${Math.floor((now() - S.lastBackup) / DAY)} days ago.` : "You haven't backed up your progress yet."} <button data-a="export">Back up now</button></span></div>`;
    return h;
  },

  study() {
    const src = UI.studySrc, plan = todayPlan(), L = live();
    const secLbl = UI.studySecs.size ? [...UI.studySecs].map(i => D.sections[i].short.split(' ')[0].replace('.', '')).join(', ') : 'Choose';
    const difLbl = UI.studyDiffs.size ? [...UI.studyDiffs].sort().join(', ') : 'Choose';
    const rows = [
      ['due', 'clock', 'Due today', plan.due.length + plan.nw.length],
      ['new', 'spark', 'New cards', newList().length],
      ['sec', 'list', 'By exam section', secLbl],
      ['diff', 'gauge', 'By difficulty', difLbl],
      ['fund', 'base', 'Fundamentals', L.filter(t => t.sec === 0).length],
      ['star', 'star', 'Starred', L.filter(t => peek(t.id)?.star).length],
      ['missed', 'missed', 'Missed in quizzes', L.filter(t => peek(t.id)?.qwrong).length],
    ];
    const n = studyIds().length;
    return `<h1 class="lt" style="margin-top:14px">Study</h1><p class="cap">Choose what to study</p>
      <div class="grp">${rows.map(([v, icon, label, val]) => `<button class="row ico" data-a="studySrc" data-v="${v}" aria-pressed="${src === v}"><span class="lead">${ic(icon)}</span><span class="grow">${label}</span><span class="val">${val}</span>${src === v ? `<span style="color:var(--accent)">${ic('check')}</span>` : (v === 'sec' || v === 'diff' ? chev : '<span style="width:17px"></span>')}</button>`).join('')}</div>
      <div class="label">Session length</div>${seg('sessLen', [[20, '20'], [40, '40'], [0, 'All']], S.settings.sessionLen)}
      <div class="label">Card front shows</div>${seg('front', [['term', 'Term'], ['def', 'Definition'], ['mixed', 'Mixed']], S.settings.front)}
      <div style="margin-top:22px"><button class="btn" data-a="startStudy">${n ? `Start, ${plural(n, 'card')}` : 'Nothing to study here yet'}</button></div>`;
  },

  quiz() {
    const src = UI.quizSrc;
    const secLbl = UI.quizSecs.size ? [...UI.quizSecs].map(i => D.sections[i].short.split(' ')[0].replace('.', '')).join(', ') : 'Choose';
    const difLbl = UI.quizDiffs.size ? [...UI.quizDiffs].sort().join(', ') : 'Choose';
    const rows = [
      ['mixed', 'Mixed review', 'Weighted toward your weak terms', ''],
      ['sec', 'By exam section', '', secLbl],
      ['diff', 'By difficulty', '', difLbl],
      ['missed', 'Missed before', '', quizTerms('missed').length],
      ['star', 'Starred', '', quizTerms('star').length],
    ];
    const n = Math.min(S.settings.quizLen, quizTerms(src).length);
    return `<h1 class="lt" style="margin-top:14px">Quiz</h1><p class="cap">Questions from</p>
      <div class="grp">${rows.map(([v, l, sub, val]) => `<button class="row" data-a="quizSrc" data-v="${v}" aria-pressed="${src === v}"><span class="grow">${l}${sub ? `<div class="sub">${sub}</div>` : ''}</span><span class="val">${val}</span>${src === v ? `<span style="color:var(--accent)">${ic('check')}</span>` : (v === 'sec' || v === 'diff' ? chev : '<span style="width:17px"></span>')}</button>`).join('')}</div>
      <div class="label">Number of questions</div>${seg('quizLen', [[10, '10'], [20, '20'], [30, '30']], S.settings.quizLen)}
      <div class="grp" style="margin-top:16px"><div class="row static"><span class="grow">Explain each answer<div class="sub">Show why each wrong choice is wrong</div></span>${tog('explain', S.settings.explain, 'Explain each answer')}</div></div>
      <div style="margin-top:22px"><button class="btn" data-a="startQuiz">${n ? `Start quiz, ${plural(n, 'question')}` : 'No questions here yet'}</button></div>`;
  },

  decks() {
    const fo = filtersOn();
    return `<div class="hdr" style="margin-top:8px"><h1 class="lt">Decks</h1><button class="ib" data-a="filters" aria-label="Filter and sort">${ic('filter')}</button></div>
      <label class="search">${ic('search')}<input id="deckSearch" type="search" placeholder="Search terms and definitions" value="${esc(UI.q)}" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Search terms and definitions"></label>
      ${seg('deckMode', [['sections', 'By section'], ['az', 'All terms A to Z']], UI.deckMode)}
      ${fo ? `<p class="small" style="margin:10px 4px 0">${plural(fo, 'filter')} on. <button class="link" style="font-size:12px;padding:0" data-a="fReset">Clear</button></p>` : ''}
      <div id="deckList">${deckListHtml()}</div>
      <div class="legend"><span><i class="st new"></i>New</span><span><i class="st learning"></i>Learning</span><span><i class="st struggling"></i>Struggling</span><span><i class="st mastered"></i>Mastered</span></div>`;
  },

  progress() {
    const r = UI.range, P = pool();
    const from = r ? addDays(sod(), -(r - 1)) : 0, fromKey = dkey(from);
    let rev = 0, qq = 0, qc = 0;
    Object.entries(S.days).forEach(([k, d]) => { if (!r || k >= fromKey) { rev += d.rev || 0; qq += d.qq || 0; qc += d.qc || 0; } });
    const m = P.filter(t => isMastered(peek(t.id))).length;
    const newM = P.filter(t => { const c = peek(t.id); return isMastered(c) && c.mAt && c.mAt >= from; }).length;
    const startedN = P.filter(t => started(peek(t.id))).length;
    const C = 169.6, frac = P.length ? m / P.length : 0;
    // calendar: last 28 days
    const cells = [];
    for (let i = 27; i >= 0; i--) { const k = dkey(addDays(sod(), -i)); const d = S.days[k]; const a = d ? (d.rev || 0) + (d.qq || 0) : 0; cells.push(`<i class="${a === 0 ? '' : a < 20 ? 'l1' : a < 50 ? 'l2' : 'l3'} ${i === 0 ? 'today' : ''}" title="${k}: ${a}"></i>`); }
    const sk = streaks();
    // upcoming reviews
    const L = live().filter(t => started(peek(t.id)));
    const fc = [0, 1, 2, 3, 4, 5, 6].map(k => { const a = k === 0 ? 0 : addDays(sod(), k), b = addDays(sod(), k + 1); return L.filter(t => { const d = peek(t.id).due; return d >= a && d < b; }).length; });
    const fmax = Math.max(1, ...fc);
    // accuracy by difficulty
    const acc = [[[1, 2], '1 to 2, easier'], [[3], '3, medium'], [[4, 5], '4 to 5, harder']].map(([ds, l]) => {
      let c = 0, t = 0; P.forEach(x => { if (ds.includes(x.diff)) { const s = peek(x.id); if (s) { c += s.qc || 0; t += s.qt || 0; } } });
      return { l, c, t, p: pct(c, t) };
    });
    const worst = P.map(t => ({ t, s: (peek(t.id)?.qmiss || 0) + (peek(t.id)?.lapses || 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    return `<h1 class="lt" style="margin-top:14px">Progress</h1>
      ${seg('range', [[7, '7 days'], [30, '30 days'], [0, 'All time']], r)}
      <div class="grp ring" style="padding:14px 16px">
        <svg width="74" height="74" viewBox="0 0 64 64" role="img" aria-label="${pct(m, P.length)} percent mastered"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--grp2)" stroke-width="7"/>${frac > 0 ? `<circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent)" stroke-width="7" stroke-dasharray="${(C * frac).toFixed(1)} ${C}" transform="rotate(-90 32 32)" stroke-linecap="round"/>` : ''}<text x="32" y="37" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">${pct(m, P.length)}%</text></svg>
        <div><div style="font-size:18px;font-weight:600">${m} of ${P.length} mastered</div><div class="cap">${r ? `${newM ? '+' : ''}${newM} in the last ${r} days` : `${startedN} started so far`}</div></div></div>
      <div class="metrics"><div class="metric"><div class="cap">Cards reviewed</div><div class="n">${rev.toLocaleString()}</div></div><div class="metric"><div class="cap">Quiz accuracy</div><div class="n">${qq ? pct(qc, qq) + '%' : '–'}</div></div></div>
      <p class="gf">Mastered means you recalled the card correctly at an interval of 3 weeks or more.</p>
      <div class="h3">Mastery by exam section</div>
      <div class="grp">${D.sections.map((s, i) => { const st = secStats(i); return `<button class="row" data-a="progSec" data-sec="${i}"><span class="grow">${esc(s.short)}</span><span class="bar"><i style="width:${st.pct}%"></i></span><span class="val" style="width:38px">${st.pct}%</span></button>`; }).join('')}</div>
      <div class="h3">Study calendar</div>
      <div class="grp"><div class="heat">${cells.join('')}</div><p class="small" style="padding:4px 16px 12px">${sk.cur ? `${plural(sk.cur, 'day')} in a row` : 'No current streak'}, longest ${plural(sk.best, 'day')}. Darker squares mean more cards and questions.</p></div>
      <div class="h3">Upcoming reviews</div>
      <div class="grp"><div class="fc">${fc.map(v => `<div>${v || ''}<b style="height:${Math.round((v / fmax) * 100)}%"></b></div>`).join('')}</div>
        <div class="fcl">${fc.map((_, k) => `<span>${k === 0 ? 'Today' : fmtDate(addDays(sod(), k), { weekday: 'short' })}</span>`).join('')}</div></div>
      <div class="h3">Quiz accuracy by difficulty</div>
      <div class="grp">${acc.map(a => `<div class="row static"><span class="grow">${a.l}</span><span class="bar"><i style="width:${a.p}%"></i></span><span class="val" style="width:42px">${a.t ? a.p + '%' : '–'}</span></div>`).join('')}</div>
      <div class="h3">Most missed</div>
      ${worst.length ? `<div class="grp">${worst.slice(0, 5).map(x => `<button class="row" data-a="term" data-id="${x.t.id}"><span class="grow">${esc(disp(x.t))}</span><span class="val">Missed ${x.s}×</span>${chev}</button>`).join('')}</div>
        <div style="margin-top:10px"><button class="btn sec" data-a="studyWorst">Study my ${Math.min(10, worst.length)} most missed</button></div>`
        : '<div class="grp"><div class="empty" style="padding:16px">Cards you miss in reviews or quizzes will show up here.</div></div>'}`;
  },
};

// =========================================================================
// Pushed screens (inside a tab)
// =========================================================================
const PICKS = {
  newPerDay: { title: 'New cards per day', opts: [0, 5, 10, 15, 20, 25, 30, 40, 50].map(v => ({ v, label: v ? String(v) : 'Pause new cards' })) },
  maxReviews: { title: 'Max reviews per day', opts: [[0, 'No limit'], [50, '50'], [100, '100'], [150, '150'], [200, '200']].map(([v, label]) => ({ v, label })) },
  termFormat: { title: 'Term format', opts: [['both', 'Full name and acronym', 'Single-minute exchange of die (SMED)'], ['acr', 'Acronym first', 'SMED'], ['full', 'Full name only', 'Single-minute exchange of die']].map(([v, label, sub]) => ({ v, label, sub })) },
  front: { title: 'Card front shows', opts: [['term', 'Term'], ['def', 'Definition'], ['mixed', 'Mixed']].map(([v, label]) => ({ v, label })) },
  quizLen: { title: 'Default quiz length', opts: [10, 20, 30].map(v => ({ v, label: `${v} questions` })) },
  theme: { title: 'Appearance', opts: [['system', 'Match iPhone setting'], ['light', 'Light'], ['dark', 'Dark']].map(([v, label]) => ({ v, label })) },
};
const pickLabel = k => PICKS[k].opts.find(o => o.v === S.settings[k])?.label || '';
const dateVal = t => (t ? dkey(t) : '');

const VIEWS = {
  section({ sec }) {
    const s = D.sections[sec], st = secStats(sec);
    const ts = filterTerms(pool().filter(t => t.sec === sec));
    let body;
    if (!ts.length) body = '<div class="empty">No terms match these filters.</div>';
    else if (UI.sort === 'bok' && !UI.q.trim()) {
      const groups = {};
      ts.forEach(t => (groups[t.sub] = groups[t.sub] || []).push(t));
      body = Object.entries(groups).map(([sub, list]) => `<div class="gh">${esc(sub.startsWith('Not') ? '' : sub + ' ')}${esc(D.subsections[sub] || sub)}</div><div class="grp" style="margin-top:0">${list.map(t => termRow(t, false)).join('')}</div>`).join('');
    } else body = `<div class="grp">${ts.map(t => termRow(t, false)).join('')}</div>`;
    return `${navbar('', `<button class="ib" data-a="filters" aria-label="Filter and sort" style="padding:0">${ic('filter')}</button>`)}
      <h1 class="lt" style="font-size:28px">${esc(sec === 0 ? 'Fundamentals' : s.name)}</h1>
      <p class="cap">${plural(st.n, 'term')}, ${st.pct}% mastered, ${st.due} due${filtersOn() ? `. Showing ${ts.length} with filters on.` : ''}</p>
      <div style="display:flex;gap:10px;margin:12px 0 4px"><button class="btn" data-a="secStudy" data-sec="${sec}">Study</button><button class="btn sec" data-a="secQuiz" data-sec="${sec}">Quiz</button></div>
      ${body}
      <div class="legend"><span><i class="st new"></i>New</span><span><i class="st learning"></i>Learning</span><span><i class="st struggling"></i>Struggling</span><span><i class="st mastered"></i>Mastered</span></div>`;
  },

  term({ id }) {
    const t = TB[id], c = peek(id), stt = status(id), [a, b] = faceNames(t);
    const q = QB[id];
    const confused = q ? q.wrong.filter(w => w.tid && TB[w.tid]) : [];
    let next = '–';
    if (started(c)) { const dd = Math.round((sod(c.due) - sod()) / DAY); next = c.due <= now() ? 'Due now' : dd <= 0 ? 'Later today' : dd === 1 ? 'Tomorrow' : `In ${dd} days`; }
    const colors = { new: 'var(--text2)', learning: 'var(--orange)', struggling: 'var(--red)', mastered: 'var(--green)', suspended: 'var(--text3)' };
    return `${navbar('', `<button class="ib" data-a="star" data-id="${id}" aria-label="${c?.star ? 'Remove star' : 'Star'}" style="padding:0;color:${c?.star ? 'var(--orange-fill)' : 'var(--accent)'}">${ic(c?.star ? 'starOn' : 'star')}</button><button class="ib" data-a="termMenu" data-id="${id}" aria-label="More options" style="padding:0">${ic('dots')}</button>`)}
      <h1 style="font-size:26px;font-weight:700;margin:8px 0 2px;line-height:1.2">${esc(a)}</h1>${b ? `<p class="cap" style="font-size:15px">${esc(b)}</p>` : ''}
      <div class="chips" style="align-items:center;margin-top:10px"><span class="pill">${esc(secShort(t))}</span><span class="pill gray">${esc(t.bok)}</span>${dotsHtml(t.diff)}</div>
      <div style="margin-top:14px">${renderDef(t.def)}</div>
      ${confused.length ? `<div class="label" style="margin-left:0">Often confused with</div><div class="chips">${confused.map(w => `<button class="chip link-chip" data-a="term" data-id="${w.tid}">${esc(disp(TB[w.tid]))}</button>`).join('')}</div>` : ''}
      ${c?.flag ? `<div class="note warn">${ic('flag')}<span>Flagged: ${esc(c.flag.note || 'no note')}</span></div>` : ''}
      <div class="label" style="margin-left:0">Your history</div>
      <div class="grp"><div class="row static"><span class="grow">Status</span><span class="val" style="color:${colors[stt]}">${STATUS[stt]}</span></div>
        <div class="row static"><span class="grow">Next review</span><span class="val">${next}</span></div>
        <div class="row static"><span class="grow">Times reviewed</span><span class="val">${c?.reps || 0}</span></div>
        <div class="row static"><span class="grow">Quiz record</span><span class="val">${c?.qt ? `${c.qc} of ${c.qt} correct` : 'Not quizzed yet'}</span></div></div>
      <div style="margin:18px 0 6px"><button class="btn" data-a="studyOne" data-id="${id}">Study this card now</button></div>`;
  },

  settings() {
    const row = (label, k) => `<button class="row" data-a="pick" data-k="${k}"><span class="grow">${label}</span><span class="val">${esc(pickLabel(k))}</span>${chev}</button>`;
    const sus = TERMS.filter(t => peek(t.id)?.susp).length;
    return `${navbar('Settings')}
      <div class="gh">Study plan</div><div class="grp">
        <label class="row static"><span class="grow">Exam date</span><input type="date" data-a="examDate" value="${dateVal(S.settings.examDate)}" aria-label="Exam date"></label>
        ${row('New cards per day', 'newPerDay')}${row('Max reviews per day', 'maxReviews')}</div>
      <p class="gf">${esc(planNote())}</p>
      <div class="gh">Cards</div><div class="grp">
        ${row('Term format', 'termFormat')}${row('Card front shows', 'front')}
        <div class="row static"><span class="grow">Show difficulty dots</span>${tog('showDots', S.settings.showDots, 'Show difficulty dots')}</div>
        <div class="row static"><span class="grow">Include terms not in the 2022 BoK<div class="sub">EWMA, CUSUM, hoshin kanri, and 3 more</div></span>${tog('includeNonBok', S.settings.includeNonBok, 'Include terms not in the 2022 BoK')}</div>
        <button class="row" data-a="open" data-v="suspended"><span class="grow">Suspended cards</span><span class="val">${sus}</span>${chev}</button></div>
      <div class="gh">Quiz</div><div class="grp">${row('Default length', 'quizLen')}
        <div class="row static"><span class="grow">Explain each answer</span>${tog('explain', S.settings.explain, 'Explain each answer')}</div></div>
      <div class="gh">App</div><div class="grp">${row('Appearance', 'theme')}
        <button class="row" data-a="open" data-v="data"><span class="grow">Data and backup</span>${chev}</button>
        <button class="row" data-a="install"><span class="grow">How to install on iPhone</span>${chev}</button></div>
      <p class="gf" style="margin-top:14px">Not affiliated with or endorsed by ASQ.</p>`;
  },

  suspended() {
    const ts = TERMS.filter(t => peek(t.id)?.susp);
    return `${navbar('Suspended cards')}
      <p class="cap" style="margin:8px 4px">Suspended cards are left out of reviews and quizzes until you restore them.</p>
      ${ts.length ? `<div class="grp">${ts.map(t => `<div class="row static"><span class="grow">${esc(disp(t))}<div class="sub">${esc(secShort(t))}</div></span><button class="link" data-a="unsusp" data-id="${t.id}">Restore</button></div>`).join('')}</div>`
        : '<div class="empty">No suspended cards. Suspend a card from its menu to take it out of rotation.</div>'}`;
  },

  data() {
    const flags = TERMS.filter(t => peek(t.id)?.flag).length;
    return `${navbar('Data and backup')}
      <div class="gh">Backup</div><div class="grp">
        <button class="row act ico" data-a="export"><span class="lead">${ic('upload')}</span><span class="grow">Export progress</span></button>
        <button class="row act ico" data-a="import"><span class="lead">${ic('download')}</span><span class="grow">Import progress</span></button>
        <div class="row static"><span class="grow">Last backup</span><span class="val">${S.lastBackup ? fmtDate(S.lastBackup) : 'Never'}</span></div></div>
      <p class="gf">Your progress is stored only on this phone. Export saves a small file you can keep in Files or iCloud Drive and import on any device.</p>
      <div class="gh">Flagged terms</div><div class="grp"><button class="row" data-a="open" data-v="flags"><span class="grow">Your flags and notes</span><span class="val">${flags}</span>${chev}</button></div>
      <div class="gh">About</div><div class="grp">
        <div class="row static"><span class="grow">Content version</span><span class="val">${esc(D.version.built)} (${esc(D.version.id)})</span></div>
        <div class="row static"><span class="grow">Content</span><span class="val">${D.version.terms} terms, ${D.version.questions} questions</span></div>
        <button class="row" data-a="open" data-v="sources"><span class="grow">Sources</span>${chev}</button></div>
      <div class="grp" style="margin-top:24px"><button class="row danger" data-a="resetAll">Reset all progress</button></div>
      <p class="gf">Not affiliated with or endorsed by ASQ.</p>`;
  },

  flags() {
    const ts = TERMS.filter(t => peek(t.id)?.flag);
    return `${navbar('Flagged terms', ts.length ? '<button class="link" data-a="shareFlags">Share</button>' : '')}
      <p class="cap" style="margin:8px 4px">Terms you've flagged as possibly wrong or unclear. Share the list with whoever maintains the term workbook.</p>
      ${ts.length ? `<div class="grp">${ts.map(t => `<button class="row" data-a="flagMenu" data-id="${t.id}"><span class="grow">${esc(disp(t))}<div class="sub">${esc(peek(t.id).flag.note || 'No note')}</div></span>${chev}</button>`).join('')}</div>`
        : '<div class="empty">No flags yet. Use Flag for review from any card\'s menu.</div>'}`;
  },

  sources() {
    return `${navbar('Sources')}
      <div class="def sm" style="margin-top:12px">
        <p>Definitions and quiz questions were written for this app and are organized by the 2022 ASQ Certified Six Sigma Black Belt (CSSBB) Body of Knowledge.</p>
        <p>They are based on <i>The ASQ Certified Six Sigma Black Belt Handbook</i>, 4th edition, and <i>The ASQ Certified Six Sigma Black Belt Study Guide</i>, 2nd edition (Mary McShane-Vaughn, editor). For full explanations, formulas, and worked examples, use the Handbook.</p>
        <p>Difficulty ratings are a study aid, not an official ASQ classification.</p>
        <p>This app is not affiliated with or endorsed by ASQ.</p></div>
      <p class="gf" style="margin-top:16px">Content file: ${esc(D.version.source)}</p>`;
  },
};

// =========================================================================
// Full-screen modes
// =========================================================================
const FULL = {
  install() {
    const fromApp = S.settings.onboarded;
    return `<div class="install">
      <img src="icons/apple-touch-icon.png" alt="">
      <h1 style="font-size:24px;font-weight:700;margin:16px 0 6px">Install CSSBB Cards</h1>
      <p class="cap" style="font-size:15px;max-width:320px">Your progress is saved only in the installed app. In a Safari tab, iOS can erase it after 7 days without a visit.</p>
      <div class="grp steps" style="margin-top:22px">
        <div class="row static"><span class="stepn">1</span><span class="grow">Tap <span style="color:var(--accent)">${ic('share')}</span> Share in Safari's toolbar</span></div>
        <div class="row static"><span class="stepn">2</span><span class="grow">Scroll down and tap <b style="font-weight:600">Add to Home Screen</b> ${ic('addHome')}</span></div>
        <div class="row static"><span class="stepn">3</span><span class="grow">Open CSSBB Cards from your Home Screen</span></div></div>
      <p class="small" style="margin-top:12px;max-width:320px">If Share isn't visible, tap the ⋯ button first. On iPad, Share is at the top of the screen.</p>
      <div style="margin-top:auto;padding-top:24px;width:100%">${fromApp
        ? '<button class="btn" data-a="installDone">Done</button>'
        : '<button class="btn txt" data-a="skipInstall">Continue in Safari anyway</button>'}</div></div>`;
  },

  onboard() {
    const s = S.settings;
    if (UI.onboardStep === 1) {
      return `<div class="screen"><p class="cap center" style="margin-top:8px">Step 1 of 2</p>
        <h1 class="lt" style="font-size:28px;margin-top:16px">Set your study plan</h1>
        <p class="cap">You can change any of this later in Settings.</p>
        <div class="grp" style="margin-top:18px">
          <label class="row static"><span class="grow">Exam date</span><input type="date" data-a="examDate" value="${dateVal(s.examDate)}" aria-label="Exam date"></label>
          <div class="row static"><span class="grow">No exam date yet</span>${tog('noExam', !s.examDate, 'No exam date yet')}</div></div>
        <div class="grp">
          <div class="row static"><span class="grow">New cards per day</span><span class="stepper"><button data-a="npd" data-d="-5" aria-label="Fewer">${ic('minus')}</button><span>${s.newPerDay}</span><button data-a="npd" data-d="5" aria-label="More">${ic('plus')}</button></span></div>
          <button class="row" data-a="pick" data-k="maxReviews"><span class="grow">Max reviews per day</span><span class="val">${esc(pickLabel('maxReviews'))}</span>${chev}</button></div>
        <div class="note blue">${ic('info')}<span>${esc(planNote())}</span></div>
        <div class="footer" style="margin-top:auto"><button class="btn" data-a="onNext">Continue</button></div></div>`;
    }
    const opt = (v, l, sub) => `<button class="row" data-a="fmt" data-v="${v}"><span class="grow">${l}<div class="sub">${sub}</div></span>${s.termFormat === v ? `<span style="color:var(--accent)">${ic('check')}</span>` : ''}</button>`;
    return `<div class="screen"><div class="hdr"><button class="link" data-a="onBack">${ic('left')}Back</button><span class="cap">Step 2 of 2</span><span style="width:60px"></span></div>
      <h1 class="lt" style="font-size:28px;margin-top:12px">How should terms appear?</h1>
      <div class="grp" style="margin-top:14px">${opt('both', 'Full name and acronym', 'Single-minute exchange of die (SMED)')}${opt('acr', 'Acronym first', 'SMED')}${opt('full', 'Full name only', 'Single-minute exchange of die')}</div>
      <div class="grp"><div class="row static"><span class="grow">Include terms not in the 2022 BoK<div class="sub">EWMA, CUSUM, hoshin kanri, and 3 more</div></span>${tog('includeNonBok', s.includeNonBok, 'Include terms not in the 2022 BoK')}</div></div>
      <div class="grp"><button class="row act ico" data-a="import"><span class="lead">${ic('download')}</span><span class="grow">Restore from a backup file</span></button></div>
      <div class="footer" style="margin-top:auto"><button class="btn" data-a="onDone">Start studying</button></div></div>`;
  },

  session() {
    const id = SS.ids[SS.i], t = TB[id], c = peek(id) || { s: 'new', ivl: 0, ease: 2.5, lapses: 0 };
    if (!SS.faces[id]) SS.faces[id] = S.settings.front === 'mixed' ? (Math.random() < 0.5 ? 'term' : 'def') : S.settings.front;
    const face = SS.faces[id], [a, b] = faceNames(t), fl = SS.flipped;
    const top = `<div class="top"><span class="pill">${esc(secShort(t))}</span><span style="display:flex;align-items:center;gap:10px">${dotsHtml(t.diff)}<button class="ib star ${c.star ? 'on' : ''}" data-a="star" data-id="${id}" aria-label="${c.star ? 'Remove star' : 'Star'}" style="padding:0;min-width:28px;min-height:28px">${ic(c.star ? 'starOn' : 'star')}</button></span></div>`;
    let mid;
    if (!fl) {
      mid = face === 'term'
        ? `<div class="mid"><div class="term">${esc(a)}</div>${b ? `<div class="termsub">${esc(b)}</div>` : ''}</div><div class="hint">Tap to reveal the definition</div>`
        : `<div class="mid"><div class="small" style="margin-bottom:8px">Which term is this?</div>${renderDef(maskDef(t))}</div><div class="hint">Tap to reveal the term</div>`;
    } else {
      mid = face === 'term'
        ? `<div class="mid" style="justify-content:flex-start"><div class="backname">${esc(fullName(t))}</div>${renderDef(t.def)}</div><div class="hint">${esc(t.bok)}</div>`
        : `<div class="mid" style="justify-content:flex-start"><div class="term" style="font-size:26px;text-align:left">${esc(a)}</div>${b ? `<div class="termsub" style="text-align:left;margin:2px 0 12px">${esc(b)}</div>` : '<div style="height:12px"></div>'}${renderDef(t.def, 'sm')}</div>`;
    }
    const labels = [0, 1, 2, 3].map(r => span(preview(c, r)));
    const foot = fl
      ? `<div class="rates">${['Again', 'Hard', 'Good', 'Easy'].map((l, r) => `<button class="rate ${l.toLowerCase()}" data-a="rate" data-r="${r}">${l}<small>${labels[r]}</small></button>`).join('')}</div><div class="swipe-hint">Swipe left for Again, right for Good</div>`
      : '<button class="btn" data-a="flip">Show answer</button>';
    return `<div class="screen">
      <div class="topbar"><button class="ib" data-a="endSession" aria-label="End session">${ic('x')}</button><span class="t">Card ${SS.i + 1} of ${SS.ids.length}</span><button class="ib" data-a="cardMenu" aria-label="Card options">${ic('dots')}</button></div>
      <div class="pb"><i style="width:${pct(SS.i, SS.ids.length)}%"></i></div>
      <div class="card" id="card" role="button" tabindex="0" aria-label="${fl ? 'Card answer' : 'Flip card'}">${top}${mid}</div>
      <div class="footer">${foot}</div></div>`;
  },

  summary() {
    const mins = Math.max(1, Math.round((SS.end - SS.start) / 60000));
    const tough = Object.entries(SS.again).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const missed = Object.keys(SS.again);
    const unique = [...new Set(SS.undo.map(u => u.id))];
    return `<div class="screen"><div class="center" style="margin-top:28px"><div class="done-mark">${ic('check')}</div>
        <h1 style="font-size:24px;font-weight:700;margin:12px 0 2px">Session complete</h1>
        <p class="cap">${plural(unique.length, 'card')} studied in ${plural(mins, 'minute')}</p></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:18px">${['Again', 'Hard', 'Good', 'Easy'].map((l, i) => `<div class="metric center" style="padding:10px 4px"><div class="n" style="font-size:20px">${SS.counts[i]}</div><div class="small">${l}</div></div>`).join('')}</div>
      ${tough.length ? `<div class="h3">Toughest this session</div><div class="grp">${tough.map(([id, n]) => `<button class="row" data-a="peekTerm" data-id="${id}"><span class="grow">${esc(disp(TB[id]))}</span><span class="val">Again ×${n}</span></button>`).join('')}</div>` : ''}
      <div class="footer stack" style="margin-top:auto;padding-top:22px">
        ${missed.length ? `<button class="btn" data-a="reviewMissed">Review the ${plural(missed.length, 'card')} you missed</button>` : ''}
        <button class="btn ${missed.length ? 'sec' : ''}" data-a="quizSession">Quiz me on this session</button>
        <button class="btn txt" data-a="closeFull">Done</button></div></div>`;
  },

  quiz() {
    const it = QS.items[QS.i], t = TB[it.q.tid], done = it.chosen >= 0;
    const ch = done ? it.opts[it.chosen] : null;
    const opts = it.opts.map((o, k) => {
      let cls = '', key = `<span class="k">${'ABCD'[k]}</span>`, tag = '';
      if (done) {
        if (o.correct) { cls = 'right'; key = `<span class="k">${ic('check')}</span>`; }
        else if (k === it.chosen) { cls = 'wrong'; key = `<span class="k">${ic('x')}</span>`; tag = '<span class="tag">Your answer</span>'; }
        else cls = 'dim';
      }
      return `<button class="choice ${cls}" data-a="answer" data-k="${k}" ${done ? 'aria-disabled="true"' : ''}>${key}<span>${esc(optLabel(o))}</span>${tag}</button>`;
    }).join('');
    let fb = '';
    if (done && S.settings.explain) {
      const star = peek(t.id)?.star;
      fb = (ch.correct
        ? `<div class="explain"><div class="h" style="color:var(--green)">Correct</div>${renderDef(t.def, 'sm')}</div>`
        : `<div class="explain"><div class="h">Why not ${esc(optLabel(ch))}?</div><div class="b">${esc(ch.why)}</div></div>
           <div class="explain"><div class="h">${esc(disp(t))}</div><div class="b">${renderDef(t.def, 'sm')}</div></div>`)
        + `<div class="inline-actions"><button class="link" data-a="peekTerm" data-id="${t.id}">${ic('study')}View card</button><button class="link" data-a="star" data-id="${t.id}">${ic(star ? 'starOn' : 'star')}${star ? 'Starred' : 'Star'}</button></div>`;
    }
    const last = QS.i === QS.items.length - 1;
    return `<div class="screen">
      <div class="topbar"><button class="ib" data-a="endQuiz" aria-label="End quiz">${ic('x')}</button><span class="t">Question ${QS.i + 1} of ${QS.items.length}</span><span class="small" style="text-align:right;color:var(--green)">${QS.correct} ${ic('check')}</span></div>
      <div class="pb"><i style="width:${pct(QS.i + (done ? 1 : 0), QS.items.length)}%"></i></div>
      <div><span class="pill">${esc(secShort(t))}</span></div>
      <div class="prompt">${esc(it.q.prompt)}</div>
      <div>${opts}</div>${fb}
      ${done && S.settings.explain ? `<div class="footer sticky"><button class="btn" data-a="next">${last ? 'See results' : 'Next question'}</button></div>` : ''}</div>`;
  },

  results() {
    const n = QS.items.length, c = QS.correct, p = pct(c, n), C = 169.6;
    const missed = QS.items.map((it, i) => ({ it, i })).filter(x => !x.it.opts[x.it.chosen].correct);
    const recent = S.quizzes.slice(-6, -1);
    const avg = recent.length ? pct(recent.reduce((a, q) => a + q.c, 0), recent.reduce((a, q) => a + q.n, 0)) : null;
    return `<div class="screen">
      <div class="ring" style="margin-top:22px"><svg width="84" height="84" viewBox="0 0 64 64" role="img" aria-label="${p} percent correct"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--grp2)" stroke-width="7"/>${c ? `<circle cx="32" cy="32" r="27" fill="none" stroke="var(--green-fill)" stroke-width="7" stroke-dasharray="${((C * c) / n).toFixed(1)} ${C}" transform="rotate(-90 32 32)" stroke-linecap="round"/>` : ''}<text x="32" y="37" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">${p}%</text></svg>
        <div><h1 style="font-size:24px;font-weight:700;margin:0">${missed.length ? `${c} of ${n} correct` : 'Perfect score'}</h1><p class="cap">${avg !== null ? `Your previous ${plural(recent.length, 'quiz', 'quizzes')} averaged ${avg}%` : 'Your first quiz'}</p></div></div>
      ${missed.length ? `<div class="h3">Missed</div><div class="grp">${missed.map(({ it, i }) => `<button class="row" data-a="qReview" data-i="${i}"><span class="grow">${esc(disp(TB[it.q.tid]))}<div class="sub">You chose ${esc(optLabel(it.opts[it.chosen]))}</div></span>${chev}</button>`).join('')}</div>` : ''}
      <div class="footer stack sticky">
        ${missed.length ? `<button class="btn" data-a="retryQuiz">Retry the ${missed.length} missed</button><button class="btn sec" data-a="studyQuiz">Study these cards</button>` : '<button class="btn" data-a="againQuiz">Take another quiz</button>'}
        <button class="btn txt" data-a="closeFull">Done</button></div></div>`;
  },
};

// =========================================================================
// Actions
// =========================================================================
const A = {
  noop() {}, dismiss() { closeLayer(); },
  op(el) { const fn = OPS[+el.dataset.i]; closeLayer(); fn && fn(); },
  tab(el) {
    const t = el.dataset.tab;
    if (UI.tab === t) UI.stacks[t] = []; else UI.tab = t;
    render();
  },
  back() { back(); },
  settings() { push({ v: 'settings' }); },
  open(el) { push({ v: el.dataset.v }); },
  install() { mode = 'install'; render(); },
  installDone() { mode = null; render(); },
  skipInstall() { UI.installSkipped = true; sessionStorage.setItem('installSkipped', '1'); mode = S.settings.onboarded ? null : 'onboard'; render(); },

  // onboarding
  npd(el) { S.settings.newPerDay = Math.min(50, Math.max(0, S.settings.newPerDay + +el.dataset.d)); save(); render(true); },
  onNext() { UI.onboardStep = 2; render(); },
  onBack() { UI.onboardStep = 1; render(); },
  fmt(el) { S.settings.termFormat = el.dataset.v; save(); render(true); },
  onDone() { S.settings.onboarded = true; saveNow(); mode = null; UI.tab = 'today'; render(); },

  // settings
  set(el) {
    const k = el.dataset.k;
    if (k === 'noExam') { if (S.settings.examDate) S.settings.examDate = null; else S.settings.examDate = addDays(sod(), 60); }
    else S.settings[k] = !S.settings[k];
    save(); render(true);
  },
  pick(el) { const k = el.dataset.k; chooseOne(PICKS[k].title, PICKS[k].opts, S.settings[k], v => { S.settings[k] = v; save(); render(true); }); },
  unsusp(el) { suspendCard(el.dataset.id, () => render(true)); },
  export() { exportProgress(); },
  import() { importProgress(); },
  resetAll() {
    alertBox('Reset all progress?', 'This erases your review history, quiz results, stars, and flags on this phone. Export a backup first if you might want them back.', [
      { label: 'Cancel' },
      { label: 'Reset', cls: 'danger', fn: () => { S.cards = {}; S.days = {}; S.quizzes = []; saveNow(); UI.stacks.today = []; render(); toast('Progress reset'); } },
    ]);
  },
  shareFlags() { shareFlags(); },
  flagMenu(el) {
    const id = el.dataset.id;
    actionSheet(fullName(TB[id]), [
      { label: 'Edit note', icon: 'flag', fn: () => flagCard(id, () => render(true)) },
      { label: 'View term', icon: 'info', fn: () => termSheet(id) },
      { label: 'Remove flag', danger: true, fn: () => { delete card(id).flag; save(); render(true); toast('Flag removed'); } },
    ]);
  },

  // today
  startToday() { const p = todayPlan(); startSession([...p.due, ...p.nw].map(t => t.id)); },
  quickQuiz() { startQuiz(buildQuiz('mixed', S.settings.quizLen)); },
  extraNew() { startSession(newList().slice(0, 10).map(t => t.id)); },
  retryMissed() { startQuiz(questionsFor(shuffle(quizTerms('missed')).slice(0, S.settings.quizLen))); },
  studySec(el) { const sec = +el.dataset.sec; startSession(shuffle(prioritize(live().filter(t => t.sec === sec)).slice(0, sessionLen())).map(t => t.id)); },

  // study tab
  studySrc(el) {
    const v = el.dataset.v;
    const secOpts = () => D.sections.map((s, i) => ({ v: i, label: s.short, count: live().filter(t => t.sec === i).length }));
    const difOpts = () => [1, 2, 3, 4, 5].map(d => ({ v: d, label: ['', '1, very easy', '2, easy', '3, medium', '4, hard', '5, very hard'][d], count: live().filter(t => t.diff === d).length }));
    if (v === 'sec') multiPick('Exam sections', secOpts(), UI.studySecs, set => { UI.studySecs = set; UI.studySrc = set.size ? 'sec' : UI.studySrc; render(true); });
    else if (v === 'diff') multiPick('Difficulty', difOpts(), UI.studyDiffs, set => { UI.studyDiffs = set; UI.studySrc = set.size ? 'diff' : UI.studySrc; render(true); });
    else { UI.studySrc = v; render(true); }
  },
  sessLen(el) { S.settings.sessionLen = +el.dataset.v; save(); render(true); },
  front(el) { S.settings.front = el.dataset.v; save(); render(true); },
  startStudy() { startSession(studyIds()); },

  // quiz tab
  quizSrc(el) {
    const v = el.dataset.v;
    const has = t => QB[t.id];
    if (v === 'sec') multiPick('Exam sections', D.sections.map((s, i) => ({ v: i, label: s.short, count: live().filter(t => t.sec === i && has(t)).length })), UI.quizSecs, set => { UI.quizSecs = set; UI.quizSrc = set.size ? 'sec' : UI.quizSrc; render(true); });
    else if (v === 'diff') multiPick('Difficulty', [1, 2, 3, 4, 5].map(d => ({ v: d, label: ['', '1, very easy', '2, easy', '3, medium', '4, hard', '5, very hard'][d], count: live().filter(t => t.diff === d && has(t)).length })), UI.quizDiffs, set => { UI.quizDiffs = set; UI.quizSrc = set.size ? 'diff' : UI.quizSrc; render(true); });
    else { UI.quizSrc = v; render(true); }
  },
  quizLen(el) { S.settings.quizLen = +el.dataset.v; save(); render(true); },
  startQuiz() { startQuiz(buildQuiz()); },

  // multi-pick sheet
  mp(el) { const v = +el.dataset.v; MP.set.has(v) ? MP.set.delete(v) : MP.set.add(v); renderMulti(); },
  mpAll() { MP.set = MP.set.size === MP.opts.length ? new Set() : new Set(MP.opts.map(o => o.v)); renderMulti(); },
  mpDone() { const m = MP; closeLayer(); m.onDone(m.set); },
  noteSave() { const v = ($('#noteText')?.value || '').trim(); const fn = OPS[0]; closeLayer(); fn && fn(v); },

  // decks
  deckMode(el) { UI.deckMode = el.dataset.v; render(true); },
  section(el) { push({ v: 'section', sec: +el.dataset.sec }); },
  term(el) { closeLayer(); if (mode) { termSheet(el.dataset.id); return; } push({ v: 'term', id: el.dataset.id }); },
  peekTerm(el) { termSheet(el.dataset.id); },
  filters() { filterSheet(); },
  fSort(el) { UI.sort = el.dataset.v; filterSheet(); },
  fDiff(el) { const v = +el.dataset.v; UI.fDiff.has(v) ? UI.fDiff.delete(v) : UI.fDiff.add(v); filterSheet(); },
  fStat(el) { const v = el.dataset.v; UI.fStatus.has(v) ? UI.fStatus.delete(v) : UI.fStatus.add(v); filterSheet(); },
  fReset() { UI.sort = 'bok'; UI.fDiff.clear(); UI.fStatus.clear(); if (layer().innerHTML) filterSheet(); render(true); },
  fDone() { closeLayer(); render(true); },
  secStudy(el) { const sec = +el.dataset.sec; startSession(shuffle(prioritize(filterTerms(live().filter(t => t.sec === sec))).slice(0, sessionLen())).map(t => t.id)); },
  secQuiz(el) { const sec = +el.dataset.sec; startQuiz(questionsFor(shuffle(filterTerms(live().filter(t => t.sec === sec && QB[t.id]))).slice(0, S.settings.quizLen))); },
  star(el) { toggleStar(el.dataset.id); render(true); },
  termMenu(el) { termMenu(el.dataset.id); },
  studyOne(el) { startSession([el.dataset.id]); },

  // progress
  range(el) { UI.range = +el.dataset.v; render(true); },
  progSec(el) { goTab('decks', [{ v: 'section', sec: +el.dataset.sec }]); },
  studyWorst() {
    const ids = pool().map(t => ({ t, s: (peek(t.id)?.qmiss || 0) + (peek(t.id)?.lapses || 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10).map(x => x.t.id);
    startSession(ids);
  },

  // study session
  flip() { if (!SS) return; SS.flipped = !SS.flipped; render(true); },
  rate(el) { rateCurrent(+el.dataset.r); },
  endSession() { endSession(); },
  cardMenu() {
    const id = SS.ids[SS.i], c = peek(id);
    const items = [{ label: c?.star ? 'Remove star' : 'Star this card', icon: 'star', fn: () => { toggleStar(id); render(true); } }];
    if (SS.undo.length) items.push({ label: 'Undo last rating', icon: 'undo', fn: undoRating });
    items.push(
      { label: 'View term details', icon: 'info', fn: () => termSheet(id) },
      { label: 'Suspend card', icon: 'eyeOff', fn: () => { suspendCard(id); SS.ids = SS.ids.filter((x, j) => j < SS.i || x !== id); SS.flipped = false; if (SS.i >= SS.ids.length) finishSession(); else render(); } },
      { label: c?.flag ? 'Edit flag' : 'Flag for review', icon: 'flag', fn: () => flagCard(id) },
      { label: 'Reset card progress', icon: 'reset', danger: true, fn: () => confirmReset(id, () => { SS.flipped = false; render(); }) },
      { label: 'End session', icon: 'x', fn: endSession },
    );
    actionSheet(fullName(TB[id]), items);
  },
  reviewMissed() { startSession(Object.keys(SS.again)); },
  quizSession() { startQuiz(questionsFor(shuffle([...new Set(SS.ids)].map(id => TB[id])).slice(0, Math.max(S.settings.quizLen, 10)))); },
  closeFull() { SS = null; QS = null; mode = null; render(); },

  // quiz session
  answer(el) { answer(+el.dataset.k); },
  next() { nextQuestion(); },
  endQuiz() { endQuiz(); },
  qReview(el) { reviewQuestion(+el.dataset.i); },
  retryQuiz() { startQuiz(QS.items.filter(it => !it.opts[it.chosen].correct).map(it => it.q)); },
  studyQuiz() { startSession(QS.items.filter(it => !it.opts[it.chosen].correct).map(it => it.q.tid)); },
  againQuiz() { startQuiz(buildQuiz('mixed', S.settings.quizLen)); },
};

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName === 'INPUT' || el.tagName === 'LABEL') return;
  const fn = A[el.dataset.a];
  if (fn) { if (el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'deckSearch') { UI.q = e.target.value; const box = $('#deckList'); if (box) box.innerHTML = deckListHtml(); }
});
document.addEventListener('change', e => {
  if (e.target.dataset.a === 'examDate') {
    const v = e.target.value;
    if (v) { const [y, m, d] = v.split('-').map(Number); S.settings.examDate = new Date(y, m - 1, d).getTime(); } else S.settings.examDate = null;
    save(); render(true);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && layer().innerHTML) { closeLayer(); return; }
  if (layer().innerHTML || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.tagName === 'BUTTON') return;
  if (mode === 'session') {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); A.flip(); }
    else if (SS?.flipped && '1234'.includes(e.key)) rateCurrent(+e.key - 1);
  } else if (mode === 'quiz') {
    const it = QS.items[QS.i];
    if (it.chosen < 0 && '1234abcd'.includes(e.key.toLowerCase())) answer('1234'.includes(e.key) ? +e.key - 1 : 'abcd'.indexOf(e.key.toLowerCase()));
    else if (it.chosen >= 0 && e.key === 'Enter') nextQuestion();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
  else if (D && !mode && !layer().innerHTML) render(true);
});

// Swipe the answer card: left = Again, right = Good. A tap flips the card.
function bindSwipe() {
  const el = $('#card'); if (!el) return;
  let x0 = 0, y0 = 0, dx = 0, drag = false, down = false;
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-a]')) return;
    down = true; drag = false; x0 = e.clientX; y0 = e.clientY; dx = 0;
  });
  el.addEventListener('pointermove', e => {
    if (!down || !SS?.flipped) return;
    dx = e.clientX - x0; const dy = e.clientY - y0;
    if (!drag && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { drag = true; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch {} }
    if (drag) el.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
  });
  const end = () => {
    if (!down) return; down = false;
    if (!drag) { A.flip(); return; }
    el.classList.remove('drag');
    if (Math.abs(dx) > 90) {
      const r = dx > 0 ? 2 : 0;
      if (reduceMotion()) { rateCurrent(r); return; }
      el.style.transform = `translateX(${dx > 0 ? 130 : -130}%) rotate(${dx > 0 ? 8 : -8}deg)`; el.style.opacity = '0';
      setTimeout(() => rateCurrent(r), 180);
    } else el.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { down = false; drag = false; el.classList.remove('drag'); el.style.transform = ''; });
}

// ---------- start ----------
async function init() {
  DB.db = await DB.open();
  try {
    const st = await DB.get('state');
    if (st && st.v) S = { ...fresh(), ...st, settings: { ...DEF, ...(st.settings || {}) } };
  } catch {}
  applyTheme();
  try {
    const res = await fetch('data/cards.json');
    if (!res.ok) throw new Error(res.status);
    D = await res.json();
  } catch {
    $('#main').innerHTML = '<div class="empty" style="padding-top:35vh">Couldn\'t load the cards. Check your connection, then close and reopen the app.</div>';
    return;
  }
  TERMS = D.terms;
  TERMS.forEach(t => { TB[t.id] = t; });
  D.questions.forEach(q => { QB[q.tid] = q; });
  if (S.contentVersion && S.contentVersion !== D.version.id) setTimeout(() => toast('Cards updated to the latest version'), 800);
  S.contentVersion = D.version.id;
  if (!S.settings.onboarded) mode = isIOS && !standalone() && !UI.installSkipped ? 'install' : 'onboard';
  render();
  save();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();
})();
