(() => {
'use strict';

// ---------------------------------------------------------------------------
// Fixture data (coordinates are in the stage plan's own drawing units)
// ---------------------------------------------------------------------------
const COLORS = {
  red: '#FF0000', orange: '#FF7A00', yellow: '#FFE600', green: '#00E040', cyan: '#00F0FF',
  blue: '#1E50FF', purple: '#9B30FF', pink: '#FF40E9', white: '#FFFFFF',
};
const CYCLO = ['none', 'cyan', 'blue', 'orange', 'red', 'green', 'pink'];
const EFFECTS = [
  ['none', 'Stage wash'], ['flash', 'Flashing'], ['alt', 'Alternating'],
  ['fastfade', 'Fast fading'], ['slowfade', 'Slow fading'],
  ['party', 'Stationary party'], ['moveparty', 'Moving party'],
  ['chase', 'Dimmer chase'],
];
// Effects with their own usual tempo; every other effect runs at the song's tempo.
const EFFECT_BPM = { chase: 130, party: 50, moveparty: 50 };
const FACE_LEVELS = ['Off', 'Low', 'Mid', 'High'];
const SIDE_TYPES = [['sheen', 'Sheen'], ['mid', 'Mid'], ['head', 'Head']];
const SIDES = ['L', 'R'];
const WARM = [1, 0.945, 0.745];
const ZERO = [0, 0, 0];

const STAGE = { x0: 495, x1: 1505, y0: 218, y1: 828, cx: 1000, cy: 523 };
const LED_X = [707, 780, 853, 926, 1000, 1074, 1147, 1220, 1293];
const LED_ROWS = [{ y: 272, first: 27 }, { y: 382, first: 18 }, { y: 611, first: 9 }];
const SPOT_X = [840, 953, 1000, 1047, 1157];
const SPOT_ROWS = [{ y: 311, first: 85 }, { y: 505, first: 80 }, { y: 723, first: 75 }];
const FACE_X = [684, 729, 777, 827, 877, 926, 1074, 1119, 1167, 1217, 1267, 1316];
const FACE_Y = 1062;
const SIDE_Y = [303, 383, 502, 604, 715];
const SIDE_X = { L: 412, R: 1588 };
const CURTAIN_Y = [230, 338, 357, 443, 531, 631, 737];
// Nine aiming zones: a 3 x 3 grid as wide as the cyclorama and as deep as the stage,
// numbered left to right, back to front.
const ZONES = { x: 624, w: 253, y: 218, h: 203.3 };       // left edge and size of one zone
const ZONE_X = [750.5, 1003.5, 1256.5];
const ZONE_Y = [320, 523, 726];
const ZONE_NAMES = ['Back L', 'Back C', 'Back R', 'Mid L', 'Mid C', 'Mid R', 'Front L', 'Front C', 'Front R', 'Cyclorama'];
const CYCLO_ZONE = 10;       // aiming here points the beam at the cyclorama itself, not the floor
const PEOPLE_AT = [[830, 455], [1000, 425], [1170, 455], [745, 600], [885, 680], [1000, 610], [1115, 680], [1255, 600]];

// 3D units: 1 unit is about a metre; the stage is roughly 10 wide and 6 deep.
const RIG_H = 5;
const SIDE_H = { sheen: 1.4, mid: 0.85, head: 0.3 };
const to3 = (x, y) => [(x - STAGE.cx) / 101, (y - STAGE.cy) / 101];
const rand = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clone = (o) => JSON.parse(JSON.stringify(o));
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const RGB = {};
for (const name in COLORS) RGB[name] = hex2rgb(COLORS[name]);

// LEDs and spotlights come from the project's layout: a list of { id, x, y } for each.
// The template below is the KDT TB UCC stage; a project can move, add and remove them.
function templateLayout() {
  const leds = [], spots = [];
  LED_ROWS.forEach((r) => LED_X.forEach((x, col) => leds.push({ id: 'F' + (r.first - col), x, y: r.y })));
  SPOT_ROWS.forEach((r) => SPOT_X.forEach((x, col) => spots.push({ id: String(r.first - col), x, y: r.y })));
  return { leds, spots };
}
// Sort fixtures into rows (back to front) and columns (left to right) by where they sit.
// Fixtures within about a third of a metre of depth of each other count as one row.
// Effects, quick picks and aiming all work from these rows and columns.
function inRows(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x), rows = [];
  for (const item of sorted) {
    const row = rows[rows.length - 1];
    if (row && item.y - row[0].y <= 30) row.push(item); else rows.push([item]);
  }
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));
  return rows;
}
const LEDS = [], SPOTS = [], LED_ROW_Y = [];       // filled by useLayout once the project is known
let ledRows = 0, spotRows = 0;
function useLayout(layout) {
  LEDS.length = SPOTS.length = LED_ROW_Y.length = 0;
  const leds = inRows(layout.leds), spots = inRows(layout.spots);
  ledRows = leds.length; spotRows = spots.length;
  leds.forEach((items, row) => {
    LED_ROW_Y.push(items.reduce((sum, it) => sum + it.y, 0) / items.length);
    items.forEach((it, col) => {
      const idx = LEDS.length, [x3, z3] = to3(it.x, it.y);
      LEDS.push({ id: it.id, x: it.x, y: it.y, x3, z3, row, col, idx, s1: rand(idx + 1), s2: rand(idx + 101), s3: rand(idx + 201) });
    });
  });
  spots.forEach((items, row) => items.forEach((it) => {
    const [x3, z3] = to3(it.x, it.y);
    SPOTS.push({ id: it.id, x: it.x, y: it.y, x3, z3, row });
  }));
}
const SIDE_Z = SIDE_Y.map((y) => to3(0, y)[1]);
const PEOPLE = PEOPLE_AT.map(([x, y]) => { const [x3, z3] = to3(x, y); return { x3, z3 }; });
const CYC = { z: -3.15, halfW: 3.8, top: 4.6 };     // the cyclorama: how far upstage, half its width, its height

// Where each aimed LED lands, in plan units. LEDs sent to the same zone fan out across
// it in the same arrangement they hang in, so together they cover the zone instead of
// all meeting at its centre. A lone LED lands in the middle.
function aimTargets(look) {
  const groups = {}, out = {};
  for (const led of LEDS) {
    const zone = look.aim && look.aim[led.id];
    if (zone) (groups[zone] = groups[zone] || []).push(led);
  }
  for (const zone in groups) {
    const leds = groups[zone], cx = ZONE_X[(zone - 1) % 3], cy = ZONE_Y[Math.floor((zone - 1) / 3)];
    const cols = leds.map((l) => l.col), rows = leds.map((l) => l.row);
    const c0 = Math.min(...cols), c1 = Math.max(...cols), r0 = Math.min(...rows), r1 = Math.max(...rows);
    for (const led of leds) {
      const u = c1 > c0 ? (led.col - c0) / (c1 - c0) - 0.5 : 0, v = r1 > r0 ? (led.row - r0) / (r1 - r0) - 0.5 : 0;
      if (+zone === CYCLO_ZONE) {
        // Pick a point on the cyclorama (spread across its width, a row of LEDs per
        // height), then carry the line from the fixture through it on down to floor
        // level, which is how every aim is stored. The third and fourth numbers are
        // where to draw the plan's aim line to: the cyclorama bar.
        const wx = u * CYC.halfW * 1.85, wy = 1.5 - v * 1.3, along = (RIG_H - wy) / RIG_H;   // low on the wall, edge to edge
        const tx = led.x3 + (wx - led.x3) / along, tz = led.z3 + (CYC.z - led.z3) / along;
        out[led.id] = [tx * 101 + STAGE.cx, tz * 101 + STAGE.cy, wx * 101 + STAGE.cx, 218];
      } else {
        out[led.id] = [cx + u * ZONES.w * 0.72, cy + v * ZONES.h * 0.62];
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// State. A "look" is everything the lights are doing; `state` is the live look
// being edited, and each cue stores its own copy of one.
// ---------------------------------------------------------------------------
const blankLook = () => ({
  leds: {}, aim: {}, spots: {}, face: 0,
  sideTypes: { sheen: false, mid: false, head: false },
  sidePos: { L: [false, false, false, false, false], R: [false, false, false, false, false] },
  cyclo: 'none', effect: 'none', bpm: 120,
});
// Projects. Everything is kept on this device. The list of projects is one entry in
// local storage; each project's lights and cues are stored under keys that carry its id.
// Which project is open is remembered per browser tab, so the app starts on the project
// list and a reload stays inside the project you were in.
const TEMPLATE = 'KDT TB UCC Layout';        // the only stage layout so far
const LOOK_KEY = 'kdt-lighting-v1', SHOW_KEY = 'kdt-lighting-show-v1', LAYOUT_KEY = 'slp-layout-v1', PROJECTS_KEY = 'slp-projects-v1';
const PER_ITEM = [LOOK_KEY, SHOW_KEY];             // the layout is the project's; lights and cues are each item's
const raw = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
  del(key) { try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ } },
};
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const projectKey = (key, id) => `${key}:${id}`;
let projects = raw.get(PROJECTS_KEY, null);
if (!projects) {
  // First run of the projects version: a show made before it becomes the first project.
  projects = [];
  const oldLook = raw.get(LOOK_KEY, null), oldShow = raw.get(SHOW_KEY, null);
  if (oldLook || (oldShow && oldShow.cues && oldShow.cues.length)) {
    const id = newId();
    raw.set(projectKey(LOOK_KEY, id), oldLook || {});
    raw.set(projectKey(SHOW_KEY, id), oldShow || {});
    projects.push({ id, name: (oldShow && oldShow.projectName) || 'My first project', template: TEMPLATE, created: Date.now(), updated: Date.now(), cues: oldShow && oldShow.cues ? oldShow.cues.length : 0 });
  }
  raw.set(PROJECTS_KEY, projects);
}
// A project holds one or more items (one dance each); every item has its own track, cues
// and lights, and they all share the project's stage layout. A project from before items
// becomes a project with one item, which keeps the project's id so its saved data still fits.
if (projects.some((p) => !Array.isArray(p.items))) {
  for (const p of projects) if (!Array.isArray(p.items)) p.items = [{ id: p.id, name: 'Item 1', cues: p.cues || 0, updated: p.updated, thumb: p.thumb }];
  raw.set(PROJECTS_KEY, projects);
}
let currentId = null, currentItemId = null;
try { currentId = sessionStorage.getItem('slp-open'); currentItemId = sessionStorage.getItem('slp-item'); } catch (e) { /* no session storage */ }
if (!projects.some((p) => p.id === currentId)) currentId = null;
const currentProject = () => projects.find((p) => p.id === currentId);
if (!currentId || !currentProject().items.some((it) => it.id === currentItemId)) currentItemId = null;
const currentItem = () => (currentItemId ? currentProject().items.find((it) => it.id === currentItemId) : null);
const saveProjects = () => raw.set(PROJECTS_KEY, projects);

// Stage templates: where the LEDs and spotlights sit when a project starts. One is built
// in; the rest are saved from the layout editor and kept on this device.
const TEMPLATES_KEY = 'slp-templates-v1';
const BUILTIN = { id: 'kdt-tb-ucc', name: TEMPLATE, builtin: true, get layout() { return templateLayout(); } };
const SCRATCH = { id: 'blank', name: 'Blank stage', layout: { leds: [], spots: [] } };
let templates = raw.get(TEMPLATES_KEY, []);
const saveTemplates = () => raw.set(TEMPLATES_KEY, templates);
const findTemplate = (id) => (id === SCRATCH.id ? SCRATCH : templates.find((t) => t.id === id) || BUILTIN);
const copyLayout = (layout) => ({ leds: layout.leds.map(({ id, x, y }) => ({ id, x, y })), spots: layout.spots.map(({ id, x, y }) => ({ id, x, y })) });
const templateName = () => (currentProject() && currentProject().template) || TEMPLATE;

// The rest of the app reads and writes through `store`. Lights and cues go to the open
// item, the layout to its project (and nowhere when a list is showing); anything else is
// app-wide.
const store = {
  owner(key) { return key === LAYOUT_KEY ? currentId : PER_ITEM.includes(key) ? currentItemId : undefined; },
  get(key, fallback) {
    const id = this.owner(key);
    if (id === undefined) return raw.get(key, fallback);
    return id ? raw.get(projectKey(key, id), fallback) : fallback;
  },
  set(key, value) {
    const id = this.owner(key);
    if (id === undefined) return raw.set(key, value);
    if (!id || !currentItemId) return;
    raw.set(projectKey(key, id), value);
    const project = currentProject(), item = currentItem();
    project.updated = item.updated = Date.now();
    item.cues = show.cues.length;
    project.cues = project.items.reduce((n, it) => n + (it.cues || 0), 0);
    saveProjects();
  },
};

// Soundtracks are too big for local storage, so each item's audio file lives in the
// browser's database instead and is loaded again when the item opens.
const audioStore = {
  db: null,
  open() {
    return this.db || (this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open('slp-audio', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('tracks');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  },
  async run(mode, work) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', mode), request = work(tx.objectStore('tracks'));
      tx.oncomplete = () => resolve(request && request.result);
      tx.onerror = () => reject(tx.error);
    });
  },
  put(id, file) { return this.run('readwrite', (s) => s.put(file, id)).catch(() => {}); },
  get(id) { return this.run('readonly', (s) => s.get(id)).catch(() => null); },
  del(id) { return this.run('readwrite', (s) => s.delete(id)).catch(() => {}); },
};

// The project's own layout if it has been customised, otherwise the template.
let layout = store.get(LAYOUT_KEY, null) || templateLayout();
useLayout(layout);

let state = Object.assign(blankLook(), store.get(LOOK_KEY, {}));
let show = Object.assign({ cues: [], trackName: '' }, store.get(SHOW_KEY, {}));
if (currentProject()) show.projectName = currentProject().name;      // the project list holds the name
const prefs = Object.assign(
  { people: true, theme: window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' },
  store.get('kdt-lighting-prefs-v1', {}));
const selection = new Set();

// Line icons, drawn on a 16 x 16 grid with a thin stroke
const ICONS = {
  menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  back: '<path d="M9.5 3.5 5 8l4.5 4.5"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  person: '<circle cx="8" cy="5" r="2.4"/><path d="M3.5 13.5c.4-2.7 2.2-4.1 4.5-4.1s4.1 1.4 4.5 4.1"/>',
  sun: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2"/>',
  moon: '<path d="M13.2 9.6A5.6 5.6 0 1 1 6.4 2.8a4.4 4.4 0 0 0 6.8 6.8z"/>',
  expand: '<path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"/>',
  collapse: '<path d="M6 3v3H3M13 6h-3V3M10 13v-3h3M3 10h3v3"/>',
  download: '<path d="M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M3 13.5h10"/>',
  play: '<path d="M5 3.2v9.6L12.5 8z"/>',
  pause: '<path d="M5.5 3.5v9M10.5 3.5v9"/>',
  prev: '<path d="M4 3.5v9M12 3.5 6 8l6 4.5z"/>',
  next: '<path d="M12 3.5v9M4 3.5 10 8l-6 4.5z"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  minus: '<path d="M3 8h10"/>',
  note: '<path d="M6.5 11.5v-8l6-1.2v8"/><circle cx="4.7" cy="11.5" r="1.8"/><circle cx="10.7" cy="10.3" r="1.8"/>',
  pencil: '<path d="M10.8 2.8l2.4 2.4-7.6 7.6-3 .6.6-3zM9.3 4.3l2.4 2.4"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M6.8 7v4M9.2 7v4"/>',
  comment: '<path d="M2.5 3.5h11V11h-6l-3 2.5V11h-2z"/>',
  undo: '<path d="M6 3.5l-3 3 3 3M3 6.5h6.5a3 3 0 0 1 0 6h-2"/>',
  redo: '<path d="M10 3.5l3 3-3 3M13 6.5H6.5a3 3 0 0 0 0 6h2"/>',
  panelLeft: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M6.5 3v10"/>',
  panelRight: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M9.5 3v10"/>',
};
const svgIcon = (name) => `<svg viewBox="0 0 16 16">${ICONS[name]}</svg>`;
const BLANK = blankLook();

// `follow` is true while the cue timeline drives the lights; a manual edit turns it
// off until the playhead reaches another cue.
let follow = false, loadedIdx = -2, lastIdx = -2, scrubbing = false, cueSeq = 0;
const player = { audio: null, url: null, playing: false, t: 0, peaks: null };

// A manual edit to the live look. If the playhead is on a cue, the edit is saved
// straight into that cue.
function commit() {
  const idx = activeCue(currentTime());
  if (idx >= 0) { show.cues[idx].look = clone(state); loadedIdx = idx; saveShow(); }
  else follow = false;
  store.set('kdt-lighting-v1', state);
  syncUI();
  record();
}
function saveShow() { store.set('kdt-lighting-show-v1', show); }

// Undo history: whole snapshots of the live look and the cue list.
const history = { undo: [], redo: [] };
let saved = '';
const snapshot = () => JSON.stringify({ state, cues: show.cues });
function record() {             // call after a change the user made
  const now = snapshot();
  if (now === saved) return;
  history.undo.push(saved);
  if (history.undo.length > 100) history.undo.shift();
  history.redo.length = 0;
  saved = now;
  showHistory();
}
function showHistory() {
  $('undo').disabled = !history.undo.length;
  $('redo').disabled = !history.redo.length;
}
function stepHistory(from, to) {
  if (!from.length) return;
  to.push(saved);
  saved = from.pop();
  const data = JSON.parse(saved);
  state = data.state; show.cues = data.cues;
  store.set('kdt-lighting-v1', state);
  saveShow(); renderCues(); syncUI();
  syncToPlayhead();
  showHistory();
}

// ---------------------------------------------------------------------------
// Frames. Every light is reduced to plain numbers so two looks can be blended
// for cue fades and every change can be eased over a few milliseconds.
//   per LED: r, g, b (already scaled by brightness), aim x, aim z, beam width
// ---------------------------------------------------------------------------
const L = 6;
const O_SPOT = LEDS.length * L, O_FACE = O_SPOT + SPOTS.length, O_TYPE = O_FACE + 1, O_POS = O_TYPE + 3, O_CYC = O_POS + 10;
const FRAME_N = O_CYC + 3;

// Random fade pulses: each LED runs its own offset timeline of segments, and each
// segment is either a fade up and down or dark.
function randomFade(led, beat, rate) {
  const p = beat * rate + led.s1 * 7;
  const seg = Math.floor(p);
  if (rand(led.idx * 31 + seg * 17) > 0.6) return 0;
  return Math.sin(Math.PI * (p - seg));
}

// Dimmer chase: all three rows fade slowly in and out on the same curve, but each starts
// later than the one behind it: the back row first, then the mid row, then the front row.
const CHASE = { cycle: 9, stagger: 3, low: 0.05 };      // beats per fade in and out; beats between rows
function chaseLevel(beat, row) {
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * (beat - row * CHASE.stagger) / CHASE.cycle);
  return CHASE.low + (1 - CHASE.low) * wave;
}

function compute(look, t, out) {
  const beat = t * (look.bpm || 120) / 60;
  const targets = aimTargets(look);
  for (const led of LEDS) {
    const o = led.idx * L, name = look.leds[led.id], aimed = targets[led.id];
    let tx = led.x3, tz = led.z3, k = 0, wide = 1;
    if (aimed) [tx, tz] = to3(aimed[0], aimed[1]);
    if (name) {
      k = 1;
      switch (look.effect) {
        case 'flash': k = beat % 1 < 0.5 ? 1 : 0; break;
        case 'alt': k = (Math.floor(beat) + led.col) % 2 === 0 ? 1 : 0; break;
        case 'fastfade': k = 0.5 - 0.5 * Math.cos(beat * 2 * Math.PI); break;
        case 'slowfade': k = 0.5 - 0.5 * Math.cos(beat * 0.5 * Math.PI); break;
        case 'party': k = randomFade(led, beat, 1); break;
        case 'chase':
          k = chaseLevel(beat, led.row);
          break;
        case 'moveparty':                      // stays lit the whole time; only the beams move
          tx += Math.sin(beat * 0.45 + led.s2 * 6.28) * 2.4;
          tz += Math.sin(beat * 0.33 + led.s3 * 6.28) * 1.8;      // far enough upstage to brush the cyclorama
          break;
      }
    }
    const c = name ? RGB[name] : ZERO;
    out[o] = c[0] * k; out[o + 1] = c[1] * k; out[o + 2] = c[2] * k;
    out[o + 3] = tx; out[o + 4] = tz; out[o + 5] = wide;
  }
  SPOTS.forEach((s, i) => { out[O_SPOT + i] = look.spots[s.id] ? 1 : 0; });
  out[O_FACE] = look.face / 3;
  SIDE_TYPES.forEach(([id], i) => { out[O_TYPE + i] = look.sideTypes[id] ? 1 : 0; });
  SIDES.forEach((side, s) => look.sidePos[side].forEach((on, j) => { out[O_POS + s * 5 + j] = on ? 1 : 0; }));
  const c = look.cyclo === 'none' ? ZERO : RGB[look.cyclo];
  out[O_CYC] = c[0]; out[O_CYC + 1] = c[1]; out[O_CYC + 2] = c[2];
}

const target = new Float32Array(FRAME_N), shown = new Float32Array(FRAME_N), scratch = new Float32Array(FRAME_N);

function activeCue(T) {
  let idx = -1;
  for (let i = 0; i < show.cues.length; i++) if (show.cues[i].time <= T) idx = i;
  return idx;
}

// What the cue list says the stage looks like at track time T.
function timelineFrame(T, t, out) {
  const idx = activeCue(T);
  if (idx < 0) return compute(BLANK, t, out);
  const cue = show.cues[idx];
  const a = cue.instant || !(cue.fade > 0) ? 1 : clamp01((T - cue.time) / cue.fade);
  compute(cue.look, t, out);
  if (a >= 1) return;
  compute(idx > 0 ? show.cues[idx - 1].look : BLANK, t, scratch);
  const s = a * a * (3 - 2 * a);
  for (let i = 0; i < FRAME_N; i++) out[i] = scratch[i] + (out[i] - scratch[i]) * s;
}

// Nothing switches truly instantly: every value eases to its target in about 2 ms
// (so it lands on the next drawn frame), and beam aim takes a little longer, like a
// fixture swinging round.
function ease(dt) {
  const a = 1 - Math.exp(-dt / 0.002), b = 1 - Math.exp(-dt / 0.15);
  for (let i = 0; i < FRAME_N; i++) {
    const isAim = i < O_SPOT && (i % L === 3 || i % L === 4);
    shown[i] += (target[i] - shown[i]) * (isAim ? b : a);
  }
}

// ---------------------------------------------------------------------------
// People: rough stand-ins that pick up whatever light lands on them.
// Each gets a colour for head, torso and legs.
// ---------------------------------------------------------------------------
// What lands on each figure, kept apart by where it comes from, since each kind of light
// falls on a body differently:
//   [0-2] LED light: colour from above; a wide wash, so it spills well down the body
//   [3]   face light: even, from the front
//   [4-6] side light from stage left, at head / torso / leg height
//   [7-9] side light from stage right, the same
//   [10]  spotlight: white from above; a tight beam, so mostly head and shoulders
const figures = PEOPLE.map(() => new Float32Array(11));

// An LED beam is about 50% strong at the fixture and 10% where it lands. Beams that land
// on the same spot share the floor between them, so a pile of them adds up to about 20%
// there and no more. `ground` holds each LED's strength at the floor.
const TOP = 0.5, LANDING = 0.1, LANDING_MAX = 0.2, REACH = 1.5;
const ground = new Float32Array(LEDS.length);

// A beam swung far enough upstage hits the cyclorama before it reaches the floor.
// Returns where on the cyclorama it lands and how far along the beam that is (0-1),
// or null if it reaches the floor.
function cycloHit(led, tx, tz) {
  if (tz >= CYC.z || led.z3 <= CYC.z) return null;
  const s = (CYC.z - led.z3) / (tz - led.z3);
  const x = led.x3 + (tx - led.x3) * s, y = RIG_H * (1 - s);
  if (Math.abs(x) > CYC.halfW || y > CYC.top) return null;
  const dx = tx - led.x3, dz = tz - led.z3, length = Math.hypot(dx, RIG_H, dz);
  return {
    x, y, s,
    strength: ground[led.idx] + (TOP - ground[led.idx]) * Math.pow(1 - s, 2.4),
    radius: 0.5 + 1.4 * s,                                   // the beam is wider the further it has travelled
    stretch: Math.min(1.9, length / Math.max(Math.abs(dz), 0.05)),   // a glancing beam smears into a longer oval
    fade: Math.min(1, (CYC.z - tz) / 0.7),                   // eases in as the beam climbs onto the wall
    angle: Math.atan2(-RIG_H, dx),                           // which way the oval points, on the wall
  };
}
// Light on the cyclorama keeps the LED's own colour.
const washed = (v) => v;
function shareGround(D) {
  for (const a of LEDS) {
    const oa = a.idx * L;
    let crowd = 0;
    for (const b of LEDS) {
      const ob = b.idx * L, k = Math.max(D[ob], D[ob + 1], D[ob + 2]);
      if (k < 0.01) continue;
      const d = Math.hypot(D[oa + 3] - D[ob + 3], D[oa + 4] - D[ob + 4]) / REACH;
      crowd += k * Math.exp(-d * d);
    }
    ground[a.idx] = Math.min(LANDING, LANDING_MAX / Math.max(crowd, 1e-3));
  }
}
const tone = (v) => 1 - Math.exp(-1.1 * v);
const UNLIT = 0.055;        // a figure with no light on it: nearly black, not grey

// LEDs are wide washes, so their colour is the main tint on a figure. Spot, face and
// side lights are white: they mostly make the figure brighter in the colour it already
// has, and only show as plain warm white where there is little LED colour.
// 1 right next to a light, falling away with distance; `half` is where it drops to a half.
const nearness = (distance, half) => 1 / (1 + (distance / half) * (distance / half));
const FACE_AT = { z: to3(0, FACE_Y)[1] }, SIDE_AT = 5.6;
function lightFigures(D) {
  PEOPLE.forEach((p, n) => {
    const out = figures[n];
    let r = 0, g = 0, b = 0, spot = 0;
    for (const led of LEDS) {
      const o = led.idx * L;
      if (D[o] + D[o + 1] + D[o + 2] < 0.01) continue;
      const d = Math.hypot(D[o + 3] - p.x3, D[o + 4] - p.z3) / REACH;
      // a beam thrown a long way across the stage arrives weaker than one pointing straight down
      const thrown = Math.hypot(D[o + 3] - led.x3, RIG_H, D[o + 4] - led.z3);
      const w = Math.exp(-d * d) * ground[led.idx] / LANDING * 0.5 * Math.pow(RIG_H / thrown, 1.5);
      r += D[o] * w; g += D[o + 1] * w; b += D[o + 2] * w;
    }
    SPOTS.forEach((s, i) => {                  // brightest directly underneath, fading towards the edge
      const off = Math.hypot(s.x3 - p.x3, s.z3 - p.z3) / 1.6;
      if (off < 1) spot += Math.pow(1 - off * off, 1.5) * D[O_SPOT + i] * 0.75;
    });
    // compress the brightness only, so strong coloured light keeps its hue
    const m = Math.max(r, g, b, 1e-4), k = tone(m) / m;
    out[0] = r * k; out[1] = g * k; out[2] = b * k;
    out[10] = tone(spot);

    // Every light is stronger on whoever stands nearer to it.
    out[3] = D[O_FACE] * 0.82 * nearness(FACE_AT.z - p.z3, 6);        // face lights hang out front

    const sheen = D[O_TYPE], mid = D[O_TYPE + 1], low = D[O_TYPE + 2];
    for (let side = 0; side < 2; side++) {
      let reach = 0;
      for (let j = 0; j < 5; j++) reach += D[O_POS + side * 5 + j] * Math.max(0, 1 - Math.abs(SIDE_Z[j] - p.z3) / 1.3);
      // side lights stand in the wings and do not throw far: strong on the near side of the
      // stage, weak by the middle, almost nothing on the far side
      reach = Math.min(1, reach) * 1.3 * nearness(Math.abs(p.x3 - (side === 0 ? -SIDE_AT : SIDE_AT)), 2.8);
      out[4 + side * 3] = sheen * 0.5 * reach;                           // head
      out[5 + side * 3] = Math.min(1, sheen + mid * 0.4) * reach;        // torso
      out[6 + side * 3] = Math.min(1, mid * 0.6 + low) * reach;          // legs
    }
  });
}
// How much light from above reaches the head, torso and legs. LEDs are soft and wide, so
// plenty reaches the legs; a spotlight is tight and mostly catches the top of the body.
const LED_SHARE = [1, 0.8, 0.58], SPOT_SHARE = [1, 0.5, 0.2];

// ---------------------------------------------------------------------------
// Stage plan (SVG)
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const svg = $('plan');
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, text, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  (parent || svg).appendChild(n);
  return n;
}
const label = (x, y, text, cls) => el('text', { x, y, 'text-anchor': 'middle', class: cls || '' }, text);

const planEls = { leds: {}, aims: {}, spots: {}, face: [], side: { L: [], R: [] } };

// Selection: `selection` holds LEDs; spotlights and side positions have their own sets.
const selSpots = new Set(), selSides = new Set();
let aiming = false;        // true while the plan is waiting for a zone to be tapped
let selCyclo = false;      // the cyclorama can be selected too, to bring up its colours
const anySelected = () => selCyclo || selection.size + selSpots.size + selSides.size > 0;
function clearSelection() { selection.clear(); selSpots.clear(); selSides.clear(); selCyclo = false; }
const toggleIn = (set, key) => { set.has(key) ? set.delete(key) : set.add(key); };

// The part of the drawing on screen. Phones crop to the stage so fixtures are as large
// as possible; pinching zooms further in.
const mqPhone = window.matchMedia('(max-width: 899px)');
const FULL = { x: 250, y: 110, w: 1500, h: 1010 };       // the whole drawing, face lights included
const baseView = () => (mqPhone.matches ? { x: 372, y: 150, w: 1256, h: 730 } : Object.assign({}, FULL));
let view = baseView();
function applyView() {
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const base = baseView();
  $('plan-reset').hidden = Math.abs(view.w - base.w) < base.w * 0.02 && Math.abs(view.x - base.x) < 8 && Math.abs(view.y - base.y) < 8;
}
function resetView() { view = baseView(); applyView(); }
function svgPointAt(x, y) {
  const p = svg.createSVGPoint();
  p.x = x; p.y = y;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function panTo(anchor, cx, cy) {       // slide the view so `anchor` sits under a screen point
  // the view can travel anywhere over the whole drawing, not just its starting crop
  const now = svgPointAt(cx, cy);
  view.x = Math.max(FULL.x, Math.min(FULL.x + FULL.w - view.w, view.x + anchor.x - now.x));
  view.y = Math.max(FULL.y, Math.min(FULL.y + FULL.h - view.h, view.y + anchor.y - now.y));
  applyView();
}
function zoomTo(width, anchor, cx, cy) {
  const base = baseView();
  view.w = Math.max(base.w * 0.3, Math.min(FULL.w, width));      // can zoom out to the whole drawing
  view.h = view.w * base.h / base.w;
  applyView();
  panTo(anchor, cx, cy);
}

// A fixture is a group: an invisible, generous tap area plus the shape you see.
// Taps are worked out from pointer events (not click), so a swipe that starts on a
// light can still become a selection box. A second tap within a moment is a double tap.
let suppressTapsUntil = 0;
const fxTap = new WeakMap();
function fixture(hit, shape, onTap, onDouble, parent) {
  const g = el('g', { class: 'fx clickable' }, null, parent);
  el(hit[0], Object.assign({ class: 'hit' }, hit[1]), null, g);
  const n = el(shape[0], shape[1], shape[2], g);
  fxTap.set(g, { onTap, onDouble, last: 0 });
  return n;
}
function tapFixture(g) {
  const h = fxTap.get(g), now = performance.now();
  if (!h || now < suppressTapsUntil) return;
  if (h.onDouble && now - h.last < 350) { h.last = 0; h.onDouble(); } else { h.last = now; h.onTap(); }
}

// Draw the LEDs and spotlights (and their labels and aim lines) into their layer.
// Called once normally, and again after every change while the layout is being edited.
function drawFixtures(leds, spots, editing) {
  const layer = planEls.fixtureLayer;
  layer.textContent = '';
  planEls.leds = {}; planEls.aims = {}; planEls.spots = {};
  const text = (x, y, value) => el('text', { x, y, 'text-anchor': 'middle' }, value, layer);
  const tag = (shape, kind, id) => {             // lets the layout editor find what was pressed
    shape.parentNode.dataset.kind = kind; shape.parentNode.dataset.id = id;
    if (editing && editing.kind === kind && editing.id === id) shape.classList.add('picked');
    return shape;
  };
  const aims = el('g', {}, null, layer);
  const firstRowY = Math.min(...leds.map((l) => l.y));
  for (const led of leds) {
    planEls.aims[led.id] = el('line', { x1: led.x, y1: led.y, x2: led.x, y2: led.y, class: 'aim' }, null, aims);
    planEls.leds[led.id] = tag(fixture(
      ['rect', { x: led.x - 35, y: led.y - 19, width: 70, height: 38 }],
      ['rect', { x: led.x - 23, y: led.y - 13, width: 46, height: 26, rx: 13, class: 'led' }],
      () => { toggleIn(selection, led.id); syncUI(); }, null, layer), 'led', led.id);
    text(led.x, led.y - firstRowY <= 30 ? led.y - 19 : led.y + 29, led.id);    // back row labels sit above
  }
  for (const s of spots) {
    planEls.spots[s.id] = tag(fixture(
      ['circle', { cx: s.x, cy: s.y, r: 23 }],
      ['circle', { cx: s.x, cy: s.y, r: 17, class: 'spot' }],
      () => { toggleIn(selSpots, s.id); syncUI(); },
      () => { selSpots.delete(s.id); state.spots[s.id] = !state.spots[s.id]; commit(); }, layer), 'spot', s.id);
    text(s.x, s.y + 34, s.id);
  }
}

function buildPlan() {
  el('rect', { x: STAGE.x0, y: STAGE.y0, width: STAGE.x1 - STAGE.x0, height: STAGE.y1 - STAGE.y0, rx: 12, class: 'stage' });
  for (const c of [0, 1, 2, 3]) el('line', { x1: ZONES.x + ZONES.w * c, y1: 244, x2: ZONES.x + ZONES.w * c, y2: 816, class: 'grid' });
  for (const y of [421, 625]) el('line', { x1: ZONES.x, y1: y, x2: ZONES.x + ZONES.w * 3, y2: y, class: 'grid' });
  for (let z = 0; z < 9; z++) {
    el('text', { x: ZONES.x + ZONES.w * (z % 3) + ZONES.w - 10, y: ZONES.y + ZONES.h * Math.floor(z / 3) + 192, 'text-anchor': 'end', class: 'zone' }, z + 1);
  }
  planEls.cyclo = fixture(
    ['rect', { x: 624, y: 192, width: 759, height: 52 }],
    ['rect', { x: 624, y: 205, width: 759, height: 26, rx: 6, class: 'cyclo' }],
    () => { selCyclo = !selCyclo; syncUI(); });
  for (const y of CURTAIN_Y) {
    el('line', { x1: 515, y1: y, x2: 609, y2: y, class: 'curtain' });
    el('line', { x1: 1392, y1: y, x2: 1486, y2: y, class: 'curtain' });
  }
  label(1000, 168, 'BACKSTAGE', 'area');
  label(1000, 866, 'STAGE FRONT', 'area');
  label(318, 508, 'STAGE LEFT', 'area');
  label(1684, 508, 'STAGE RIGHT', 'area');
  el('polygon', { points: '581,880 693,920 638,1052 527,1014', class: 'stairs' });
  el('polygon', { points: '1307,920 1419,880 1473,1014 1362,1052', class: 'stairs' });
  label(610, 972, 'STAIRS', 'area'); label(1390, 972, 'STAIRS', 'area');
  el('line', { x1: 522, y1: FACE_Y, x2: 1478, y2: FACE_Y, class: 'rail' });
  label(1000, 1110, 'AUDIENCE', 'area');

  for (const side of SIDES) {
    const x = SIDE_X[side], d = side === 'L' ? 1 : -1;
    SIDE_Y.forEach((y, i) => {
      const key = side + i;
      planEls.side[side].push(fixture(
        ['rect', { x: x - 36, y: y - 30, width: 72, height: 60 }],
        ['polygon', { points: `${x - 22 * d},${y} ${x + 20 * d},${y - 16} ${x + 20 * d},${y + 16}`, class: 'side' }],
        () => { toggleIn(selSides, key); syncUI(); },
        () => { selSides.delete(key); state.sidePos[side][i] = !state.sidePos[side][i]; commit(); }));
    });
  }
  planEls.fixtureLayer = el('g', {});
  drawFixtures(LEDS, SPOTS);
  for (const x of FACE_X) {
    planEls.face.push(fixture(
      ['rect', { x: x - 22, y: FACE_Y - 30, width: 44, height: 60 }],
      ['rect', { x: x - 8, y: FACE_Y - 19, width: 16, height: 38, rx: 8, class: 'face' }],
      () => { state.face = (state.face + 1) % 4; commit(); }));
  }
  // Shown over the stage while choosing where the selected LEDs should point.
  planEls.zonePick = el('g', { class: 'zone-pick' });
  for (let z = 0; z < 9; z++) {
    const x = ZONES.x + ZONES.w * (z % 3), y = ZONES.y + ZONES.h * Math.floor(z / 3);
    fixture(
      ['rect', { x: x + 4, y: y + 4, width: ZONES.w - 8, height: ZONES.h - 8, rx: 10 }],
      ['text', { x: x + ZONES.w / 2, y: y + 128, 'text-anchor': 'middle', class: 'zone-num' }, z + 1],
      () => { aiming = false; forSelection((id) => { state.aim[id] = z + 1; }); },
      null, planEls.zonePick);
  }
  fixture(                                     // zone 10: the cyclorama itself
    ['rect', { x: ZONES.x + 4, y: 184, width: ZONES.w * 3 - 8, height: 34, rx: 8 }],
    ['text', { x: ZONES.x + ZONES.w * 1.5, y: 210, 'text-anchor': 'middle', class: 'zone-num small' }, '10  Cyclorama'],
    () => { aiming = false; forSelection((id) => { state.aim[id] = CYCLO_ZONE; }); },
    null, planEls.zonePick);
  applyView();
}

// One finger: a tap toggles the light under it (or deselects on empty space), and a
// swipe from anywhere drags a selection box. Two fingers pinch to zoom and pan.
const svgPoint = (e) => svgPointAt(e.clientX, e.clientY);
const pointers = new Map();
let drag = null, pinch = null;
const twoFingers = () => {
  const [a, b] = [...pointers.values()];
  return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};
svg.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    if (drag && drag.rect) drag.rect.remove();
    drag = null;
    const t = twoFingers();
    pinch = { dist: t.dist, width: view.w, anchor: svgPointAt(t.x, t.y) };
    return;
  }
  if (pointers.size > 2) return;
  if (layoutMode) return layoutPress(e);
  drag = { fx: e.target.closest('.fx'), x: e.clientX, y: e.clientY, start: svgPoint(e), rect: null };
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
});
svg.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const t = twoFingers();
    zoomTo(pinch.width * pinch.dist / t.dist, pinch.anchor, t.x, t.y);
    suppressTapsUntil = performance.now() + 400;     // lifting fingers after a pinch is not a tap
    return;
  }
  if (layoutMode) return layoutDrag(e);
  if (!drag || aiming) return;
  if (!drag.rect && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  if (!drag.rect) drag.rect = el('rect', { class: 'box' });
  const p = svgPoint(e), s = drag.start;
  const r = { x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) };
  drag.area = r;
  drag.rect.setAttribute('x', r.x); drag.rect.setAttribute('y', r.y);
  drag.rect.setAttribute('width', r.w); drag.rect.setAttribute('height', r.h);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (layoutMode) { moving = null; return; }
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.rect) {
    const r = d.area, inside = (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    for (const led of LEDS) if (inside(led.x, led.y)) selection.add(led.id);
    for (const s of SPOTS) if (inside(s.x, s.y)) selSpots.add(s.id);
    for (const side of SIDES) SIDE_Y.forEach((y, i) => { if (inside(SIDE_X[side], y)) selSides.add(side + i); });
    d.rect.remove();
  } else if (performance.now() < suppressTapsUntil) {
    return;
  } else if (d.fx) {
    return tapFixture(d.fx);
  } else if (aiming) {
    aiming = false;                       // tapping outside the zones cancels aiming
  } else {
    clearSelection();
  }
  syncUI();
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
// Trackpad pinch or Cmd + scroll zooms the plan; plain scrolling pans it once zoomed in.
svg.addEventListener('wheel', (e) => {
  const zooming = e.ctrlKey || e.metaKey;
  if (!zooming && view.w > FULL.w * 0.98) return;
  e.preventDefault();
  const anchor = svgPointAt(e.clientX, e.clientY);
  if (zooming) zoomTo(view.w * (1 + e.deltaY * (e.metaKey ? 0.001 : 0.01)), anchor, e.clientX, e.clientY);
  else panTo(anchor, e.clientX - e.deltaX, e.clientY - e.deltaY);
}, { passive: false });

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const ui = { face: [], sideTypes: {}, cyclo: {} };

function button(parent, text, cls, onClick) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}

function forSelection(fn) { for (const id of selection) fn(id); commit(); }
const each = (selector, fn) => document.querySelectorAll(selector).forEach(fn);

function buildControls() {
  for (const name in COLORS) {
    const b = button($('led-colors'), '', 'swatch', () => forSelection((id) => { state.leds[id] = name; }));
    b.style.background = COLORS[name]; b.title = name;
  }
  button($('led-colors'), '', 'swatch off', () => forSelection((id) => { delete state.leds[id]; })).title = 'off';
  $('aim-down').addEventListener('click', () => { aiming = false; forSelection((id) => { delete state.aim[id]; }); });
  $('aim-zone').addEventListener('click', () => { aiming = !aiming; syncUI(); });
  $('deselect').addEventListener('click', () => { clearSelection(); syncUI(); });
  each('[data-sel-spots]', (b) => b.addEventListener('click', () => {
    for (const id of selSpots) state.spots[id] = b.dataset.selSpots === 'on';
    commit();
  }));
  each('[data-sel-sides]', (b) => b.addEventListener('click', () => {
    for (const key of selSides) state.sidePos[key[0]][+key[1]] = b.dataset.selSides === 'on';
    commit();
  }));

  // Quick picks above the plan, e.g. "led:all", "spot:1" (a row) or "side:all".
  // one button per row of LEDs and of spotlights, however many rows the layout has
  const rowNames = (n) => (n === 3 ? ['Back', 'Mid', 'Front'] : n === 2 ? ['Back', 'Front'] : Array.from({ length: n }, (_, i) => 'Row ' + (i + 1)));
  for (const [kind, box, rows] of [['led', $('led-picks'), ledRows], ['spot', $('spot-picks'), spotRows]]) {
    box.textContent = '';
    button(box, 'All', 'btn', () => {}).dataset.pick = kind + ':all';
    if (rows > 1 && rows <= 6) rowNames(rows).forEach((name, i) => { button(box, name, 'btn', () => {}).dataset.pick = `${kind}:${i}`; });
  }
  each('[data-pick]', (b) => b.addEventListener('click', () => {
    const [kind, which] = b.dataset.pick.split(':');
    const match = (item) => which === 'all' || item.row === +which;
    clearSelection();
    if (kind === 'led') for (const led of LEDS) if (match(led)) selection.add(led.id);
    if (kind === 'spot') for (const s of SPOTS) if (match(s)) selSpots.add(s.id);
    if (kind === 'side') for (const side of SIDES) for (let i = 0; i < 5; i++) selSides.add(side + i);
    syncUI();
  }));

  FACE_LEVELS.forEach((name, i) => ui.face.push(button($('face'), name, 'btn', () => { state.face = i; commit(); })));
  for (const [id, name] of SIDE_TYPES) {
    ui.sideTypes[id] = button($('side-types'), name, 'btn', () => { state.sideTypes[id] = !state.sideTypes[id]; commit(); });
  }
  for (const name of CYCLO) {
    const b = button($('cyclo-colors'), '', 'swatch' + (name === 'none' ? ' off' : ''), () => { state.cyclo = name; commit(); });
    if (name !== 'none') b.style.background = COLORS[name];
    b.title = name;
    ui.cyclo[name] = b;
  }

  const effect = $('effect');
  for (const [id, name] of EFFECTS) effect.add(new Option(name, id));
  effect.addEventListener('change', () => {
    // leaving a song-tempo effect: remember its tempo so the next one can return to it
    if (!EFFECT_BPM[state.effect]) { show.songBpm = state.bpm; saveShow(); }
    state.effect = effect.value;
    state.bpm = EFFECT_BPM[state.effect] || show.songBpm || state.bpm;
    commit();
  });
  $('bpm').addEventListener('input', () => {
    const v = +$('bpm').value;
    if (v < 20 || v > 300) return;
    state.bpm = v;
    if (!EFFECT_BPM[state.effect]) { show.songBpm = v; saveShow(); }   // typed for a song-tempo effect
    commit();
  });
  // The "BPM" label doubles as a button: it puts the loaded track's detected tempo in the field.
  $('bpm-detect').addEventListener('click', () => {
    if (!show.detectedBpm) return toast('Load a track with the note button to detect its BPM', 3500);
    state.bpm = show.songBpm = show.detectedBpm;
    saveShow();
    commit();
    toast(`BPM set to ${show.detectedBpm}, detected from the track`, 2500);
  });
  $('reset').addEventListener('click', () => { state = blankLook(); clearSelection(); commit(); });
  $('people').addEventListener('click', () => { prefs.people = !prefs.people; applyPrefs(); });
  $('theme').addEventListener('click', () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); });
  $('watch').addEventListener('click', () => setWatch(!document.body.classList.contains('watch')));
  $('wide').innerHTML = svgIcon('expand');
  $('wide').addEventListener('click', () => setWide(!document.body.classList.contains('wide')));
  $('plan-reset').addEventListener('click', resetView);
  $('layout-add-led').addEventListener('click', () => layoutAdd('led'));
  $('layout-add-spot').addEventListener('click', () => layoutAdd('spot'));
  $('layout-delete').addEventListener('click', layoutDelete);
  $('layout-number').addEventListener('change', layoutRenumber);
  $('layout-done').addEventListener('click', layoutDone);
  $('layout-cancel').addEventListener('click', () => location.reload());
  $('layout-template').addEventListener('click', () => {
    const template = copyLayout(findTemplate(currentProject() && currentProject().templateId).layout), had = new Set([...layout.leds, ...layout.spots].map((it) => it.id));
    const keep = (list) => list.map((it) => (had.has(it.id) ? Object.assign({ was: it.id }, it) : it));
    work = { leds: keep(template.leds), spots: keep(template.spots), picked: null };
    redrawLayout();
  });
  // Keep the layout being edited as a template for new projects.
  $('layout-save-tpl').addEventListener('click', () => {
    const field = $('layout-tpl-name'), name = field.value.trim();
    if (!name) { field.focus(); return toast('Give the template a name first.', 2500); }
    templates.unshift({ id: 't' + newId(), name, layout: copyLayout(work), created: Date.now() });
    saveTemplates();
    field.value = '';
    toast(`Saved "${name}" to My templates.`, 3000);
  });
  $('undo').addEventListener('click', () => stepHistory(history.undo, history.redo));
  $('redo').addEventListener('click', () => stepHistory(history.redo, history.undo));
  mqPhone.addEventListener('change', resetView);

  // Phone layout: one preview at a time, stage-wide controls in tabs.
  each('[data-view-pick]', (b) => b.addEventListener('click', () => { document.body.dataset.view = b.dataset.viewPick; syncUI(); }));
  each('[data-tab-pick]', (b) => b.addEventListener('click', () => { document.body.dataset.tab = b.dataset.tabPick; syncUI(); }));

  // "More" menu
  $('more').addEventListener('click', (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; });
  $('menu').addEventListener('click', (e) => { if (!e.target.closest('label, input, .menu-icons')) $('menu').hidden = true; e.stopPropagation(); });
  $('menu').addEventListener('change', (e) => { if (e.target.type === 'file') $('menu').hidden = true; });
  document.addEventListener('click', () => { $('menu').hidden = true; });

  // Hide or show the side panels (desktop)
  each('[data-icon]', (el) => el.insertAdjacentHTML('afterbegin', svgIcon(el.dataset.icon)));
  $('toggle-left').addEventListener('click', () => { prefs.hideLeft = !prefs.hideLeft; applyPrefs(); });
  $('toggle-right').addEventListener('click', () => { prefs.hideRight = !prefs.hideRight; applyPrefs(); });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (layoutMode && e.key !== 'Escape') return;       // shortcuts are for lighting, not layout editing
    if (e.key === 'Escape') {
      if (!$('menu').hidden) $('menu').hidden = true;
      else if (layoutMode) { work.picked = null; redrawLayout(); }
      else if (aiming) { aiming = false; syncUI(); }
      else if (document.body.classList.contains('watch')) setWatch(false);
      else { clearSelection(); syncUI(); }
    } else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault();                       // hide or show both side panels
      prefs.hideLeft = prefs.hideRight = !(prefs.hideLeft && prefs.hideRight);
      applyPrefs();
    } else if (typing) {
      return;                                   // leave text fields their own keys
    } else if (e.key === ' ') {
      e.preventDefault();
      setPlaying(!player.playing);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? stepHistory(history.redo, history.undo) : stepHistory(history.undo, history.redo);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCue) {
      const cue = show.cues.find((c) => c.id === selectedCue);
      if (cue) deleteCue(cue);
    }
  });
}

// ---------------------------------------------------------------------------
// Layout editor: move, add, renumber and delete LEDs and spotlights.
// Changes are made on a working copy; Done saves it to the project and reloads, so
// every view is rebuilt from the new layout. Cancel reloads without saving.
// ---------------------------------------------------------------------------
let layoutMode = false, work = null, moving = null;
const BOUNDS = { x0: STAGE.x0 + 30, x1: STAGE.x1 - 30, y0: STAGE.y0 + 30, y1: STAGE.y1 - 24 };
const numberOf = (id) => +String(id).replace(/^F/, '');
const pickedItem = () => work.picked && work[work.picked.kind + 's'].find((it) => it.id === work.picked.id);

function enterLayout() {
  layoutMode = true;
  clearSelection(); aiming = false;
  // `was` remembers each fixture's id when editing began, so cues can follow a renumbering
  work = { leds: layout.leds.map((it) => Object.assign({ was: it.id }, it)), spots: layout.spots.map((it) => Object.assign({ was: it.id }, it)), picked: null };
  document.body.classList.add('layout-mode');
  $('deselect').hidden = true;
  redrawLayout();
}
function redrawLayout() {
  drawFixtures(work.leds, work.spots, work.picked);
  const item = pickedItem();
  $('layout-picked').hidden = !item;
  $('layout-none').hidden = !!item;
  if (item) {
    $('layout-kind').textContent = work.picked.kind === 'led' ? 'LED' : 'Spotlight';
    if (document.activeElement !== $('layout-number')) $('layout-number').value = numberOf(item.id);
  }
  $('layout-count').textContent = `${work.leds.length} LEDs, ${work.spots.length} spotlights`;
}
function layoutPress(e) {
  const g = e.target.closest('.fx[data-kind]');
  work.picked = g ? { kind: g.dataset.kind, id: g.dataset.id } : null;
  const item = pickedItem();
  moving = item ? { item, start: svgPoint(e), x: item.x, y: item.y } : null;
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  redrawLayout();
}
function layoutDrag(e) {
  if (!moving) return;
  const p = svgPoint(e), snap = (v) => Math.round(v / 5) * 5;
  moving.item.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, snap(moving.x + p.x - moving.start.x)));
  moving.item.y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, snap(moving.y + p.y - moving.start.y)));
  redrawLayout();
}
function layoutAdd(kind) {
  const list = work[kind + 's'], n = Math.max(0, ...list.map((it) => numberOf(it.id))) + 1;
  const id = kind === 'led' ? 'F' + n : String(n);
  // drop it near the middle of the stage, nudged along so new ones do not stack up
  const spare = list.filter((it) => !it.was).length;
  list.push({ id, x: STAGE.cx - 60 + (spare % 5) * 30, y: STAGE.cy + (kind === 'led' ? -40 : 40) });
  work.picked = { kind, id };
  redrawLayout();
}
function layoutDelete() {
  if (!work.picked) return;
  const key = work.picked.kind + 's';
  work[key] = work[key].filter((it) => it.id !== work.picked.id);
  work.picked = null;
  redrawLayout();
}
function layoutRenumber() {
  const item = pickedItem(), n = Math.floor(+$('layout-number').value);
  if (!item || !(n >= 1)) return redrawLayout();
  const id = work.picked.kind === 'led' ? 'F' + n : String(n);
  if (id !== item.id && work[work.picked.kind + 's'].some((it) => it.id === id)) {
    toast(`${id} is already used in this layout`, 3000);
    $('layout-number').value = numberOf(item.id);
    return;
  }
  item.id = id; work.picked.id = id;
  redrawLayout();
}
// Carry a look over to the edited layout: deleted fixtures drop out, renumbered ones follow.
function relook(look, renamed, alive) {
  const move = (map) => {
    const out = {};
    for (const id in map || {}) { const now = id in renamed ? renamed[id] : id; if (alive.has(now)) out[now] = map[id]; }
    return out;
  };
  look.leds = move(look.leds); look.aim = move(look.aim); look.spots = move(look.spots);
  return look;
}
function layoutDone() {
  const renamed = {}, alive = new Set();
  const before = new Set([...layout.leds, ...layout.spots].map((it) => it.id));
  for (const it of [...work.leds, ...work.spots]) { alive.add(it.id); if (it.was) renamed[it.was] = it.id; }
  for (const id of before) if (!(id in renamed)) renamed[id] = '';        // deleted: maps to nothing
  const plain = (list) => list.map(({ id, x, y }) => ({ id, x, y }));
  layout = { leds: plain(work.leds), spots: plain(work.spots) };
  layoutMode = false;                       // let the saves below go through normally
  relook(state, renamed, alive);
  show.cues.forEach((cue) => relook(cue.look, renamed, alive));
  store.set(LAYOUT_KEY, layout);
  store.set(LOOK_KEY, state);
  saveShow();
  location.reload();
}

// Phone: the preview alone, full screen and in landscape. Where the browser allows it the
// screen really goes full screen and turns; where it does not (iPhone) the page is drawn
// on its side instead, so turning the phone gives the same picture.
let wideFullscreen = false;
async function setWide(on) {
  document.body.classList.toggle('wide', on);
  $('wide').innerHTML = svgIcon(on ? 'collapse' : 'expand');
  $('wide').title = on ? 'Leave full screen' : 'Full screen, landscape';
  try {
    if (on) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      wideFullscreen = true;
      await screen.orientation.lock('landscape');
    } else {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      if (document.fullscreenElement) await document.exitFullscreen();
      wideFullscreen = false;
    }
  } catch (e) { /* not available here: the sideways drawing covers it */ }
  appH = 0; fitWindow();
}
document.addEventListener('fullscreenchange', () => {       // left full screen with the system's own gesture
  if (!document.fullscreenElement && wideFullscreen) { wideFullscreen = false; setWide(false); }
});

function setWatch(on) {
  document.body.classList.toggle('watch', on);
  $('watch').classList.toggle('active', on);
  $('watch').title = on ? 'Exit watch mode' : 'Watch: previews only';
  $('menu').hidden = true;
}

// Draggable dividers. On phones the bars under the preview and the plan change their
// heights. On desktop the same two bars sit between the columns and change the widths
// of the previews and the controls, and a third splits the two previews.
function setupGrips() {
  const root = document.documentElement, main = document.querySelector('main');
  const views = $('views'), plan = document.querySelector('.plan-col'), mods = $('mods');
  const frontView = document.querySelector('.view[data-view="front"]');
  const size = (n, axis) => n.getBoundingClientRect()[axis];
  const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));
  // each: the pref it sets, its limits, and how a drag of d pixels changes it
  const rules = {
    phone: {
      view: (s, d) => ['viewH', clamp(s.view.h + d.y, 70, size(main, 'height') - size(plan, 'height') - 110)],
      plan: (s, d) => ['planH', clamp(s.plan.h + d.y, 70, size(main, 'height') - size(views, 'height') - 110)],
    },
    desktop: {
      view: (s, d) => ['viewsW', clamp(s.view.w - d.x, 240, size(main, 'width') - size(mods, 'width') - 320)],
      plan: (s, d) => ['sideW', clamp(s.side.w + d.x, 220, size(main, 'width') - size(views, 'width') - 320)],
      split: (s, d) => ['frontH', clamp(s.front.h + d.y, 90, size(views, 'height') - 100)],
    },
  };
  const apply = () => {
    for (const [pref, name] of [['viewH', '--view-h'], ['planH', '--plan-h'], ['viewsW', '--views-w'], ['sideW', '--side-w'], ['frontH', '--front-h']]) {
      if (prefs[pref]) root.style.setProperty(name, prefs[pref] + 'px');
    }
  };
  each('.grip', (grip) => {
    let start = null;
    grip.addEventListener('pointerdown', (e) => {
      start = {
        x: e.clientX, y: e.clientY,
        view: { w: size(views, 'width'), h: size(views, 'height') },
        plan: { h: size(plan, 'height') },
        side: { w: size(mods, 'width') },
        front: { h: size(frontView, 'height') },
      };
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      e.preventDefault();
    });
    grip.addEventListener('pointermove', (e) => {
      if (!start) return;
      const rule = rules[mqPhone.matches ? 'phone' : 'desktop'][grip.dataset.grip];
      if (!rule) return;
      const [pref, value] = rule(start, { x: e.clientX - start.x, y: e.clientY - start.y });
      prefs[pref] = value;
      apply();
    });
    const end = () => { if (start) { start = null; store.set('kdt-lighting-prefs-v1', prefs); } };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
  apply();
}

function applyPrefs() {
  document.documentElement.dataset.theme = prefs.theme;
  $('theme').innerHTML = svgIcon(prefs.theme === 'dark' ? 'sun' : 'moon');
  $('theme').title = prefs.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  $('people').classList.toggle('active', prefs.people);
  $('people').title = prefs.people ? 'Hide the people' : 'Show the people';
  document.body.classList.toggle('no-left', !!prefs.hideLeft);
  document.body.classList.toggle('no-right', !!prefs.hideRight);
  store.set('kdt-lighting-prefs-v1', prefs);
}

// Colour the stage plan for a look. `bare` leaves out the selection outlines.
function paintPlan(look, bare) {
  if (layoutMode) return;                  // the plan is showing the layout being edited
  const targets = aimTargets(look);
  for (const led of LEDS) {
    const n = planEls.leds[led.id], c = look.leds[led.id], zone = look.aim[led.id];
    n.style.fill = c ? COLORS[c] : '';
    n.style.filter = c ? `drop-shadow(0 0 6px ${COLORS[c]})` : '';
    n.classList.toggle('lit', !!c);
    n.classList.toggle('selected', !bare && selection.has(led.id));
    const line = planEls.aims[led.id];
    line.style.display = zone ? '' : 'none';
    if (zone) {
      const at = targets[led.id];
      line.setAttribute('x2', at.length > 2 ? at[2] : at[0]);
      line.setAttribute('y2', at.length > 2 ? at[3] : at[1]);
    }
  }
  for (const s of SPOTS) {
    planEls.spots[s.id].classList.toggle('on', !!look.spots[s.id]);
    planEls.spots[s.id].classList.toggle('selected', !bare && selSpots.has(s.id));
    planEls.spots[s.id].parentNode.classList.toggle('sel', !bare && selSpots.has(s.id));   // halo behind it
  }
  for (const n of planEls.face) n.setAttribute('class', 'face f' + look.face);
  for (const side of SIDES) planEls.side[side].forEach((n, i) => {
    n.classList.toggle('on', look.sidePos[side][i]);
    n.classList.toggle('selected', !bare && selSides.has(side + i));
    n.parentNode.classList.toggle('sel', !bare && selSides.has(side + i));
  });
  planEls.cyclo.style.fill = look.cyclo === 'none' ? '' : COLORS[look.cyclo];
  planEls.cyclo.classList.toggle('none', look.cyclo === 'none');
  planEls.cyclo.classList.toggle('selected', !bare && selCyclo);

  // The selection panel shows one section per kind of light that is selected.
}

function syncUI() {
  paintPlan(state);

  // Each section shows its extra controls only while lights of that kind are selected.
  $('deselect').hidden = !anySelected();
  // With a selection, only the sections for the kinds of light selected are shown;
  // with nothing selected, every section is.
  const some = anySelected();
  $('sec-leds').hidden = some && !selection.size;
  $('sec-spots').hidden = some && !selSpots.size;
  $('sec-sides').hidden = some && !selSides.size;
  $('sec-face').hidden = some;
  $('sec-cyclo').hidden = some && !selCyclo;
  $('sel-leds').hidden = !selection.size;
  $('sel-spots').hidden = !selSpots.size;
  $('sel-sides').hidden = !selSides.size;
  const count = (n) => (n ? n + ' selected' : '');
  $('led-count').textContent = count(selection.size);
  $('spot-count').textContent = count(selSpots.size);
  $('side-count').textContent = count(selSides.size);
  if (!selection.size) aiming = false;
  const zones = new Set([...selection].map((id) => state.aim[id] || 0));
  const zone = zones.size === 1 ? [...zones][0] : null;
  $('aim-down').classList.toggle('active', !aiming && zone === 0);
  $('aim-zone').classList.toggle('active', aiming || zone > 0);
  $('aim-zone').textContent = aiming ? 'Tap a zone on the plan' : zone > 0 ? `Zone ${zone} (${ZONE_NAMES[zone - 1]})` : 'Aim at zone';
  planEls.zonePick.style.display = aiming ? '' : 'none';
  const allSame = (values) => values.length > 0 && values.every((v) => v === values[0]);
  const spotStates = [...selSpots].map((id) => !!state.spots[id]);
  const sideStates = [...selSides].map((key) => state.sidePos[key[0]][+key[1]]);
  each('[data-sel-spots]', (b) => b.classList.toggle('active', allSame(spotStates) && spotStates[0] === (b.dataset.selSpots === 'on')));
  each('[data-sel-sides]', (b) => b.classList.toggle('active', allSame(sideStates) && sideStates[0] === (b.dataset.selSides === 'on')));

  ui.face.forEach((b, i) => b.classList.toggle('active', state.face === i));
  for (const id in ui.sideTypes) ui.sideTypes[id].classList.toggle('active', state.sideTypes[id]);
  for (const name in ui.cyclo) ui.cyclo[name].classList.toggle('active', state.cyclo === name);
  each('[data-view-pick]', (b) => b.classList.toggle('active', b.dataset.viewPick === document.body.dataset.view));
  each('[data-tab-pick]', (b) => b.classList.toggle('active', b.dataset.tabPick === document.body.dataset.tab));
  $('effect').value = EFFECTS.some(([id]) => id === state.effect) ? state.effect : 'none';
  if (document.activeElement !== $('bpm')) $('bpm').value = state.bpm;
}

// ---------------------------------------------------------------------------
// Front view (2D canvas). Beams are painted small and scaled up, which blurs
// their edges; each one is brightest at the fixture and fades on the way down.
// ---------------------------------------------------------------------------
const front = $('front');
const ctx = front.getContext('2d');
// The picture is a back wall down to HORIZON, then the stage floor down to FLOOR_Y.
const FW = 750, FH = 440, HORIZON = 312, FLOOR_Y = 404, SOFT = 5, PX = 56;   // PX: pixels per 3D unit of height
const haze = document.createElement('canvas');
haze.width = FW / SOFT; haze.height = Math.ceil(FLOOR_Y / SOFT);
const hctx = haze.getContext('2d');
const css = (r, g, b, a) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${clamp01(a)})`;
const depthScale = (z3) => 0.8 + 0.2 * clamp01((z3 + 3) / 6);   // further back sits closer to the centre
const frontX = (x3, z3) => FW / 2 + x3 * 96 * depthScale(z3);
// Where a fixture sits in the picture. The rig hangs above the top edge, so beams come
// in from off-screen instead of appearing to start in mid-air.
const rigY = (scale) => (1 - scale) * 130 - 44;
const floorY = (z3) => HORIZON + 8 + clamp01((z3 + 3) / 6) * (FLOOR_Y - HORIZON - 14);

function sizeFront() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  front.width = FW * dpr; front.height = FH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// A beam with strength `top` at the fixture falling to `bottom` where it lands.
function softBeam(xt, yt, wt, xb, yb, wb, r, g, b, top, bottom) {
  for (const [w, share] of [[1.6, 0.25], [1, 0.35], [0.5, 0.4]]) {   // wide and faint to narrow core
    const grad = hctx.createLinearGradient(0, yt, 0, yb);
    for (const f of [0, 0.2, 0.45, 1]) {
      grad.addColorStop(f, css(r, g, b, (bottom + (top - bottom) * Math.pow(1 - f, 2.5)) * share));
    }
    hctx.fillStyle = grad;
    hctx.beginPath();
    hctx.moveTo(xt - wt * w / 2, yt); hctx.lineTo(xt + wt * w / 2, yt);
    hctx.lineTo(xb + wb * w / 2, yb); hctx.lineTo(xb - wb * w / 2, yb);
    hctx.closePath(); hctx.fill();
  }
}

// A flattened pool of light lying on the stage floor.
function floorGlow(x, y, rx, ry, r, g, b, a) {
  hctx.save();
  hctx.translate(x, y); hctx.scale(1, ry / rx);
  const grad = hctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, css(r, g, b, a)); grad.addColorStop(1, css(r, g, b, 0));
  hctx.fillStyle = grad;
  hctx.beginPath(); hctx.arc(0, 0, rx, 0, 6.3); hctx.fill();
  hctx.restore();
}

// A soft oval on the back wall, turned to lie along the beam that made it.
function wallGlow(x, y, major, minor, angle, r, g, b, a) {
  hctx.save();
  hctx.translate(x, y); hctx.rotate(angle); hctx.scale(1, minor / major);
  const grad = hctx.createRadialGradient(0, 0, 0, 0, 0, major);
  grad.addColorStop(0, css(r, g, b, a)); grad.addColorStop(0.55, css(r, g, b, a * 0.6)); grad.addColorStop(1, css(r, g, b, 0));
  hctx.fillStyle = grad;
  hctx.beginPath(); hctx.arc(0, 0, major, 0, 6.3); hctx.fill();
  hctx.restore();
}

// A figure is filled nearly black, then each kind of light is added inside its outline:
// top light fading from the crown downwards, face light evenly, side light from the
// edge it comes from, at the height it comes from.
function drawFigure(p, f) {
  const s = depthScale(p.z3), x = frontX(p.x3, p.z3), y = floorY(p.z3), u = PX * s;
  const top = y - 1.78 * u, left = x - 0.3 * u, wide = 0.6 * u;
  const lit = (r, g, b, k) => `rgb(${Math.round(r * k * 255)},${Math.round(g * k * 255)},${Math.round(b * k * 255)})`;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 0.19 * u, y - 0.86 * u, 0.16 * u, 0.86 * u);
  ctx.rect(x + 0.03 * u, y - 0.86 * u, 0.16 * u, 0.86 * u);
  ctx.moveTo(x - 0.24 * u, y - 0.8 * u); ctx.lineTo(x - 0.26 * u, y - 1.38 * u);
  ctx.quadraticCurveTo(x, y - 1.52 * u, x + 0.26 * u, y - 1.38 * u);
  ctx.lineTo(x + 0.24 * u, y - 0.8 * u); ctx.closePath();
  ctx.moveTo(x + 0.14 * u, y - 1.62 * u); ctx.arc(x, y - 1.62 * u, 0.14 * u, 0, 6.3);
  ctx.fillStyle = lit(1, 1, 1.1, UNLIT);
  ctx.fill();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';

  if (f[0] + f[1] + f[2] > 0.01) {             // LED wash: strongest up top, but it reaches the legs
    const g = ctx.createLinearGradient(0, top, 0, y);
    g.addColorStop(0, lit(f[0], f[1], f[2], 1));
    g.addColorStop(0.3, lit(f[0], f[1], f[2], 0.85));
    g.addColorStop(1, lit(f[0], f[1], f[2], 0.5));
    ctx.fillStyle = g; ctx.fillRect(left, top, wide, y - top);
  }
  if (f[10] > 0.01) {                          // spotlight: crown and shoulders catch most of it
    const g = ctx.createLinearGradient(0, top, 0, y);
    g.addColorStop(0, lit(WARM[0], WARM[1], WARM[2], f[10]));
    g.addColorStop(0.2, lit(WARM[0], WARM[1], WARM[2], f[10] * 0.8));
    g.addColorStop(0.42, lit(WARM[0], WARM[1], WARM[2], f[10] * 0.38));
    g.addColorStop(1, lit(WARM[0], WARM[1], WARM[2], f[10] * 0.12));
    ctx.fillStyle = g; ctx.fillRect(left, top, wide, y - top);
  }
  if (f[3] > 0.01) {                           // face light: flat across the whole front
    ctx.fillStyle = lit(WARM[0], WARM[1], WARM[2], f[3]);
    ctx.fillRect(left, top, wide, y - top);
  }
  const bands = [[top, y - 1.45 * u], [y - 1.45 * u, y - 0.8 * u], [y - 0.8 * u, y]];   // head, torso, legs
  for (let side = 0; side < 2; side++) {       // side light: bright on its own edge, gone by the far side
    const from = side === 0 ? left + 0.06 * u : left + wide - 0.06 * u, to = side === 0 ? x + 0.12 * u : x - 0.12 * u;
    bands.forEach(([y0, y1], i) => {
      const amount = f[4 + side * 3 + i];
      if (amount < 0.01) return;
      const g = ctx.createLinearGradient(from, 0, to, 0);
      g.addColorStop(0, lit(WARM[0], WARM[1], WARM[2], amount)); g.addColorStop(1, 'rgb(0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(left, y0, wide, y1 - y0);
    });
  }
  ctx.restore();
}

function drawFront(D) {
  ctx.globalCompositeOperation = 'source-over';
  let g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#08080d'); g.addColorStop(1, '#15151b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, FW, HORIZON);
  const cr = D[O_CYC], cg = D[O_CYC + 1], cb = D[O_CYC + 2];
  if (cr + cg + cb > 0.01) {
    g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, css(cr, cg, cb, 0.5)); g.addColorStop(1, css(cr, cg, cb, 0.22));
    ctx.fillStyle = g; ctx.fillRect(0, 0, FW, HORIZON);
  }
  ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, HORIZON, FW, FLOOR_Y - HORIZON);

  hctx.setTransform(1 / SOFT, 0, 0, 1 / SOFT, 0, 0);
  hctx.globalCompositeOperation = 'source-over';
  hctx.fillStyle = '#000'; hctx.fillRect(0, 0, FW, FLOOR_Y + SOFT);
  hctx.globalCompositeOperation = 'screen';
  for (const led of LEDS) {                    // LEDs: wide washes that also colour the floor
    const o = led.idx * L, k = Math.max(D[o], D[o + 1], D[o + 2]);
    if (k < 0.01) continue;
    const s = depthScale(led.z3), ts = depthScale(D[o + 4]), wide = D[o + 5];
    const r = D[o] / k, gg = D[o + 1] / k, b = D[o + 2] / k;
    const xb = frontX(D[o + 3], D[o + 4]), yb = floorY(D[o + 4]);
    const hit = cycloHit(led, D[o + 3], D[o + 4]);
    if (hit) {                                 // lands on the back wall: stop the beam there
      const xw = frontX(hit.x, CYC.z), yw = HORIZON - hit.y / RIG_H * (HORIZON - rigY(0.8));
      softBeam(frontX(led.x3, led.z3), rigY(s), 24 * s, xw, yw, 150 * 0.8 * hit.s * wide, r, gg, b, TOP * k, hit.strength * k);
      const minor = hit.radius * 60 * wide;
      wallGlow(xw, yw, minor * hit.stretch, minor, Math.atan2(RIG_H * 57, (D[o + 3] - led.x3) * 77),
        washed(r), washed(gg), washed(b), Math.min(0.5, hit.strength * 2.2) * hit.fade * k);
    } else {
      softBeam(frontX(led.x3, led.z3), rigY(s), 24 * s, xb, yb, 150 * ts * wide, r, gg, b, TOP * k, ground[led.idx] * k);
      floorGlow(xb, yb, 125 * ts * wide, 15, r, gg, b, ground[led.idx] * k);
    }
  }
  SPOTS.forEach((sp, i) => {
    const lvl = D[O_SPOT + i];
    if (lvl < 0.01) return;
    const s = depthScale(sp.z3), x = frontX(sp.x3, sp.z3), y = floorY(sp.z3);
    softBeam(x, rigY(s), 20 * s, x, y, 95 * s, WARM[0], WARM[1], WARM[2], 0.4 * lvl, 0.08 * lvl);
    floorGlow(x, y, 62 * s, 9, WARM[0], WARM[1], WARM[2], 0.1 * lvl);
  });
  SIDES.forEach((side, sIdx) => {
    let n = 0;
    for (let j = 0; j < 5; j++) n += D[O_POS + sIdx * 5 + j];
    if (n < 0.01) return;
    const edge = side === 'L' ? 0 : FW, tip = side === 'L' ? FW * 0.26 : FW * 0.74;     // a short throw
    SIDE_TYPES.forEach(([id], t) => {
      const a = D[O_TYPE + t] * (0.07 + 0.03 * n);
      if (a < 0.005) return;
      const y = floorY(0) - SIDE_H[id] * PX * 0.9;
      const grad = hctx.createLinearGradient(edge, 0, tip, 0);
      grad.addColorStop(0, css(WARM[0], WARM[1], WARM[2], a)); grad.addColorStop(1, css(WARM[0], WARM[1], WARM[2], 0));
      hctx.fillStyle = grad;
      hctx.beginPath();
      hctx.moveTo(edge, y - 5); hctx.lineTo(tip, y - 20); hctx.lineTo(tip, y + 20); hctx.lineTo(edge, y + 5);
      hctx.closePath(); hctx.fill();
    });
  });
  if (D[O_FACE] > 0.01) {                        // face lights wash down from above the audience
    const grad = hctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    grad.addColorStop(0, css(WARM[0], WARM[1], WARM[2], 0.02 * D[O_FACE]));
    grad.addColorStop(1, css(WARM[0], WARM[1], WARM[2], 0.1 * D[O_FACE]));
    hctx.fillStyle = grad; hctx.fillRect(0, 0, FW, FLOOR_Y);
  }
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(haze, 0, 0, haze.width, haze.height, 0, 0, haze.width * SOFT, haze.height * SOFT);

  ctx.globalCompositeOperation = 'source-over';
  if (prefs.people) {
    PEOPLE.map((p, i) => i).sort((a, b) => PEOPLE[a].z3 - PEOPLE[b].z3).forEach((i) => drawFigure(PEOPLE[i], figures[i]));
  }
  ctx.fillStyle = '#000'; ctx.fillRect(0, FLOOR_Y, FW, FH - FLOOR_Y);
  ctx.fillStyle = '#9aa0a6'; ctx.textAlign = 'center';
  ctx.font = '500 14px Inter, sans-serif';
  ctx.fillText('Stage', FW / 2, FLOOR_Y + 23);
}

// ---------------------------------------------------------------------------
// 3D view (Three.js). Beams are see-through cones whose shader makes them
// brightest at the fixture, fading on the way down and towards their edges.
// ---------------------------------------------------------------------------
let three = null;

function buildThree() {
  const host = $('three');
  if (!window.THREE) return;
  $('three-fallback').remove();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x05050a);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.1, 200);

  function texture(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d'));
    return new THREE.CanvasTexture(c);
  }
  const poolTex = texture(256, 256, (c) => {
    const img = c.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const d = Math.min(1, Math.hypot(x - 127.5, y - 127.5) / 128);
      const v = Math.pow(1 - d, 1.8) * 255 + (Math.random() - 0.5) * 6;   // noise hides banding
      const o = (y * 256 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = d >= 1 ? 0 : Math.max(0, v);
      img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  });
  const glowTex = texture(4, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#000'); g.addColorStop(0.6, '#fff'); g.addColorStop(1, '#000');
    c.fillStyle = g; c.fillRect(0, 0, 4, 128);
  });
  const glow = (map) => new THREE.MeshBasicMaterial({
    map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beamMaterial = () => new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0, 0, 0) }, low: { value: 0.05 } },   // low: strength at the far end
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vH = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float low; varying vec3 vN; varying vec3 vV; varying float vH;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.5);
        float fall = mix(low, 1.0, pow(vH, 2.4));
        gl_FragColor = vec4(color * edge * fall, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const solid = (color) => new THREE.MeshBasicMaterial({ color });
  const add = (obj, x, y, z, parent) => { obj.position.set(x, y, z); (parent || scene).add(obj); return obj; };

  // A cone whose tip sits at its own origin and which opens downwards.
  function beam(rTop, rBottom, length) {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, length, 28, 1, true);
    geo.translate(0, -length / 2, 0);
    return new THREE.Mesh(geo, beamMaterial());
  }
  function pool(radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), glow(poolTex));
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  const wallSpot = (radius) => new THREE.Mesh(new THREE.CircleGeometry(radius, 32), glow(poolTex));   // faces the audience
  const DOWN = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3();
  const lensGeo = new THREE.SphereGeometry(0.08, 12, 8);
  const lens = (x, y, z) => add(new THREE.Mesh(lensGeo, solid(0x1a1a1f)), x, y, z);
  const setLens = (m, r, g, b) => m.material.color.setRGB(Math.max(0.1, r), Math.max(0.1, g), Math.max(0.11, b));

  // Room
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), solid(0x08080b)), 0, -0.6, 0);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.6, 6.4), solid(0x15151a)), 0, -0.3, 0);
  const cyclo = add(new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.6), solid(0x0c0c11)), 0, 2.3, -3.15);
  for (const y of LED_ROW_Y) add(new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.06, 0.06), solid(0x222228)), 0, RIG_H + 0.1, to3(0, y)[1]);

  const leds = LEDS.map((led) => {
    const pivot = add(new THREE.Group(), led.x3, RIG_H, led.z3);
    const cone = beam(0.12, 1.5, RIG_H); pivot.add(cone);
    return { led, pivot, cone, lens: lens(led.x3, RIG_H, led.z3), pool: add(pool(2.7), led.x3, 0.01, led.z3), wall: add(wallSpot(1), led.x3, 2, CYC.z + 0.03) };
  });
  const spots = SPOTS.map((s) => ({
    cone: add(beam(0.1, 1.2, RIG_H), s.x3, RIG_H, s.z3),
    lens: lens(s.x3, RIG_H, s.z3),
    pool: add(pool(1.6), s.x3, 0.012, s.z3),
  }));

  const sides = [];
  SIDES.forEach((side, sIdx) => {
    const d = side === 'L' ? -1 : 1;
    SIDE_Z.forEach((z, j) => {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), solid(0x222228)), d * 5.75, 0.65, z);
      SIDE_TYPES.forEach(([type], t) => {
        const cone = add(beam(0.05, 0.42, 3.8), d * 5.6, SIDE_H[type], z);     // a short throw
        cone.rotation.z = -d * Math.PI / 2;
        sides.push({ pos: O_POS + sIdx * 5 + j, type: O_TYPE + t, cone, lens: lens(d * 5.6, SIDE_H[type], z) });
      });
    });
  });

  // Face lights hang high above the audience and point down at the front of the stage.
  const faceZ = to3(0, FACE_Y)[1], FACE_H = 5.4;
  const faces = FACE_X.map((px) => {
    const x = to3(px, 0)[0];
    dir.set(x * 0.9 - x, -FACE_H, 1.2 - faceZ);
    const cone = add(beam(0.06, 1.0, dir.length()), x, FACE_H, faceZ);
    cone.quaternion.setFromUnitVectors(DOWN, dir.normalize());
    return { cone, lens: lens(x, FACE_H, faceZ) };
  });
  add(new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 0.06), solid(0x222228)), 0, FACE_H + 0.1, faceZ);
  const faceGlow = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 5), glow(glowTex)), 0, 0.014, 0.9);
  faceGlow.rotation.x = -Math.PI / 2;

  const people = PEOPLE.map((p) => {
    const g = add(new THREE.Group(), p.x3, 0, p.z3);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), solid(0)), 0, 1.62, 0, g);
    const torso = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.62, 14), solid(0)), 0, 1.13, 0, g);
    const legs = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.82, 14), solid(0)), 0, 0.41, 0, g);
    return { g, parts: [head, torso, legs] };
  });

  // Orbit camera
  const orbit = { az: 0.5, el: 0.45, dist: 16, target: new THREE.Vector3(0, 1.7, 0) };
  function placeCamera() {
    const { az, el, dist, target: c } = orbit;
    camera.position.set(c.x + dist * Math.sin(az) * Math.cos(el), c.y + dist * Math.sin(el), c.z + dist * Math.cos(az) * Math.cos(el));
    camera.lookAt(c);
  }
  let last = null;
  host.addEventListener('pointerdown', (e) => { last = [e.clientX, e.clientY]; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => {
    if (!last) return;
    orbit.az -= (e.clientX - last[0]) * 0.008;
    orbit.el = Math.max(0.05, Math.min(1.45, orbit.el + (e.clientY - last[1]) * 0.006));
    last = [e.clientX, e.clientY];
    placeCamera();
  });
  host.addEventListener('pointerup', () => { last = null; });
  host.addEventListener('pointercancel', () => { last = null; });
  host.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;        // plain scrolling moves the page
    e.preventDefault();
    orbit.dist = Math.max(8, Math.min(34, orbit.dist * (1 + e.deltaY * (e.metaKey ? 0.001 : 0.01))));
    placeCamera();
  }, { passive: false });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  placeCamera();

  function update(D) {
    if (!host.clientWidth) return;               // hidden (the phone layout shows one preview at a time)
    for (const f of leds) {
      const o = f.led.idx * L, r = D[o], g = D[o + 1], b = D[o + 2];
      const on = r + g + b > 0.01;
      f.cone.visible = f.pool.visible = on;
      f.wall.visible = false;
      setLens(f.lens, r, g, b);
      if (!on) continue;
      const tx = D[o + 3], tz = D[o + 4], wide = D[o + 5];
      const hit = cycloHit(f.led, tx, tz);       // on the cyclorama: the beam ends there, not on the floor
      dir.set(tx - f.led.x3, -RIG_H, tz - f.led.z3);
      const len = dir.length() * (hit ? hit.s : 1);
      f.pivot.quaternion.setFromUnitVectors(DOWN, dir.normalize());
      f.cone.scale.set(wide * (hit ? hit.s : 1), len / RIG_H, wide * (hit ? hit.s : 1));
      const land = hit ? hit.strength : ground[f.led.idx];
      // the cone is drawn front and back, so each face carries half the strength
      f.cone.material.uniforms.color.value.setRGB(r * TOP / 2, g * TOP / 2, b * TOP / 2);
      f.cone.material.uniforms.low.value = land / TOP;
      if (hit) {
        f.pool.visible = false;
        f.wall.visible = true;
        f.wall.position.set(hit.x, hit.y, CYC.z + 0.03);
        f.wall.scale.set(hit.radius * hit.stretch * wide, hit.radius * wide, 1);
        f.wall.rotation.z = hit.angle;
        const glowK = Math.min(0.8, land * 2.6) * hit.fade, peak = Math.max(r, g, b);
        f.wall.material.color.setRGB(washed(r / peak) * peak * glowK, washed(g / peak) * peak * glowK, washed(b / peak) * peak * glowK);
        continue;
      }
      f.pool.position.set(tx, 0.01, tz);
      f.pool.scale.setScalar(wide);
      f.pool.material.color.setRGB(r * land, g * land, b * land);
    }
    spots.forEach((s, i) => {
      const lvl = D[O_SPOT + i];
      s.cone.visible = s.pool.visible = lvl > 0.01;
      setLens(s.lens, lvl, lvl * 0.95, lvl * 0.75);
      s.cone.material.uniforms.color.value.setRGB(WARM[0] * lvl * 0.15, WARM[1] * lvl * 0.15, WARM[2] * lvl * 0.15);
      s.pool.material.color.setRGB(WARM[0] * lvl * 0.12, WARM[1] * lvl * 0.12, WARM[2] * lvl * 0.12);
    });
    for (const s of sides) {
      const lvl = D[s.pos] * D[s.type];
      s.cone.visible = lvl > 0.01;
      setLens(s.lens, lvl, lvl * 0.95, lvl * 0.75);
      s.cone.material.uniforms.color.value.setRGB(WARM[0] * lvl * 0.14, WARM[1] * lvl * 0.14, WARM[2] * lvl * 0.14);
    }
    const face = D[O_FACE];
    for (const f of faces) {
      f.cone.visible = face > 0.01;
      setLens(f.lens, face, face * 0.95, face * 0.75);
      f.cone.material.uniforms.color.value.setRGB(WARM[0] * face * 0.16, WARM[1] * face * 0.16, WARM[2] * face * 0.16);
    }
    faceGlow.visible = face > 0.01;
    faceGlow.material.color.setRGB(WARM[0] * face * 0.13, WARM[1] * face * 0.13, WARM[2] * face * 0.13);
    cyclo.material.color.setRGB(0.045 + D[O_CYC] * 0.5, 0.045 + D[O_CYC + 1] * 0.5, 0.06 + D[O_CYC + 2] * 0.5);
    people.forEach((p, n) => {
      p.g.visible = prefs.people;
      // each part is one flat colour here, so the two sides are averaged
      const f = figures[n];
      p.parts.forEach((m, i) => {
        const white = f[3] + (f[4 + i] + f[7 + i]) * 0.5 + f[10] * SPOT_SHARE[i], share = LED_SHARE[i];
        m.material.color.setRGB(
          Math.min(1, UNLIT + f[0] * share + WARM[0] * white),
          Math.min(1, UNLIT + f[1] * share + WARM[1] * white),
          Math.min(1, UNLIT + f[2] * share + WARM[2] * white));
      });
    });
    renderer.render(scene, camera);
  }
  three = { update };
}

// ---------------------------------------------------------------------------
// Soundtrack: loading, waveform and tempo detection
// ---------------------------------------------------------------------------
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
function parseTime(text) {
  const parts = String(text).trim().split(':').map(Number);
  if (!parts.length || parts.some(isNaN)) return null;
  return parts.reduce((total, v) => total * 60 + v, 0);
}
const currentTime = () => (player.audio ? player.audio.currentTime : player.t);
function duration() {
  if (player.audio && isFinite(player.audio.duration)) return player.audio.duration;
  const lastCue = show.cues.length ? show.cues[show.cues.length - 1].time : 0;
  return Math.max(60, lastCue + 10);
}

const ICON_PLAY = svgIcon('play');
const ICON_PAUSE = svgIcon('pause');
function setPlaying(on) {
  if (on && currentTime() >= duration() - 0.05) seek(0);
  player.playing = on;
  if (player.audio) on ? player.audio.play().catch(() => setPlaying(false)) : player.audio.pause();
  $('play').innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  $('play').classList.toggle('active', on);
}

function loadCue(idx) {            // copy a cue's look into the live look
  loadedIdx = idx;
  if (idx < 0) return;
  state = clone(show.cues[idx].look);
  store.set('kdt-lighting-v1', state);
  syncUI();
  if (selectedCue !== show.cues[idx].id) {     // the Cue section follows the playhead
    selectedCue = show.cues[idx].id;
    noteOpen = nameEditing = false;
    renderCues();
  }
  saved = snapshot();              // loading a cue is not an edit, so it is not an undo step
}

// Make the live look match whichever cue the playhead is on.
function syncToPlayhead() {
  const idx = activeCue(currentTime());
  loadedIdx = -2;
  if (idx >= 0) loadCue(idx); else loadedIdx = -1;
}

function seek(T) {
  T = Math.max(0, Math.min(duration(), T));
  if (player.audio) player.audio.currentTime = T; else player.t = T;
  follow = true;
  const idx = activeCue(T);
  if (idx !== loadedIdx) loadCue(idx);
}

// Tempo estimate: measure how loud each short slice is, keep the jumps in loudness
// (the hits), then find the beat spacing at which those hits line up best.
function detectBpm(buf) {
  const sr = buf.sampleRate, data = buf.getChannelData(0), hop = 512;
  const start = Math.floor(Math.min(buf.duration * 0.15, 20) * sr);
  const n = Math.floor((Math.min(data.length, start + 90 * sr) - start) / hop);
  if (n < 400) return null;
  const onset = new Float32Array(n);
  let prev = 0, mean = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = start + i * hop, end = j + hop; j < end; j++) sum += data[j] * data[j];
    const rms = Math.sqrt(sum / hop);
    onset[i] = Math.max(0, rms - prev);
    prev = rms; mean += onset[i];
  }
  mean /= n;
  for (let i = 0; i < n; i++) onset[i] -= mean;
  const rate = sr / hop;
  const match = (lag) => {
    let sum = 0;
    for (let i = 0, end = n - Math.ceil(lag) - 1; i < end; i++) {
      const p = i + lag, k = Math.floor(p), f = p - k;
      sum += onset[i] * (onset[k] * (1 - f) + onset[k + 1] * f);
    }
    return sum;
  };
  let best = null, bestScore = -Infinity;
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = 60 / bpm * rate, score = match(lag) + 0.5 * match(lag * 2);
    if (score > bestScore) { bestScore = score; best = bpm; }
  }
  return Math.round(best);
}

function wavePeaks(buf) {
  const data = buf.getChannelData(0), N = 12000, size = Math.floor(data.length / N) || 1;
  const stride = Math.max(1, Math.floor(size / 200)), peaks = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let max = 0;
    for (let j = i * size, end = Math.min(data.length, j + size); j < end; j += stride) max = Math.max(max, Math.abs(data[j]));
    peaks[i] = max;
  }
  return peaks;
}

// `restored` is true when the track is the project's saved one being loaded on open,
// as opposed to a file the user has just picked.
async function loadTrack(file, restored) {
  setPlaying(false);
  if (!restored && currentItemId) audioStore.put(currentItemId, file);
  if (player.url) URL.revokeObjectURL(player.url);
  player.url = URL.createObjectURL(file);
  player.audio = new Audio(player.url);
  player.audio.addEventListener('ended', () => setPlaying(false));
  player.peaks = null;
  show.trackName = file.name; saveShow();
  $('load-track').title = `Track: ${file.name} (tap to load another)`;
  if (!restored) toast(`Analyzing ${file.name}...`);
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const buf = await ac.decodeAudioData(await file.arrayBuffer());
    ac.close();
    player.peaks = wavePeaks(buf);
    const bpm = detectBpm(buf);
    if (bpm) { show.songBpm = show.detectedBpm = bpm; saveShow(); }
    // never overwrite a cue's tempo, or an effect that keeps its own
    if (restored) return;
    if (bpm && !show.cues.length && !EFFECT_BPM[state.effect]) { state.bpm = bpm; commit(); }
    toast(bpm ? `${file.name}: detected ${bpm} BPM` : `${file.name}: no clear beat found`, 3500);
  } catch (e) {
    if (!restored) toast(`${file.name}: could not analyze this file`, 3500);
  }
}

// ---------------------------------------------------------------------------
// Timeline bar
// ---------------------------------------------------------------------------
const wave = $('wave');
const wctx = wave.getContext('2d');
let waveW = 0, waveH = 54;
function sizeWave() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  waveW = wave.clientWidth; waveH = wave.clientHeight || 54;
  wave.width = waveW * dpr; wave.height = waveH * dpr;
  wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// The timeline can be zoomed in: `zoom` 1 shows the whole track, `start` is the time at
// its left edge. Pinch or scroll over it to zoom, swipe sideways with two fingers to move.
//
// On phones the playhead stays in the middle and the track slides under it: drag the
// track to move through it. A ruler along the top shows the time.
const wview = { zoom: 1, start: 0, hold: 0, lastT: 0, auto: true };
const centred = () => mqPhone.matches;
const waveTop = () => (centred() ? 15 : 0);     // room for the ruler
const waveSpan = () => duration() / wview.zoom;
const waveX = (t, width) => (t - wview.start) / waveSpan() * width;
function setWaveView(zoom, start) {
  const dur = duration();
  wview.zoom = Math.max(1, Math.min(Math.max(1, dur / 2), zoom));     // closest: two seconds across
  wview.start = Math.max(0, Math.min(dur - dur / wview.zoom, start));
  if (centred()) wview.start = currentTime() - waveSpan() / 2;
}
// Zoom by `factor`, keeping the time under the pointer where it is; then slide by `pan` pixels.
function zoomWave(factor, clientX, pan) {
  const r = wave.getBoundingClientRect(), f = clamp01((clientX - r.left) / r.width);
  const at = wview.start + f * waveSpan();
  const zoom = Math.max(1, Math.min(Math.max(1, duration() / 2), wview.zoom * factor));
  const span = duration() / zoom;
  wview.auto = false;
  if (centred() && pan) seek(currentTime() + pan / r.width * span);
  setWaveView(zoom, at - f * span + (pan || 0) / r.width * span);
  wview.hold = performance.now() + 1500;        // leave the view alone for a moment
}

function drawWave(T, active) {
  const dark = prefs.theme === 'dark', H = waveH, dur = duration(), x = (t) => waveX(t, waveW);
  const mid = centred(), top = waveTop();
  if (wview.auto) wview.zoom = mid ? dur / 20 : 1;        // until zoomed by hand: 20 seconds across on a phone
  setWaveView(wview.zoom, wview.start);         // the track may have changed length
  // zoomed in: keep the playhead in sight when it moves, unless the view was just moved by hand
  if (!mid && wview.zoom > 1 && T !== wview.lastT && !wavePinch && performance.now() > wview.hold) {
    const span = waveSpan();
    if (T < wview.start || T > wview.start + span) setWaveView(wview.zoom, T - span * (player.playing ? 0.05 : 0.5));
  }
  wview.lastT = T;
  const field = dark ? '#383838' : '#f5f5f5';
  if (mid) {                                    // only the track itself is filled; a ruler runs above it
    wctx.fillStyle = dark ? '#2c2c2c' : '#ffffff'; wctx.fillRect(0, 0, waveW, H);
    const x0 = Math.max(0, x(0)), x1 = Math.min(waveW, x(dur));
    wctx.fillStyle = field; wctx.fillRect(x0, top, x1 - x0, H - top);
    const step = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((sec) => sec * waveW / waveSpan() >= 56) || 600;
    wctx.font = '500 10px Inter, sans-serif'; wctx.textAlign = 'center';
    for (let t = Math.ceil(Math.max(0, wview.start) / step) * step; t <= Math.min(dur, wview.start + waveSpan()); t += step) {
      wctx.fillStyle = dark ? '#9a9a9a' : '#8c8c8c';
      wctx.fillText(t < 60 ? (t % 1 ? t.toFixed(1) : t) + 's' : Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'), x(t), 10);
      wctx.fillStyle = dark ? '#5c5c5c' : '#c8c8c8';
      wctx.fillRect(x(t + step / 2) - 0.5, 5, 1, 4);
    }
  } else {
    wctx.fillStyle = field; wctx.fillRect(0, 0, waveW, H);
  }
  if (player.peaks) {
    wctx.fillStyle = dark ? '#6b6b6b' : '#c4c4c4';
    const N = player.peaks.length, perPx = waveSpan() / waveW / dur * N, first = wview.start / dur * N;
    for (let px = 0; px < waveW; px += 2) {
      const from = Math.floor(first + px * perPx), to = Math.max(from + 1, Math.floor(first + (px + 2) * perPx));
      if (from < 0 || from >= N) continue;      // before the start or past the end of the track
      let peak = 0;
      for (let i = from; i < to && i < N; i++) if (player.peaks[i] > peak) peak = player.peaks[i];
      const h = Math.max(1, peak * (H - top - 8));
      wctx.fillRect(px, top + (H - top - h) / 2, 1.4, h);
    }
  }
  const live = dark ? '#ffffff' : '#1e1e1e';
  wctx.font = '600 10px Inter, sans-serif'; wctx.textAlign = 'left';
  show.cues.forEach((cue, i) => {
    const cx = x(cue.time);
    if (!cue.instant && cue.fade > 0) {          // shaded stretch shows how long the fade lasts
      wctx.fillStyle = dark ? 'rgba(13,153,255,.22)' : 'rgba(13,153,255,.16)';
      wctx.fillRect(cx, top, x(cue.time + cue.fade) - cx, H - top);
    }
    wctx.fillStyle = cue.id === selectedCue ? '#0d99ff' : i === active ? live : (dark ? '#9a9a9a' : '#8c8c8c');
    wctx.fillRect(cx - 1, top, 2, H - top);
    wctx.fillRect(cx - 1, top, 15, 13);
    if (cue.note) { wctx.beginPath(); wctx.arc(cx + 7, H - 7, 3.5, 0, 6.3); wctx.fill(); }   // has a note
    wctx.fillStyle = dark && cue.id !== selectedCue ? '#1e1e1e' : '#fff';
    wctx.fillText(i + 1, cx + 2, top + 10);
  });
  if (mid) {                                    // fixed in the middle, rounded at the top
    wctx.fillStyle = live;
    wctx.fillRect(waveW / 2 - 1.5, 3, 3, H - 3);
    wctx.beginPath(); wctx.arc(waveW / 2, 3, 1.5, 0, 6.3); wctx.fill();
  } else {
    wctx.fillStyle = '#f24822';
    wctx.fillRect(x(T) - 1, 0, 2, H);
  }
  if (!mid && wview.zoom > 1) {                          // a thin bar along the bottom: which part is showing
    wctx.fillStyle = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)';
    wctx.fillRect(0, H - 3, waveW, 3);
    wctx.fillStyle = dark ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)';
    wctx.fillRect(wview.start / dur * waveW, H - 3, Math.max(8, waveW / wview.zoom), 3);
  }
}

const waveTime = (e) => {
  const r = wave.getBoundingClientRect();
  return wview.start + clamp01((e.clientX - r.left) / r.width) * waveSpan();
};
function cueAt(e) {
  const r = wave.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top - waveTop();
  for (let i = show.cues.length - 1; i >= 0; i--) {
    const cx = waveX(show.cues[i].time, r.width);
    if (Math.abs(px - cx) <= 4 || (py >= 0 && py <= 14 && px >= cx - 2 && px <= cx + 15)) return show.cues[i];
  }
  return null;
}
// Press on a cue marker to select it, drag it to move it; anywhere else scrubs.
let cueDrag = null, wavePinch = null, scrubFrom = 0, slide = null;
const waveTouches = new Map();
const pinchState = () => {
  const [a, b] = [...waveTouches.values()];
  return { gap: Math.max(20, Math.abs(a - b)), mid: (a + b) / 2 };
};
wave.addEventListener('pointerdown', (e) => {
  try { wave.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  waveTouches.set(e.pointerId, e.clientX);
  if (waveTouches.size === 2) {                 // second finger: zoom instead of scrubbing
    if (scrubbing) { scrubbing = false; seek(scrubFrom); }      // undo the jump the first finger made
    cueDrag = slide = null;
    wavePinch = pinchState();
    return;
  }
  const cue = cueAt(e);
  if (cue) { cueDrag = { cue, x: e.clientX, moved: false }; selectCue(cue.id); }
  else {
    scrubFrom = currentTime(); scrubbing = true;
    if (centred()) slide = { x: e.clientX, moved: false };      // phone: drag the track under the playhead
    else seek(waveTime(e));
  }
});
wave.addEventListener('pointermove', (e) => {
  if (waveTouches.has(e.pointerId)) waveTouches.set(e.pointerId, e.clientX);
  if (waveTouches.size === 2 && wavePinch) {
    const now = pinchState();
    zoomWave(now.gap / wavePinch.gap, now.mid, wavePinch.mid - now.mid);
    wavePinch = now;
    return;
  }
  wave.style.cursor = cueDrag || cueAt(e) ? 'ew-resize' : 'pointer';
  if (scrubbing && slide) {
    const dx = e.clientX - slide.x;
    if (Math.abs(dx) > 3) slide.moved = true;
    if (slide.moved) seek(scrubFrom - dx / wave.getBoundingClientRect().width * waveSpan());
  } else if (scrubbing) seek(waveTime(e));
  if (!cueDrag) return;
  if (!cueDrag.moved && Math.abs(e.clientX - cueDrag.x) < 4) return;
  cueDrag.moved = true;
  // within a few pixels of the playhead, the cue snaps onto it
  const r = wave.getBoundingClientRect(), T = currentTime();
  const near = Math.abs(e.clientX - (r.left + waveX(T, r.width))) <= 8;
  cueDrag.cue.time = Math.round(Math.max(0, Math.min(duration(), near ? T : waveTime(e))) * 100) / 100;
  sortCues();
});
function endWave(e) {
  waveTouches.delete(e.pointerId);
  if (wavePinch) {                              // a pinch ends once both fingers have lifted
    if (!waveTouches.size) wavePinch = null;
    return;
  }
  if (slide && !slide.moved && e.type === 'pointerup') seek(waveTime(e));     // a tap jumps there
  slide = null;
  scrubbing = false;
  if (!cueDrag) return;
  const { cue, moved } = cueDrag;
  cueDrag = null;
  if (moved) cuesChanged(); else { loadedIdx = -2; seek(cue.time + 0.001); }
}
wave.addEventListener('pointerup', endWave);
wave.addEventListener('pointercancel', endWave);
// Trackpad pinch, Cmd + scroll or a mouse wheel zooms; a sideways scroll moves along the track.
wave.addEventListener('wheel', (e) => {
  e.preventDefault();
  const sideways = !e.ctrlKey && !e.metaKey && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY));
  if (sideways) zoomWave(1, e.clientX, e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX);
  else zoomWave(Math.exp(-e.deltaY * (e.ctrlKey ? 0.02 : 0.004)), e.clientX);
}, { passive: false });

// ---------------------------------------------------------------------------
// Cues
// ---------------------------------------------------------------------------
let selectedCue = null;
function sortCues() { show.cues.sort((a, b) => a.time - b.time); }
function cuesChanged() {          // after a cue is moved, added or deleted
  sortCues(); saveShow(); renderCues();
  record();
  syncToPlayhead();
}
let noteOpen = false;
function selectCue(id) {
  if (id !== selectedCue) noteOpen = nameEditing = false;
  selectedCue = id;
  renderCues();
  if (id) $('mods').scrollTop = 0;       // its settings sit at the top of the controls list
}
function jumpToCue(cue) {
  loadedIdx = -2;
  seek(cue ? cue.time + 0.001 : 0);
  selectCue(cue ? cue.id : null);
}
// Step back to the cue before the playhead (or the start), or on to the next one.
function stepCue(forward) {
  const T = currentTime();
  if (forward) {
    const next = show.cues.find((c) => c.time > T + 0.01);
    if (next) jumpToCue(next);
  } else {
    jumpToCue([...show.cues].reverse().find((c) => c.time < T - 0.3) || null);
  }
}
function deleteCue(cue) {
  show.cues.splice(show.cues.indexOf(cue), 1);
  selectedCue = null;
  cuesChanged();
}

function input(parent, type, cls, value, onChange) {
  const n = document.createElement('input');
  n.type = type; n.className = cls; n.value = value;
  n.addEventListener('change', () => onChange(n));
  parent.appendChild(n);
  return n;
}

// The selected cue is edited in a small strip on the transport bar.
// A cue's own name, or nothing if it was never named. Older cues were auto-named
// "Cue 3"; that counts as unnamed too.
const cueName = (cue) => (/^Cue \d+$/.test(cue.name || '') ? '' : cue.name || '');
const cueLabel = (cue) => {
  const n = 'Cue ' + (show.cues.indexOf(cue) + 1);
  return cueName(cue) ? `${n}: ${cueName(cue)}` : n;
};
const FADES = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 8, 10];   // seconds offered in the transition menu
let nameEditing = false;
function renderCues() {
  const box = $('cue-edit');
  box.textContent = '';
  const cue = show.cues.find((c) => c.id === selectedCue);
  $('sec-cue').hidden = !cue;
  if (!cue) return;
  const iconButton = (name, label, onClick, cls) => {
    const b = button(box, '', 'btn icon' + (cls ? ' ' + cls : ''), onClick);
    b.innerHTML = svgIcon(name);
    b.title = label; b.setAttribute('aria-label', label);
    return b;
  };

  // "Cue 1" or "Cue 1: name", with a pencil that swaps it for a name field
  const tag = document.createElement('span');
  tag.className = 'cue-tag';
  box.appendChild(tag);
  if (nameEditing) {
    tag.textContent = 'Cue ' + (show.cues.indexOf(cue) + 1);
    const name = input(box, 'text', 'name', cueName(cue), () => {});
    name.placeholder = 'Cue name';
    const finish = () => {
      if (!nameEditing) return;
      nameEditing = false;
      if (name.value.trim() !== cueName(cue)) { cue.name = name.value.trim(); saveShow(); record(); }
      renderCues();
    };
    name.addEventListener('blur', finish);
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') name.blur(); });
    name.focus();
  } else {
    tag.textContent = cueLabel(cue);
    tag.title = cueLabel(cue);
    iconButton('pencil', 'Rename cue', () => { nameEditing = true; renderCues(); }, 'bare');
  }

  input(box, 'text', 't', fmt(cue.time), (n) => {
    const t = parseTime(n.value);
    if (t != null && t >= 0) cue.time = t;
    cuesChanged();
  }).title = 'Time in the track';

  // one menu for the transition: instant, or a fade of some length
  const mode = document.createElement('select');
  mode.title = 'Transition into this cue';
  mode.add(new Option('Instant', '0'));
  for (const secs of [...new Set([...FADES, +cue.fade || 1])].sort((x, y) => x - y)) mode.add(new Option(`Fade ${secs} s`, secs));
  mode.value = cue.instant ? '0' : String(+cue.fade || 1);
  mode.addEventListener('change', () => {
    cue.instant = mode.value === '0';
    if (!cue.instant) cue.fade = +mode.value;
    saveShow(); record();
  });
  box.appendChild(mode);

  iconButton('copy', 'Duplicate cue', () => duplicateCue(cue));
  iconButton('trash', 'Delete cue', () => deleteCue(cue));
  // Optional comment for this cue; it goes on the cue's page in the PDF.
  // It opens and closes from the comment button, which carries a dot while the cue has one.
  const noteButton = iconButton('comment', noteOpen ? 'Hide comment' : cue.note ? 'Show comment' : 'Add comment',
    () => { noteOpen = !noteOpen; renderCues(); }, (noteOpen ? 'active' : '') + (cue.note ? ' has-note' : ''));
  if (noteOpen) {
    const note = document.createElement('textarea');
    note.className = 'note'; note.rows = 3; note.value = cue.note || '';
    note.placeholder = 'Comments or remarks for this cue';
    note.addEventListener('change', () => {
      cue.note = note.value.trim(); saveShow(); record();
      noteButton.classList.toggle('has-note', !!cue.note);
    });
    box.appendChild(note);
    if (noteOpen && !cue.note) note.focus();
  }
}

// Copy a cue's look and transition to a new cue. It goes at the playhead; if the
// playhead is still sitting on the original, it goes a moment later, short of the next cue.
function duplicateCue(cue) {
  let time = Math.round(currentTime() * 100) / 100;
  if (show.cues.some((c) => Math.abs(c.time - time) < 0.05)) {
    const next = show.cues.find((c) => c.time > cue.time + 0.05);
    time = Math.round((next && next.time - cue.time < 2 ? (cue.time + next.time) / 2 : cue.time + 1) * 100) / 100;
  }
  const copy = { id: Date.now() + '-' + (cueSeq++), time, name: cueName(cue), fade: cue.fade, instant: cue.instant, look: clone(cue.look) };
  show.cues.push(copy);
  sortCues(); saveShow();
  record();
  jumpToCue(copy);
}

function addCue() {
  const T = currentTime();
  let cue = show.cues.find((c) => Math.abs(c.time - T) < 0.05);
  if (cue) cue.look = clone(state);
  else {
    cue = { id: Date.now() + '-' + (cueSeq++), time: Math.round(T * 100) / 100, name: '', fade: 1, instant: false, look: clone(state) };
    show.cues.push(cue);
    sortCues();
  }
  selectedCue = cue.id;
  loadedIdx = show.cues.indexOf(cue);
  follow = true;
  saveShow(); renderCues();
  record();
}

// What exported files are called: the project's name, else the track's, else a plain default.
function fileStem() {
  const item = currentItem();
  const name = [show.projectName, item && item.name].filter(Boolean).join(' - ') || 'Lighting';
  return name.replace(/[\\/:*?"<>|]/g, ' ').trim();
}
// "Project · Item" for the top of each PDF page
const showTitle = () => {
  const title = [show.projectName, currentItem() && currentItem().name].filter(Boolean).join(' · ');
  return title ? title + '   |   ' : '';
};

async function exportShow() {
  saveBlob(await packItem(currentProject(), currentItem()), fileStem() + FILE_ITEM);
}

// Replace this item's cues and lights (and its track, if the file carries one) with a file's.
async function importShow(file) {
  try {
    const got = await readFile(file);
    const rec = got.items[0] || (got.projects[0] && got.projects[0].items[0]);
    if (!rec) throw new Error('nothing in it');
    show = Object.assign(showPart(rec.data), { trackName: show.trackName, projectName: currentProject().name });
    state = Object.assign(blankLook(), rec.data.look || {});
    store.set(LOOK_KEY, state);
    syncUI();
    cuesChanged();
    if (rec.track) await loadTrack(rec.track);
    toast(`Imported ${file.name}. Undo with Cmd+Z.`, 3500);
  } catch (e) {
    toast(`${file.name} is not a file from this app.`, 3500);
  }
}

// ---------------------------------------------------------------------------
// PDF export: one landscape page per cue, downloaded as a file in one click.
// Each page is drawn on a canvas (so any language and the app's own font work) and
// the pages are wrapped in a minimal PDF written here, with no library.
// ---------------------------------------------------------------------------
// [71, 72, 73, 75] -> "71-73, 75"
function ranges(numbers, prefix) {
  const sorted = [...numbers].sort((a, b) => a - b), out = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i ? `${prefix}${sorted[i]}-${prefix}${sorted[j]}` : prefix + sorted[i]);
    i = j;
  }
  return out.join(', ');
}
const capital = (word) => word[0].toUpperCase() + word.slice(1);

// A look as rows of text for the settings table: [label, [{ text, dot }]]
function effectText(look) {
  const known = EFFECTS.find(([id]) => id === look.effect);
  return !known || look.effect === 'none' ? 'Stage wash' : `${known[1]} at ${look.bpm} BPM`;
}
function sideText(look) {
  const types = SIDE_TYPES.filter(([id]) => look.sideTypes[id]).map(([, name]) => name);
  const places = SIDES.map((side) => {
    const on = look.sidePos[side].map((v, i) => (v ? i + 1 : 0)).filter(Boolean);
    return on.length ? `${side === 'L' ? 'Left' : 'Right'} ${ranges(on, '')}` : '';
  }).filter(Boolean);
  return types.length && places.length ? `${types.join(' + ')} on ${places.join(', ')}` : 'Off';
}
const zoneText = (zone) => (+zone ? `zone ${zone} (${ZONE_NAMES[zone - 1]})` : 'straight down');

// What changed going from one look to another, for the "same as Cue N, except" note.
// `kinds` counts the kinds of thing that differ (LED colours, LED aim, spotlights, face
// lights, side lights, cyclorama, effect); `lines` spells the changes out.
function lookChanges(from, to) {
  const lines = [];
  let kinds = 0;
  const grouped = (pairs, describe) => {       // pairs: [key, LED number]; one line per key
    const groups = new Map();
    for (const [key, n] of pairs) { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(n); }
    for (const [key, ids] of groups) lines.push(`LEDs ${ranges(ids, 'F')}: ${describe(...key.split('|'))}`);
    if (groups.size) kinds++;
  };
  const colour = [], aim = [];
  for (const led of LEDS) {
    const n = +led.id.slice(1), a = from.leds[led.id] || '', b = to.leds[led.id] || '';
    const za = (from.aim && from.aim[led.id]) || 0, zb = (to.aim && to.aim[led.id]) || 0;
    if (a !== b) colour.push([`${a}|${b}|${b && !a ? zb : ''}`, n]);
    if (a && b && za !== zb) aim.push([`${za}|${zb}`, n]);          // lit before and after, pointing somewhere new
  }
  grouped(colour, (a, b, zone) => (!b ? 'off' : !a ? `on, ${b}${+zone ? ', aimed at ' + zoneText(zone) : ''}` : `${a} → ${b}`));
  grouped(aim, (za, zb) => `${zoneText(za)} → ${zoneText(zb)}`);

  const on = [], off = [];
  for (const spot of SPOTS) {
    const a = !!from.spots[spot.id], b = !!to.spots[spot.id];
    if (a !== b) (b ? on : off).push(+spot.id);
  }
  if (on.length) lines.push(`Spotlights ${ranges(on, '')}: on`);
  if (off.length) lines.push(`Spotlights ${ranges(off, '')}: off`);
  if (on.length || off.length) kinds++;

  const simple = (name, a, b) => { if (a !== b) { lines.push(`${name}: ${a} → ${b}`); kinds++; } };
  simple('Face lights', FACE_LEVELS[from.face] || 'Off', FACE_LEVELS[to.face] || 'Off');
  simple('Side lights', sideText(from), sideText(to));
  simple('Cyclorama', from.cyclo, to.cyclo);
  simple('Effect', effectText(from), effectText(to));
  return { kinds, lines };
}

// For each cue, the earlier cue it is most like, if they differ in three kinds of thing
// or fewer. A tie goes to the more recent cue.
const SIMILAR_MAX = 3;
function similarCues(cues) {
  return cues.map((cue, i) => {
    let best = null;
    for (let j = 0; j < i; j++) {
      const diff = lookChanges(cues[j].look, cue.look);
      if (!best || diff.kinds < best.kinds || (diff.kinds === best.kinds && diff.lines.length <= best.lines.length)) {
        best = { index: j, kinds: diff.kinds, lines: diff.lines };
      }
    }
    return best && best.kinds <= SIMILAR_MAX ? best : null;
  });
}

function lookRows(look) {
  const effect = effectText(look);
  const groups = new Map();              // LEDs grouped by colour and where they point
  for (const led of LEDS) {
    const colour = look.leds[led.id];
    if (!colour) continue;
    const key = colour + '|' + ((look.aim && look.aim[led.id]) || 0);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(+led.id.slice(1));
  }
  const leds = [...groups].map(([key, ids]) => {
    const [colour, zone] = key.split('|');
    return { dot: COLORS[colour], text: `${capital(colour)}: ${ranges(ids, 'F')}, ${+zone ? 'aimed at ' + zoneText(zone) : 'straight down'}` };
  });
  const spots = SPOTS.filter((s) => look.spots[s.id]).map((s) => +s.id);
  return [
    ['Effect', [{ text: effect }]],
    ['LEDs', leds.length ? leds : [{ text: 'All off' }]],
    ['Spotlights', [{ text: spots.length ? ranges(spots, '') : 'All off' }]],
    ['Face lights', [{ text: FACE_LEVELS[look.face] || 'Off' }]],
    ['Side lights', [{ text: sideText(look) }]],
    ['Cyclorama', [look.cyclo === 'none' ? { text: 'None' } : { text: capital(look.cyclo), dot: COLORS[look.cyclo] }]],
  ];
}

// The stage plan painted with a look, as standalone SVG text. An SVG shown as an image
// cannot see the page's stylesheet, so every element's computed style is written inline.
const SVG_STYLE = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'display', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor'];
function planSvgText(look) {
  paintPlan(look, true);
  const copy = svg.cloneNode(true);
  const from = svg.querySelectorAll('*'), to = copy.querySelectorAll('*');
  from.forEach((n, i) => {
    const cs = getComputedStyle(n);
    let style = SVG_STYLE.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    if (n.tagName === 'text') style += ';font-family:Helvetica,Arial,sans-serif';
    to[i].setAttribute('style', style);
  });
  copy.querySelectorAll('.zone-pick, .box').forEach((n) => n.remove());
  copy.removeAttribute('id'); copy.removeAttribute('class');
  copy.setAttribute('viewBox', '250 110 1500 1010');
  copy.setAttribute('width', 1500); copy.setAttribute('height', 1010);
  return new XMLSerializer().serializeToString(copy);
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('image failed to load'));
  img.src = src;
});

function wrapText(c, text, width) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && c.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

// Draw one cue's page. The canvas is A4 landscape at about 170 dots per inch.
const PAGE_W = 2000, PAGE_H = 1414, EDGE = 70;
function drawPage(c, page, mapImg, shotImg) {
  const font = (size, weight) => { c.font = `${weight || 400} ${size}px Inter, Helvetica, Arial, sans-serif`; };
  c.fillStyle = '#fff'; c.fillRect(0, 0, PAGE_W, PAGE_H);
  c.textBaseline = 'alphabetic';

  // header
  c.fillStyle = '#202124'; c.textAlign = 'left'; font(46, 600);
  c.fillText(page.title, EDGE, EDGE + 44);
  const titleW = c.measureText(page.title).width;
  c.fillStyle = '#5f6368'; c.textAlign = 'right'; font(23);
  // the stage template goes in the header too, unless a long cue name leaves no room for it
  if (c.measureText(page.metaLong).width + titleW + 260 < PAGE_W - 2 * EDGE) page.meta = page.metaLong;
  c.fillText(page.meta, PAGE_W - EDGE, EDGE + 40);
  const links = [];                              // areas to click on this page
  if (page.overview) {                           // "Overview" sits left of the page details and links back
    const metaW = c.measureText(page.meta).width;
    c.fillStyle = '#174ea6';
    c.fillText('Overview   |   ', PAGE_W - EDGE - metaW, EDGE + 40);
    const w = c.measureText('Overview   |   ').width;
    links.push({ x: PAGE_W - EDGE - metaW - w - 10, y: EDGE, w: w + 10, h: 56, overview: true });
  }
  c.fillStyle = '#9aa0a6'; c.fillRect(EDGE, EDGE + 70, PAGE_W - 2 * EDGE, 2);

  // lighting map on the left, front view and settings on the right
  const top = EDGE + 100, mapW = 1080, mapH = Math.round(mapW * 1010 / 1500);
  c.drawImage(mapImg, EDGE, top, mapW, mapH);
  const rx = EDGE + mapW + 50, rw = PAGE_W - EDGE - rx, shotH = Math.round(rw * FH / FW);
  c.save();
  c.beginPath();
  if (c.roundRect) c.roundRect(rx, top, rw, shotH, 12); else c.rect(rx, top, rw, shotH);
  c.clip();
  c.drawImage(shotImg, rx, top, rw, shotH);
  c.restore();

  const noteTop = PAGE_H - EDGE - 190;

  // "Same as Cue N" note in the space under the lighting map
  if (page.like) {
    const boxTop = top + mapH + 22, boxH = noteTop - 20 - boxTop, room = Math.max(1, Math.floor((boxH - 62) / 31));
    c.fillStyle = '#e8f0fe';
    c.beginPath();
    if (c.roundRect) c.roundRect(EDGE, boxTop, mapW, boxH, 12); else c.rect(EDGE, boxTop, mapW, boxH);
    c.fill();
    c.fillStyle = '#174ea6'; c.textAlign = 'left'; font(25, 600);
    c.fillText(page.like.title, EDGE + 22, boxTop + 40);
    links.push({ x: EDGE, y: boxTop, w: mapW, h: 56, cue: page.like.index });
    c.fillStyle = '#202124'; font(22);
    let row = 0, done = 0;
    for (const change of page.like.lines) {      // each change wraps on to as many rows as it needs
      const wrapped = wrapText(c, change, mapW - 80);
      const last = done === page.like.lines.length - 1;
      if (row + wrapped.length > (last ? room : room - 1)) break;
      c.fillStyle = '#174ea6'; c.fillText('•', EDGE + 24, boxTop + 76 + row * 31);
      c.fillStyle = '#202124';
      for (const text of wrapped) c.fillText(text, EDGE + 48, boxTop + 76 + (row++) * 31);
      done++;
    }
    if (done < page.like.lines.length) {
      c.fillStyle = '#5f6368';
      c.fillText(`and ${page.like.lines.length - done} more (see the settings on the right)`, EDGE + 48, boxTop + 76 + row * 31);
    }
  }
  const rows = lookRows(page.look), labelW = 160;
  let size = 23, lead = 33;
  const layout = () => { font(size); return rows.map(([, items]) => items.map((item) => wrapText(c, item.text, rw - labelW - (item.dot ? 30 : 0)))); };
  let wrapped = layout();
  const height = () => wrapped.reduce((sum, items) => sum + items.reduce((n, lines) => n + lines.length, 0) * lead + 22, 0);
  if (top + shotH + 30 + height() > noteTop - 20) { size = 19; lead = 26; wrapped = layout(); }   // many LED groups: go smaller
  let y = top + shotH + 30;
  c.textAlign = 'left';
  rows.forEach(([name, items], r) => {
    let lineY = y + lead - 8;
    c.fillStyle = '#5f6368'; font(size);
    c.fillText(name, rx, lineY);
    items.forEach((item, k) => {
      if (item.dot) {
        c.fillStyle = item.dot;
        c.beginPath(); c.arc(rx + labelW + 10, lineY - size * 0.32, size * 0.36, 0, 6.3); c.fill();
        c.strokeStyle = '#80868b'; c.lineWidth = 1.5; c.stroke();
      }
      c.fillStyle = '#202124';
      for (const line of wrapped[r][k]) { c.fillText(line, rx + labelW + (item.dot ? 30 : 0), lineY); lineY += lead; }
    });
    y = lineY - lead + 8 + 22;
    c.fillStyle = '#dadce0'; c.fillRect(rx, y - 11, rw, 2);
  });

  // comments
  c.strokeStyle = '#9aa0a6'; c.lineWidth = 2;
  c.beginPath();
  if (c.roundRect) c.roundRect(EDGE, noteTop, PAGE_W - 2 * EDGE, 190, 12); else c.rect(EDGE, noteTop, PAGE_W - 2 * EDGE, 190);
  c.stroke();
  c.fillStyle = '#5f6368'; font(20, 600);
  c.fillText('Comments', EDGE + 22, noteTop + 38);
  c.fillStyle = '#202124'; font(24);
  const noteLines = wrapText(c, page.note || '', PAGE_W - 2 * EDGE - 44);
  noteLines.slice(0, 4).forEach((line, i) => {
    c.fillText(i === 3 && noteLines.length > 4 ? line + ' ...' : line, EDGE + 22, noteTop + 76 + i * 33);
  });
  return links;
}

// The overview: one row per cue, with the earlier cue it copies and what changed, each
// change on its own line. Long text wraps on to more lines; it is never squeezed.
const OVERVIEW = {
  cols: { cue: [EDGE, 300], time: [EDGE + 330, 110], transition: [EDGE + 470, 170], effect: [EDGE + 670, 330], like: [EDGE + 1040, PAGE_W - 2 * EDGE - 1040] },
  lead: 31, pad: 17, top: EDGE + 150,
};
const pdfFont = (c, size, weight) => { c.font = `${weight || 400} ${size}px Inter, Helvetica, Arial, sans-serif`; };

// Wrap every row's text and split the rows into pages.
function overviewPages(c, items) {
  const { cols, lead, pad, top } = OVERVIEW, pages = [[]];
  let y = top;
  for (const item of items) {
    pdfFont(c, 23, 600);
    const cue = wrapText(c, item.cue, cols.cue[1]);
    pdfFont(c, 22);
    const effect = wrapText(c, item.effect, cols.effect[1]);
    const changes = item.like ? item.like.lines.map((line) => wrapText(c, line, cols.like[1] - 26)) : [];
    const likeLines = item.like ? 1 + changes.reduce((n, lines) => n + lines.length, 0) : 1;
    const height = Math.max(cue.length, effect.length, likeLines) * lead + pad * 2;
    if (y + height > PAGE_H - EDGE && pages[pages.length - 1].length) { pages.push([]); y = top; }
    pages[pages.length - 1].push({ item, cue, effect, changes, height });
    y += height;
  }
  return pages;
}

function drawOverview(c, rows, pageNo, pageCount) {
  const { cols, lead, pad, top } = OVERVIEW;
  c.fillStyle = '#fff'; c.fillRect(0, 0, PAGE_W, PAGE_H);
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#202124'; c.textAlign = 'left'; pdfFont(c, 46, 600);
  c.fillText('Cue overview', EDGE, EDGE + 44);
  c.fillStyle = '#5f6368'; c.textAlign = 'right'; pdfFont(c, 23);
  c.fillText(showTitle() + templateName() + `   |   overview ${pageNo} of ${pageCount}`, PAGE_W - EDGE, EDGE + 40);
  c.fillStyle = '#9aa0a6'; c.fillRect(EDGE, EDGE + 70, PAGE_W - 2 * EDGE, 2);

  c.textAlign = 'left'; c.fillStyle = '#5f6368'; pdfFont(c, 19, 600);
  for (const [name, key] of [['CUE', 'cue'], ['TIME', 'time'], ['TRANSITION', 'transition'], ['EFFECT', 'effect'], ['SAME AS AN EARLIER CUE', 'like']]) {
    c.fillText(name, cols[key][0], top - 22);
  }
  c.fillStyle = '#dadce0'; c.fillRect(EDGE, top - 8, PAGE_W - 2 * EDGE, 2);

  let y = top;
  const links = [];                              // areas to click, each { x, y, w, h, cue }
  rows.forEach((row, r) => {
    if (r % 2) { c.fillStyle = '#f8f9fa'; c.fillRect(EDGE, y, PAGE_W - 2 * EDGE, row.height); }
    const line = (n) => y + pad + lead * n + 22;
    links.push({ x: EDGE, y, w: PAGE_W - 2 * EDGE, h: row.height, cue: row.item.index });
    if (row.item.like) links.push({ x: cols.like[0], y: y + pad, w: cols.like[1], h: lead, cue: row.item.like.index });
    c.fillStyle = '#174ea6'; pdfFont(c, 23, 600);
    row.cue.forEach((text, i) => c.fillText(text, cols.cue[0] + 12, line(i)));
    c.fillStyle = '#202124'; pdfFont(c, 22);
    c.fillText(row.item.time, cols.time[0], line(0));
    c.fillText(row.item.transition, cols.transition[0], line(0));
    row.effect.forEach((text, i) => c.fillText(text, cols.effect[0], line(i)));
    if (!row.item.like) {
      c.fillStyle = '#9aa0a6';
      c.fillText('New look', cols.like[0], line(0));
    } else {
      c.fillStyle = '#174ea6'; pdfFont(c, 22, 600);
      c.fillText(row.item.like.title, cols.like[0], line(0));
      c.fillStyle = '#202124'; pdfFont(c, 22);
      let n = 1;
      for (const lines of row.changes) {
        c.fillStyle = '#174ea6'; c.fillText('•', cols.like[0] + 4, line(n));
        c.fillStyle = '#202124';
        for (const text of lines) c.fillText(text, cols.like[0] + 26, line(n++));
      }
    }
    y += row.height;
    c.fillStyle = '#e8eaed'; c.fillRect(EDGE, y, PAGE_W - 2 * EDGE, 1);
  });
  return links;
}

// A PDF whose pages are each one full-page JPEG.
function pdfFromJpegs(jpegs) {
  const W = 841.89, H = 595.28;            // A4 landscape, in points
  const enc = new TextEncoder(), parts = [], offsets = [];
  let length = 0;
  const push = (x) => { const bytes = typeof x === 'string' ? enc.encode(x) : x; parts.push(bytes); length += bytes.length; };
  const object = (n, write) => { offsets[n] = length; push(`${n} 0 obj\n`); write(); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, () => push(`<< /Type /Pages /Count ${jpegs.length} /Kids [${jpegs.map((j, i) => `${3 + 3 * i} 0 R`).join(' ')}] >>`));
  jpegs.forEach((jpeg, i) => {
    const n = 3 + 3 * i, draw = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    // clickable areas: page pixels (origin top left) become points (origin bottom left)
    const k = W / jpeg.w;
    const annots = (jpeg.links || []).map((l) => {
      const rect = [l.x * k, H - (l.y + l.h) * k, (l.x + l.w) * k, H - l.y * k].map((v) => v.toFixed(2)).join(' ');
      return `<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /Dest [${3 + 3 * l.page} 0 R /Fit] >>`;
    }).join(' ');
    object(n, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R${annots ? ` /Annots [${annots}]` : ''} >>`));
    object(n + 1, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    object(n + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${jpeg.w} /Height ${jpeg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.bytes.length} >>\nstream\n`);
      push(jpeg.bytes);
      push('\nendstream');
    });
  });
  const xref = length, count = 3 + 3 * jpegs.length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

let toastTimer = 0;
function toast(text, hideAfterMs) {
  const box = $('toast');
  box.textContent = text || '';
  box.hidden = !text;
  clearTimeout(toastTimer);
  if (text && hideAfterMs) toastTimer = setTimeout(() => toast(''), hideAfterMs);
}

let exporting = false;
async function exportPdf() {
  if (exporting) return;
  exporting = true;
  const cues = show.cues.length ? show.cues : [{ name: 'Current look', look: state }];
  try {
    toast('Building PDF...');
    // 1. Capture every cue while nothing else can run in between: the plan as SVG text
    //    (on the light theme) and the front view as a still with all its lights on.
    const theme = document.documentElement.dataset.theme, still = new Float32Array(FRAME_N);
    document.documentElement.dataset.theme = 'light';
    const similar = similarCues(cues);
    const likeTitle = (i) => (similar[i].kinds ? `Same as ${cueLabel(cues[similar[i].index])}, except:` : `Same look as ${cueLabel(cues[similar[i].index])}`);
    const pages = cues.map((cue, i) => {
      compute(Object.assign({}, cue.look, { effect: 'none' }), 0, still);
      shareGround(still); lightFigures(still); drawFront(still);
      return {
        look: cue.look, note: cue.note,
        like: similar[i] && { index: similar[i].index, title: likeTitle(i), lines: similar[i].lines },
        title: show.cues.length ? cueLabel(cue) : cue.name,
        meta: showTitle() + (show.cues.length ? `${fmt(cue.time)}   |   ${cue.instant ? 'Instant' : `Fade ${cue.fade} s`}   |   page ${i + 1} of ${cues.length}` : ''),
        metaLong: showTitle() + templateName() + (show.cues.length ? `   |   ${fmt(cue.time)}   |   ${cue.instant ? 'Instant' : `Fade ${cue.fade} s`}   |   page ${i + 1} of ${cues.length}` : ''),
        map: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(planSvgText(cue.look)),
        shot: front.toDataURL('image/jpeg', 0.92),
      };
    });
    document.documentElement.dataset.theme = theme;
    paintPlan(state);

    // 2. Draw each page and collect it as a JPEG.
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W; canvas.height = PAGE_H;
    const c = canvas.getContext('2d'), jpegs = [];
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    // Pages run: overview page(s), then one page per cue. A link names a cue (or the
    // overview) and is turned into a page number here.
    const overview = show.cues.length > 1 ? overviewPages(c, cues.map((cue, i) => ({
      index: i, cue: cueLabel(cue), time: fmt(cue.time), transition: cue.instant ? 'Instant' : `Fade ${cue.fade} s`, effect: effectText(cue.look),
      like: similar[i] && { index: similar[i].index, title: likeTitle(i), lines: similar[i].lines },
    }))) : [];
    const addPage = async (links) => {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      jpegs.push({
        bytes: new Uint8Array(await blob.arrayBuffer()), w: PAGE_W, h: PAGE_H,
        links: (links || []).map((l) => Object.assign({ page: l.overview ? 0 : overview.length + l.cue }, l)),
      });
    };
    for (let n = 0; n < overview.length; n++) await addPage(drawOverview(c, overview[n], n + 1, overview.length));
    pages.forEach((page) => { page.overview = overview.length > 0; });
    for (let i = 0; i < pages.length; i++) {
      toast(`Building PDF: page ${i + 1} of ${pages.length}`);
      const [mapImg, shotImg] = await Promise.all([loadImage(pages[i].map), loadImage(pages[i].shot)]);
      await addPage(drawPage(c, pages[i], mapImg, shotImg));
    }

    // 3. Download.
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfFromJpegs(jpegs));
    link.download = fileStem() + ' - lighting cues.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    toast(`PDF downloaded: ${jpegs.length} page${jpegs.length === 1 ? '' : 's'}`);
  } catch (e) {
    toast('Could not build the PDF: ' + e.message);
  }
  exporting = false;
  setTimeout(() => toast(''), 3500);
}

// ---------------------------------------------------------------------------
// Project list (the home screen)
// ---------------------------------------------------------------------------
function setOpen(projectId, itemId) {
  try {
    for (const [key, id] of [['slp-open', projectId], ['slp-item', itemId]]) {
      if (id) sessionStorage.setItem(key, id); else sessionStorage.removeItem(key);
    }
  } catch (e) { /* no session storage */ }
  location.reload();                     // start clean with that item's data
}
const openProject = (id) => setOpen(id, null);          // shows the project's items
// A small picture of the front view, shown on the item's card and its project's.
function saveThumbnail() {
  const project = currentProject(), item = currentItem();
  if (!item) return;
  try {
    const small = document.createElement('canvas');
    small.width = 320; small.height = 188;
    small.getContext('2d').drawImage(front, 0, 0, 320, 188);
    project.thumb = item.thumb = small.toDataURL('image/jpeg', 0.7);
    saveProjects();
  } catch (e) { /* keep the old picture */ }
}
function goHome() { saveThumbnail(); setOpen(currentId, null); }           // back to this project's items
function goProjects() { saveThumbnail(); setOpen(null, null); }

// stage: the template to start on. from: a file being imported, which brings its own layout.
function createProject(name, stage, from) {
  const id = newId(), tpl = stage || BUILTIN;
  const own = from && from.layout && Array.isArray(from.layout.leds) ? from.layout : (tpl.builtin ? null : copyLayout(tpl.layout));
  if (own) raw.set(projectKey(LAYOUT_KEY, id), own);
  const project = { id, name: name || 'Untitled project', template: (from && from.template) || tpl.name, templateId: (from && from.templateId) || tpl.id, created: Date.now(), updated: Date.now(), cues: 0, items: [] };
  projects.unshift(project);
  saveProjects();
  return project;
}
const countCues = (project) => { project.cues = project.items.reduce((n, it) => n + (it.cues || 0), 0); };
// The part of an item's file that is its cue list and track details.
function showPart(data) {
  const part = Object.assign({}, data, { cues: Array.isArray(data.cues) ? data.cues : [] });
  for (const key of ['format', 'version', 'project', 'projectName', 'template', 'templateId', 'layout', 'look', 'name', 'track']) delete part[key];
  return part;
}
// rec: an item read from a file ({ data, track }); without it the item starts empty.
async function addItem(project, name, rec) {
  const id = newId(), data = rec ? rec.data : {};
  const part = showPart(data);
  if (!rec || !rec.track) part.trackName = '';
  raw.set(projectKey(LOOK_KEY, id), data.look || blankLook());
  raw.set(projectKey(SHOW_KEY, id), part);
  if (rec && rec.track) await audioStore.put(id, rec.track);
  const item = { id, name: name || `Item ${project.items.length + 1}`, cues: part.cues.length, updated: Date.now() };
  project.items.push(item);
  project.updated = Date.now();
  countCues(project);
  saveProjects();
  return item;
}
async function copyItem(item, into, name) {
  const id = newId();
  raw.set(projectKey(LOOK_KEY, id), raw.get(projectKey(LOOK_KEY, item.id), {}));
  raw.set(projectKey(SHOW_KEY, id), raw.get(projectKey(SHOW_KEY, item.id), {}));
  const track = await audioStore.get(item.id);
  if (track) await audioStore.put(id, track);
  into.items.push(Object.assign({}, item, { id, name: name || item.name, updated: Date.now() }));
  countCues(into);
}
function dropItem(item) {
  raw.del(projectKey(LOOK_KEY, item.id));
  raw.del(projectKey(SHOW_KEY, item.id));
  audioStore.del(item.id);
}
async function duplicateProject(project) {
  const custom = raw.get(projectKey(LAYOUT_KEY, project.id), null);
  const copy = createProject(project.name + ' copy', null, { layout: custom, template: project.template, templateId: project.templateId });
  copy.thumb = project.thumb;
  for (const item of project.items) await copyItem(item, copy);
  saveProjects();
  renderHome();
}
function deleteProject(project) {
  project.items.forEach(dropItem);
  raw.del(projectKey(LAYOUT_KEY, project.id));
  projects = projects.filter((p) => p.id !== project.id);
  saveProjects();
  renderHome();
}
async function duplicateItem(project, item) {
  await copyItem(item, project, item.name + ' copy');
  project.updated = Date.now();
  saveProjects();
  renderHome();
}
function deleteItem(project, item) {
  dropItem(item);
  project.items = project.items.filter((it) => it !== item);
  project.updated = Date.now();
  countCues(project);
  saveProjects();
  renderHome();
}

// ---------------------------------------------------------------------------
// Files. A .slitem holds one item, a .slproject a whole project; both are zip archives
// with the cues and lights as JSON and the soundtracks beside them, so a file carries
// everything needed to open it on another device. Several downloaded at once come as one
// .zip of those files, which imports again in one go.
// ---------------------------------------------------------------------------
const FILE_ITEM = '.slitem', FILE_PROJECT = '.slproject';
const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
// files: [{ name, bytes }]. Stored without compression: the audio is compressed already.
function zipWrite(files) {
  const encoder = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), crc = crc32(file.bytes), size = file.bytes.length;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(12, 0x21, true); local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    parts.push(local.buffer, name, file.bytes);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(8, 0x0800, true);
    entry.setUint16(14, 0x21, true); entry.setUint32(16, crc, true); entry.setUint32(20, size, true); entry.setUint32(24, size, true);
    entry.setUint16(28, name.length, true); entry.setUint32(42, offset, true);
    central.push(entry.buffer, name);
    offset += 30 + name.length + size;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, central.reduce((n, part) => n + part.byteLength, 0), true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/octet-stream' });
}
// -> Map of name to bytes
async function zipRead(buffer) {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer), decoder = new TextDecoder(), out = new Map();
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip');
  let at = view.getUint32(end + 16, true);
  for (let i = view.getUint16(end + 10, true); i > 0; i--) {
    const method = view.getUint16(at + 10, true), size = view.getUint32(at + 20, true), nameLen = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true), name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    let data = bytes.subarray(start, start + size);
    if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else if (method !== 0) throw new Error('unsupported zip');
    if (!name.endsWith('/')) out.set(name, data);
    at += 46 + nameLen + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return out;
}
const safeName = (text) => String(text).replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Untitled';
const jsonBytes = (value) => new TextEncoder().encode(JSON.stringify(value));
const projectLayout = (project) => raw.get(projectKey(LAYOUT_KEY, project.id), null) || templateLayout();
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// An item as it is written to a file: its cues, lights and name, and its track if it has one.
async function itemRecord(item) {
  const part = raw.get(projectKey(SHOW_KEY, item.id), {});
  const data = Object.assign({}, part, { name: item.name, look: raw.get(projectKey(LOOK_KEY, item.id), {}), cues: part.cues || [] });
  delete data.projectName;
  return { data, track: await audioStore.get(item.id) };
}
async function packItem(project, item) {
  const { data, track } = await itemRecord(item);
  const path = track ? 'track/' + safeName(track.name || 'track') : '';
  const files = [{ name: 'item.json', bytes: jsonBytes(Object.assign({ format: 'slp-item', version: 1, project: project.name, template: project.template, layout: projectLayout(project) }, data, { track: path })) }];
  if (track) files.push({ name: path, bytes: new Uint8Array(await track.arrayBuffer()) });
  return zipWrite(files);
}
async function packProject(project) {
  const files = [], paths = [];
  for (const [i, item] of project.items.entries()) {
    const { data, track } = await itemRecord(item);
    const path = track ? `tracks/${i + 1} ${safeName(track.name || 'track')}` : '';
    paths.push(`items/${i + 1}.json`);
    files.push({ name: paths[i], bytes: jsonBytes(Object.assign(data, { track: path })) });
    if (track) files.push({ name: path, bytes: new Uint8Array(await track.arrayBuffer()) });
  }
  files.unshift({ name: 'project.json', bytes: jsonBytes({ format: 'slp-project', version: 1, name: project.name, template: project.template, templateId: project.templateId, layout: projectLayout(project), items: paths }) });
  return zipWrite(files);
}
const AUDIO_TYPES = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac' };
// Read a file this app wrote. -> { projects: [{ name, layout, ..., items: [{ data, track }] }], items: [{ data, track }] }
async function readFile(file) {
  const out = { projects: [], items: [] }, stem = file.name.replace(/\.[^.]+$/, '');
  if (/\.json$/i.test(file.name)) {              // an export from before the app had its own files
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.cues)) throw new Error('not a show');
    out.items.push({ data: Object.assign({}, data, { name: data.projectName || stem }), track: null });
    return out;
  }
  await readArchive(await zipRead(await file.arrayBuffer()), out);
  if (!out.projects.length && !out.items.length) throw new Error('nothing in it');
  return out;
}
async function readArchive(zip, out) {
  const json = (path) => JSON.parse(new TextDecoder().decode(zip.get(path)));
  const itemAt = (data) => {
    const bytes = data.track && zip.get(data.track);
    const name = data.trackName || String(data.track).split('/').pop();
    return { data, track: bytes ? new File([bytes], name, { type: AUDIO_TYPES[name.split('.').pop().toLowerCase()] || 'audio/mpeg' }) : null };
  };
  if (zip.has('project.json')) {
    const project = json('project.json');
    out.projects.push(Object.assign(project, { items: project.items.map((path) => itemAt(json(path))) }));
  } else if (zip.has('item.json')) {
    out.items.push(itemAt(json('item.json')));
  } else {                                       // several files downloaded together
    for (const [name, bytes] of zip) {
      if (/\.(slitem|slproject)$/i.test(name)) await readArchive(await zipRead(bytes.slice().buffer), out);
    }
  }
}
// Bring files in. On the project list each becomes a project; inside a project their items join it.
async function importFiles(fileList) {
  const project = currentProject(), bad = [];
  let made = 0;
  toast('Importing...');
  for (const file of fileList) {
    try {
      const got = await readFile(file);
      for (const p of got.projects) {
        const into = project || createProject(p.name, null, p);
        for (const rec of p.items) await addItem(into, rec.data.name, rec);
        made += project ? p.items.length : 1;
      }
      for (const rec of got.items) {
        const into = project || createProject(rec.data.project || rec.data.name, null, rec.data);
        await addItem(into, rec.data.name, rec);
        made++;
      }
    } catch (e) { bad.push(file.name); }
  }
  renderHome();
  const what = project ? 'item' : 'project';
  toast((made ? `Imported ${made} ${what}${made === 1 ? '' : 's'}.` : '') + (bad.length ? ` Could not read ${bad.join(', ')}.` : ''), 4500);
}
// Download projects (from the project list) or items (inside a project): one file, or a zip of them.
async function downloadFiles(list) {
  const project = currentProject();
  toast('Preparing the download...');
  const files = [], used = new Set();
  for (const thing of list) {
    let name = safeName(project ? `${project.name} - ${thing.name}` : thing.name);
    for (let n = 2; used.has(name.toLowerCase()); n++) name = name.replace(/( \(\d+\))?$/, ` (${n})`);
    used.add(name.toLowerCase());
    files.push({ name: name + (project ? FILE_ITEM : FILE_PROJECT), blob: project ? await packItem(project, thing) : await packProject(thing) });
  }
  if (files.length === 1) saveBlob(files[0].blob, files[0].name);
  else {
    const inside = [];
    for (const file of files) inside.push({ name: file.name, bytes: new Uint8Array(await file.blob.arrayBuffer()) });
    saveBlob(zipWrite(inside), (project ? safeName(project.name) + ' - items' : 'Stage Lighting projects') + '.zip');
  }
  toast(`Downloaded ${files.length} ${project ? 'item' : 'project'}${files.length === 1 ? '' : 's'}.`, 3000);
}

const when = (ms) => {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// The home screen shows the projects, or the items of the project that is open.
const picked = new Set();          // ids ticked for downloading
function renderHome() {
  const list = $('project-list'), project = currentProject();
  const things = project ? project.items : [...projects].sort((a, b) => b.updated - a.updated);
  list.textContent = '';
  $('home-back').hidden = $('new-item').hidden = !project;
  $('home-logo').hidden = $('new-project').hidden = !!project;
  $('home-title').textContent = project ? project.name : 'Stage Lighting Planner';
  $('home-heading').textContent = project ? `Items · ${project.template}` : 'Projects';
  $('home-empty').hidden = things.length > 0;
  $('home-empty').textContent = project ? 'No items yet. Press New item to add one.' : 'No projects yet. Press New project to start one.';
  for (const id of [...picked]) if (!things.some((t) => t.id === id)) picked.delete(id);
  $('pick-all').hidden = !things.length;
  $('pick-all').textContent = picked.size === things.length ? 'Select none' : 'Select all';
  $('pick-download').hidden = !picked.size;
  $('pick-download').textContent = `Download ${picked.size}`;
  const plural = (n, word) => `${n || 0} ${word}${n === 1 ? '' : 's'}`;
  for (const thing of things) {
    const card = document.createElement('div');
    card.className = 'project' + (picked.has(thing.id) ? ' picked' : '');
    const tick = document.createElement('label');
    tick.className = 'pick'; tick.title = 'Select for download';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = picked.has(thing.id);
    box.addEventListener('change', () => { if (box.checked) picked.add(thing.id); else picked.delete(thing.id); renderHome(); });
    tick.appendChild(box); card.appendChild(tick);
    const open = document.createElement('button');
    open.className = 'project-open';
    open.title = 'Open ' + thing.name;
    if (thing.thumb) { const img = new Image(); img.src = thing.thumb; img.alt = ''; open.appendChild(img); }
    else { const blank = document.createElement('div'); blank.className = 'no-thumb'; blank.textContent = 'No preview yet'; open.appendChild(blank); }
    open.addEventListener('click', () => (project ? setOpen(project.id, thing.id) : openProject(thing.id)));
    card.appendChild(open);

    const info = document.createElement('div');
    info.className = 'project-info';
    const name = document.createElement('div');
    name.className = 'project-name'; name.textContent = thing.name;
    const meta = document.createElement('div');
    meta.className = 'hint';
    meta.textContent = project
      ? `${plural(thing.cues, 'cue')} · edited ${when(thing.updated)}`
      : `${plural(thing.items.length, 'item')} · ${plural(thing.cues, 'cue')} · edited ${when(thing.updated)}`;
    info.appendChild(name); info.appendChild(meta);
    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'project-actions';
    const act = (path, label, onClick) => {
      const b = button(actions, '', 'btn icon', onClick);
      b.innerHTML = svgIcon(path); b.title = label; b.setAttribute('aria-label', label);
      return b;
    };
    act('pencil', 'Rename', () => {
      const field = document.createElement('input');
      field.type = 'text'; field.value = thing.name; field.maxLength = 60; field.className = 'rename';
      name.replaceWith(field);
      field.focus(); field.select();
      const done = () => { thing.name = field.value.trim() || thing.name; saveProjects(); renderHome(); };
      field.addEventListener('blur', done);
      field.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') field.blur(); });
    });
    act('copy', 'Duplicate', () => (project ? duplicateItem(project, thing) : duplicateProject(thing)));
    act('download', 'Download', () => downloadFiles([thing]));
    // Deleting takes two taps: the first arms the button, the second within a few seconds deletes.
    const del = act('trash', 'Delete', () => {
      if (del.classList.contains('armed')) return project ? deleteItem(project, thing) : deleteProject(thing);
      del.classList.add('armed'); del.textContent = 'Delete?';
      setTimeout(() => { if (del.isConnected) renderHome(); }, 3500);
    });
    card.appendChild(actions);
    list.appendChild(card);
  }
}

// A small plan of a template's stage for its card.
function templatePreview(layout) {
  const leds = layout.leds.map((l) => `<rect class="tp-led" x="${l.x - 17}" y="${l.y - 9}" width="34" height="18" rx="9"/>`).join('');
  const spots = layout.spots.map((sp) => `<circle class="tp-spot" cx="${sp.x}" cy="${sp.y}" r="11"/>`).join('');
  return `<svg viewBox="425 150 1150 760"><rect class="tp-stage" x="${STAGE.x0}" y="${STAGE.y0}" width="${STAGE.x1 - STAGE.x0}" height="${STAGE.y1 - STAGE.y0}" rx="10"/>`
    + `<rect class="tp-cyc" x="${ZONES.x}" y="${STAGE.y0 - 16}" width="${ZONES.w * 3}" height="12" rx="5"/>${leds}${spots}</svg>`;
}
const countText = (layout) => `${layout.leds.length} LED${layout.leds.length === 1 ? '' : 's'} · ${layout.spots.length} spotlight${layout.spots.length === 1 ? '' : 's'}`;

// New project: pick the stage to start on. The same window is where saved templates are
// renamed, copied and deleted.
let tplTab = 'all', tplPicked = null;
function renderTemplates() {
  const grid = $('tpl-grid');
  grid.textContent = '';
  each('[data-tpl-tab]', (b) => b.classList.toggle('active', b.dataset.tplTab === tplTab));
  const shown = [
    ...(tplTab === 'all' ? [SCRATCH] : []),
    ...(tplTab !== 'mine' ? [BUILTIN] : []),
    ...(tplTab !== 'builtin' ? templates : []),
  ];
  if (tplPicked && !shown.includes(tplPicked)) tplPicked = null;
  $('tpl-picked').textContent = tplPicked ? (tplPicked === SCRATCH ? 'Starting from scratch' : 'Template: ' + tplPicked.name) : 'Pick a stage to start on';
  for (const tpl of shown) {
    const card = document.createElement('div');
    card.className = 'tpl-card' + (tpl === tplPicked ? ' picked' : '');
    const pick = button(card, '', 'tpl-pick' + (tpl === SCRATCH ? ' scratch' : ''), () => { tplPicked = tpl; renderTemplates(); });
    pick.innerHTML = tpl === SCRATCH ? svgIcon('plus') : templatePreview(tpl.layout);
    pick.title = tpl === SCRATCH ? 'Start from scratch' : tpl.name;
    pick.addEventListener('dblclick', () => { tplPicked = tpl; newFromTemplate(); });
    const row = document.createElement('div');
    row.className = 'tpl-row';
    const info = document.createElement('div');
    info.className = 'tpl-info';
    const name = document.createElement('div');
    name.className = 'tpl-name'; name.textContent = tpl === SCRATCH ? 'Start from scratch' : tpl.name;
    const meta = document.createElement('div');
    meta.className = 'hint';
    meta.textContent = tpl === SCRATCH ? 'An empty stage' : (tpl.builtin ? 'Built-in · ' : '') + countText(tpl.layout);
    info.appendChild(name); info.appendChild(meta); row.appendChild(info);
    const act = (icon, label, onClick) => {
      const b = button(row, '', 'btn icon', onClick);
      b.innerHTML = svgIcon(icon); b.title = label; b.setAttribute('aria-label', label);
      return b;
    };
    if (tpl !== SCRATCH && !tpl.builtin) {
      act('pencil', 'Rename', () => {
        const field = document.createElement('input');
        field.type = 'text'; field.value = tpl.name; field.maxLength = 60; field.className = 'rename';
        name.replaceWith(field);
        field.focus(); field.select();
        field.addEventListener('blur', () => { tpl.name = field.value.trim() || tpl.name; saveTemplates(); renderTemplates(); });
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') field.blur(); });
      });
    }
    if (tpl !== SCRATCH) {
      act('copy', 'Duplicate', () => {
        templates.unshift({ id: 't' + newId(), name: tpl.name + ' copy', layout: copyLayout(tpl.layout), created: Date.now() });
        saveTemplates(); renderTemplates();
      });
    }
    if (tpl !== SCRATCH && !tpl.builtin) {
      // two taps, like deleting a project
      const del = act('trash', 'Delete', () => {
        if (del.classList.contains('armed')) {
          templates = templates.filter((t) => t !== tpl);
          saveTemplates();
          return renderTemplates();
        }
        del.classList.add('armed'); del.textContent = 'Delete?';
        setTimeout(() => { if (del.isConnected) renderTemplates(); }, 3500);
      });
    }
    card.appendChild(row);
    grid.appendChild(card);
  }
  if (tplTab === 'mine' && !templates.length) {
    const none = document.createElement('p');
    none.className = 'hint tpl-none';
    none.textContent = 'No templates of your own yet. Open a project, choose Edit layout in the menu, arrange the lights, then press Save as template.';
    grid.appendChild(none);
  }
}
async function newFromTemplate() {
  if (!tplPicked) return toast('Pick a template, or Start from scratch.', 2500);
  const project = createProject($('new-name').value.trim(), tplPicked);
  const item = await addItem(project, 'Item 1');
  setOpen(project.id, item.id);
}

function buildHome() {
  const dialog = $('tpl');
  const close = () => { dialog.hidden = true; };
  $('tpl-close').innerHTML = svgIcon('close');
  $('new-project').addEventListener('click', () => { tplPicked = null; dialog.hidden = false; renderTemplates(); $('new-name').value = ''; });
  $('tpl-close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !/^INPUT$/.test(e.target.tagName)) close(); });
  each('[data-tpl-tab]', (b) => b.addEventListener('click', () => { tplTab = b.dataset.tplTab; renderTemplates(); }));
  $('tpl-foot').addEventListener('submit', (e) => { e.preventDefault(); newFromTemplate(); });
  $('home-import').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (files.length) importFiles(files);
  });
  $('home-back').innerHTML = svgIcon('back');
  $('home-back').addEventListener('click', () => setOpen(null, null));
  // New items: choose how many, name any of them, and they are all made in one go.
  const itemsDialog = $('items-new'), count = $('items-count'), names = $('items-names');
  const closeItems = () => { itemsDialog.hidden = true; };
  const howMany = () => Math.max(1, Math.min(30, Math.floor(+count.value) || 1));
  const nameFields = () => {
    const n = howMany(), base = currentProject().items.length;
    while (names.children.length > n) names.lastChild.remove();
    while (names.children.length < n) {
      const field = document.createElement('input');
      field.type = 'text'; field.maxLength = 60; field.autocomplete = 'off';
      field.placeholder = `Item ${base + names.children.length + 1}`;
      names.appendChild(field);
    }
    $('items-create').textContent = n === 1 ? 'Create item' : `Create ${n} items`;
  };
  const setCount = (n) => { count.value = Math.max(1, Math.min(30, n)); nameFields(); };
  $('items-close').innerHTML = svgIcon('close');
  $('items-less').innerHTML = svgIcon('minus');
  $('items-more').innerHTML = svgIcon('plus');
  $('items-less').addEventListener('click', () => setCount(howMany() - 1));
  $('items-more').addEventListener('click', () => setCount(howMany() + 1));
  count.addEventListener('input', nameFields);
  count.addEventListener('change', () => setCount(howMany()));
  $('items-close').addEventListener('click', closeItems);
  itemsDialog.addEventListener('click', (e) => { if (e.target === itemsDialog) closeItems(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeItems(); });
  $('new-item').addEventListener('click', () => {
    names.textContent = '';
    setCount(1);
    itemsDialog.hidden = false;
    names.firstChild.focus();
  });
  $('items-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const project = currentProject(), made = [];
    for (const field of [...names.children]) made.push(await addItem(project, field.value.trim()));
    if (made.length === 1) return setOpen(project.id, made[0].id);        // a single item opens straight away
    closeItems();
    renderHome();
    toast(`Added ${made.length} items.`, 3000);
  });
  $('pick-all').addEventListener('click', () => {
    const things = currentProject() ? currentProject().items : projects;
    if (picked.size === things.length) picked.clear(); else things.forEach((t) => picked.add(t.id));
    renderHome();
  });
  $('pick-download').addEventListener('click', () => {
    const things = currentProject() ? currentProject().items : projects;
    downloadFiles(things.filter((t) => picked.has(t.id)));
  });
  renderHome();
}

function buildShow() {
  $('play').addEventListener('click', () => setPlaying(!player.playing));
  $('add-cue').addEventListener('click', addCue);
  $('prev-cue').addEventListener('click', () => stepCue(false));
  $('next-cue').addEventListener('click', () => stepCue(true));
  $('track-file').addEventListener('change', (e) => { if (e.target.files[0]) loadTrack(e.target.files[0]); e.target.value = ''; });
  $('export').addEventListener('click', exportShow);
  $('export-pdf').addEventListener('click', exportPdf);
  $('import').addEventListener('change', (e) => { if (e.target.files[0]) importShow(e.target.files[0]); e.target.value = ''; });
  if (show.trackName) $('load-track').title = `Track: ${show.trackName}`;
  $('back').addEventListener('click', goHome);
  window.addEventListener('pagehide', saveThumbnail);
  if (currentItemId) audioStore.get(currentItemId).then((file) => { if (file) loadTrack(file, true); });
  // The bar shows "project / item"; items are renamed from their card in the project.
  $('bar-project').textContent = show.projectName || '';
  // Click the item's name to rename it in place.
  const label = $('bar-item'), item = currentItem();
  label.textContent = item ? item.name : '';
  label.title = 'Rename this item';
  label.addEventListener('click', () => {
    if (!item) return;
    const field = document.createElement('input');
    field.type = 'text'; field.className = 'bar-rename'; field.value = item.name; field.maxLength = 60;
    label.hidden = true;
    label.after(field);
    field.focus(); field.select();
    let finished = false;
    const done = (keep) => {
      if (finished) return;
      finished = true;
      if (keep) item.name = field.value.trim() || item.name;
      saveProjects();
      label.textContent = item.name;
      field.remove();
      label.hidden = false;
    };
    field.addEventListener('blur', () => done(true));
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') { e.stopPropagation(); done(false); }       // Escape leaves the name as it was
    });
  });
  renderCues();
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
buildPlan();
buildControls();
buildShow();
const atHome = !currentItemId;             // no item open: show the project list, or a project's items
document.body.classList.toggle('at-home', atHome);
$('home').hidden = !atHome;
if (atHome) buildHome();
setupGrips();
try { buildThree(); } catch (e) { /* no WebGL here: the rest of the app still works */ }
applyPrefs();
sizeFront(); sizeWave();
window.addEventListener('resize', () => { sizeFront(); sizeWave(); });

// The app is exactly as tall as the window. Installed on Android, the browser can report
// the wrong height when the app opens and only correct it later without saying so, which
// pushed the track bar off the bottom; so the height is measured here and re-checked.
let appH = 0;
function fitWindow() {
  const h = Math.round(window.visualViewport ? visualViewport.height : innerHeight);
  if (!h || h === appH) return;
  if (h < appH && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;   // only the keyboard opening
  appH = h;
  document.documentElement.style.setProperty('--app-h', h + 'px');
  sizeFront(); sizeWave();
}
fitWindow();
for (const type of ['resize', 'orientationchange', 'pageshow', 'focus']) window.addEventListener(type, fitWindow);
if (window.visualViewport) visualViewport.addEventListener('resize', fitWindow);
document.addEventListener('visibilitychange', fitWindow);
for (const ms of [100, 400, 1000, 2500]) setTimeout(fitWindow, ms);
setInterval(fitWindow, 2000);
new ResizeObserver(sizeWave).observe(wave);
show.cues.forEach((cue) => { if (!cue.id) cue.id = Date.now() + '-' + (cueSeq++); });
syncUI();
syncToPlayhead();
saved = snapshot();
showHistory();
compute(state, 0, shown);

let lastMs = 0, wall = 0, timeText = '', nextText = '';
function frame(ms) {
  if (atHome) return;                      // nothing to draw behind the project list
  const dt = Math.min(0.1, (ms - lastMs) / 1000 || 0);
  lastMs = ms; wall += dt;
  if (player.playing && !player.audio) {
    player.t += dt;
    if (player.t >= duration()) { player.t = duration(); setPlaying(false); }
  }
  const T = currentTime(), idx = activeCue(T), live = player.playing || scrubbing;
  if (live && idx !== lastIdx) follow = true;
  lastIdx = idx;
  if (follow && live && idx !== loadedIdx) loadCue(idx);

  const t = player.playing ? T : wall;           // effects lock to the track while it plays
  if (follow && live && show.cues.length) timelineFrame(T, t, target); else compute(state, t, target);
  ease(dt);
  shareGround(shown);
  lightFigures(shown);
  drawFront(shown);
  if (three) three.update(shown);
  drawWave(T, idx);

  const text = `${fmt(T)} / ${fmt(duration())}`;
  if (text !== timeText) $('time').textContent = timeText = text;
  const next = show.cues[idx + 1];
  const nextNow = player.playing && next ? `Next: ${cueLabel(next)} in ${(next.time - T).toFixed(1)} s` : '';
  if (nextNow !== nextText) $('next-text').textContent = nextText = nextNow;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// everything is in place: show the page (it starts blank so a reload cannot flash the wrong screen)
requestAnimationFrame(() => document.documentElement.classList.remove('booting'));

// Installable app: keep a copy of the files on the device so it opens offline.
// Only on the live site; a local preview should always show the files on disk.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
