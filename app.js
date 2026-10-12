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
  ['none', 'Stage Wash'], ['flash', 'Flashing'], ['alt', 'Alternating'],
  ['fastfade', 'Fast Fading'], ['slowfade', 'Slow Fading'],
  ['party', 'Stationary Party'], ['moveparty', 'Moving Party'],
  ['chase', 'Dimmer Chase'],
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
// The stage's size comes from the layout, in metres: `layout.stage = { w, d, h }` (width,
// depth, and how high the stage floor is above the room's). A layout without one has the KDT
// stage. setStage moves everything that is placed by the stage: its edges, the aiming zones,
// the cyclorama, how far lights can be dragged, and how much of the drawing is shown.
const UNIT = 101;                        // plan units in a metre
const stageOf = (layout) => Object.assign({ w: 10, d: 6, h: 0.6 }, layout.stage);
const BOUNDS = {}, PLAN_BOUNDS = {}, FULL = {}, PHONE_VIEW = {};
const FIT = { x: 1, z: 1 };              // the front view always shows the whole stage: how much it is squeezed to fit
let STAGE_H = 0.6;
// A place on the KDT plan, moved to where it belongs on this stage: across the stage in
// proportion, and off the stage at the same distance from its edge.
const sx = (x) => (x < 495 ? STAGE.x0 - (495 - x) : x > 1505 ? STAGE.x1 + (x - 1505) : STAGE.cx + (x - 1000) * (STAGE.x1 - STAGE.x0) / 1010);
const sy = (y) => (y < 218 ? STAGE.y0 - (218 - y) : y > 828 ? STAGE.y1 + (y - 828) : STAGE.cy + (y - 523) * (STAGE.y1 - STAGE.y0) / 610);
function setStage(stage) {
  const halfW = stage ? stage.w * UNIT / 2 : 505, halfD = stage ? stage.d * UNIT / 2 : 305;
  Object.assign(STAGE, { x0: STAGE.cx - halfW, x1: STAGE.cx + halfW, y0: STAGE.cy - halfD, y1: STAGE.cy + halfD });
  STAGE_H = stage ? stage.h : 0.6;
  const w = halfW * 2, d = halfD * 2;
  Object.assign(ZONES, { x: sx(624), w: (sx(1383) - sx(624)) / 3, y: STAGE.y0, h: d / 3 });
  for (const i of [0, 1, 2]) { ZONE_X[i] = ZONES.x + ZONES.w * (i + 0.5); ZONE_Y[i] = Math.round(ZONES.y + ZONES.h * (i + 0.5)); }
  Object.assign(CYC, { z: -(d / UNIT / 2 + 0.13), halfW: 3.8 * w / 1010 });
  Object.assign(BOUNDS, { x0: STAGE.x0 + 30, x1: STAGE.x1 - 30, y0: STAGE.y0 + 30, y1: STAGE.y1 - 24 });
  Object.assign(PLAN_BOUNDS, { x0: STAGE.x0 - 205, x1: STAGE.x1 + 205, y0: STAGE.y0 - 68, y1: STAGE.y1 + 262 });      // face and side lights stand off the stage
  Object.assign(FULL, { x: STAGE.x0 - 245, y: STAGE.y0 - 108, w: w + 490, h: d + 400 });       // the whole drawing, face lights included
  Object.assign(PHONE_VIEW, { x: STAGE.x0 - 123, y: STAGE.y0 - 68, w: w + 246, h: d + 120 });
  FIT.x = 1010 / w; FIT.z = 610 / d;
  Object.assign(STAGE_VIEW, FULL);
}
// Objects can stand well away from the stage (seating, a back wall): the drawing grows to hold them.
const STAGE_VIEW = {};
function growDrawing(objects) {
  let x0 = STAGE_VIEW.x, y0 = STAGE_VIEW.y, x1 = x0 + STAGE_VIEW.w, y1 = y0 + STAGE_VIEW.h;
  for (const o of objects) {
    const a = (o.rot || 0) * Math.PI / 180, cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
    const rx = (o.w * cos + o.d * sin) * UNIT / 2 + 60, ry = (o.w * sin + o.d * cos) * UNIT / 2 + 60;
    x0 = Math.min(x0, o.x - rx); x1 = Math.max(x1, o.x + rx); y0 = Math.min(y0, o.y - ry); y1 = Math.max(y1, o.y + ry);
  }
  const grew = x0 !== FULL.x || y0 !== FULL.y || x1 - x0 !== FULL.w || y1 - y0 !== FULL.h;
  Object.assign(FULL, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  return grew;
}
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
// A light's colour is one of the nine classic names above or any hex value ("#ffcc00"),
// which is what a template's own colour set, the RGB picker and the white slider store.
const hexOf = (value) => (value && value[0] === '#' ? value : COLORS[value] || '');
const rgbOf = (value) => RGB[value] || (RGB[value] = /^#[0-9a-f]{6}$/i.test(value) ? hex2rgb(value) : [0, 0, 0]);
// White light from warm (2700 K) to cool (6500 K), as a hex colour.
function kelvinHex(k) {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
const KELVINS = Array.from({ length: 39 }, (_, i) => 2700 + i * 100);
// How each kind of light is controlled, set by the project's stage template. Each kind has a
// type: 'set' (a list of named colours), 'onoff', 'rgb' (any colour) or 'white' (warm to cool).
// Without settings of its own a project gets the classic colours.
const LIGHT_KINDS = [['led', 'LEDs'], ['spot', 'Spotlights'], ['face', 'Face Lights'], ['side', 'Side Lights'], ['cyclo', 'Cyclorama']];
const LIGHT_TYPES = [['set', 'Color Set'], ['onoff', 'On / Off'], ['rgb', 'RGB Spectrum'], ['white', 'White Spectrum']];
const SWITCHED = ['spot', 'face', 'side'];       // kinds that are only ever on or off (or dimmed); their one choice is the colour when on
const WARM_HEX = '#fff1be';
function lightsOf(owner, kinds = []) {
  const named = (names) => names.map((name) => ({ name: name[0].toUpperCase() + name.slice(1), value: name }));
  const own = (owner && owner.lights) || {};
  const switched = (kind) => ({ type: 'onoff', on: (own[kind] && own[kind].on) || WARM_HEX });
  return {
    led: own.led || { type: 'set', colors: named(Object.keys(COLORS)) },
    spot: switched('spot'), face: switched('face'), side: switched('side'),
    cyclo: own.cyclo || { type: 'set', colors: named(CYCLO.filter((name) => name !== 'none')) },
    ...Object.fromEntries(kinds.map((kind) => { const f = fixtureOf(kind); return [kind.id, own[kind.id] || (f && f.control === 'rgb' ? { type: 'rgb' } : { type: 'onoff', on: (f && f.on) || WARM_HEX })]; })),
  };
}
// What to call a colour on the PDF: its name in the set, or what the picker or slider made.
function colorLabel(value, cfg) {
  const same = (a, b) => hexOf(a).toLowerCase() === hexOf(b).toLowerCase();
  const hit = cfg && cfg.type === 'set' && cfg.colors.find((c) => same(c.value, value));
  if (hit) return hit.name;
  if (COLORS[value]) return value[0].toUpperCase() + value.slice(1);
  if (cfg && cfg.type === 'onoff') return 'On';
  const kelvin = KELVINS.find((k) => kelvinHex(k) === String(value).toLowerCase());
  return kelvin ? `White ${kelvin} K` : String(value).toUpperCase();
}

// Every light comes from the project's layout: a list of { id, x, y } for each kind (LEDs,
// spotlights, face lights, side lights). The layout below is the KDT TB UCC stage; a project
// can move, add and remove them. A layout saved before face and side lights could be moved
// has none listed and gets the classic positions.
function templateLayout() {
  const leds = [], spots = [];
  LED_ROWS.forEach((r) => LED_X.forEach((x, col) => leds.push({ id: 'F' + (r.first - col), x, y: r.y })));
  SPOT_ROWS.forEach((r) => SPOT_X.forEach((x, col) => spots.push({ id: String(r.first - col), x, y: r.y })));
  return { leds, spots, faces: classicFaces(), sides: classicSides() };
}
const classicFaces = () => FACE_X.map((x, i) => ({ id: 'A' + (i + 1), x, y: FACE_Y }));
function classicSides() {
  const out = [];
  SIDES.forEach((side, s) => SIDE_Y.forEach((y, i) => out.push({ id: 'S' + (s * 5 + i + 1), x: SIDE_X[side], y })));
  return out;
}
// A layout can also define kinds of light of its own (a projector, a color bar...):
//   layout.kinds   = [{ id, name, shape }]        shape: how it is drawn on the plan
//   layout.customs = [{ id, kind, x, y }]         the lights of those kinds
// How a kind is controlled is set with the other light settings, under its id.
const SHAPES = [['circle', 'Circle'], ['square', 'Square'], ['bar', 'Bar'], ['triangle', 'Triangle']];
const kindsOf = (layout) => layout.kinds || [];
const customsOf = (layout) => layout.customs || [];
// Things that stand on or around the stage and give no light (a platform, a riser...):
//   layout.objects = [{ id, type, name, x, y, z, rot, w, d, h }]
// x and y are where its centre is on the plan; z is how far its underside is above the stage
// floor, and w, d, h its width, depth and height, all in metres; rot turns it, in degrees.
const objectsOf = (layout) => layout.objects || [];
// The library an object is picked from. Each entry is one kind of object: its starting size
// in metres, how far off the stage floor it starts (z), how it is drawn (look), and for
// truss and bars where other pieces connect (joins: places on its outline, as fractions of
// half its width and half its depth). `up` marks pieces that stand upright, which others
// sit on top of. All are generic shapes, not any maker's product. To add a kind of object,
// add a line here.
// Truss, rigging and other equipment are no longer offered (group 'old'): they stay listed so
// layouts that already use them still draw.
const ASSET_GROUPS = [['light', 'Lights'], ['stage', 'Stage'], ['screen', 'Screens']];
const ENDS = [[-1, 0], [1, 0]], SIDES4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ASSETS = [
  { type: 'platform', group: 'stage', name: 'Platform', w: 2, d: 1, h: 0.3, z: 0, look: 'solid' },
  { type: 'riser', group: 'stage', name: 'Riser', w: 2, d: 1, h: 0.6, z: 0, look: 'solid' },
  { type: 'wing', group: 'stage', name: 'Stage Wing', w: 2, d: 6, h: 0.6, z: -0.6, look: 'solid', beside: 'left' },
  { type: 'backstage', group: 'stage', name: 'Backstage Area', w: 10, d: 2, h: 0.6, z: -0.6, look: 'solid', beside: 'back' },
  { type: 'backdrop', group: 'stage', name: 'Backdrop', w: 8, d: 0.1, h: 5, z: 0, look: 'flat', beside: 'back' },
  { type: 'wall', group: 'stage', name: 'Wall', w: 10, d: 0.2, h: 6, z: -0.6, look: 'flat', beside: 'back' },
  { type: 'ceiling', group: 'stage', name: 'Ceiling Panel', w: 6, d: 4, h: 0.1, z: 7, look: 'solid' },
  { type: 'seats', group: 'stage', name: 'Audience Seating', w: 6, d: 2.4, h: 1, z: -0.6, look: 'seats', beside: 'front' },
  { type: 'stairs', group: 'stage', name: 'Stairs', w: 1.2, d: 1.4, h: 0.6, z: -0.6, look: 'solid', beside: 'front' },
  { type: 'truss1', group: 'old', name: 'Straight Truss', note: '1 m', w: 1, d: 0.29, h: 0.29, z: 5, look: 'truss', joins: ENDS },
  { type: 'truss2', group: 'old', name: 'Straight Truss', note: '2 m', w: 2, d: 0.29, h: 0.29, z: 5, look: 'truss', joins: ENDS },
  { type: 'truss3', group: 'old', name: 'Straight Truss', note: '3 m', w: 3, d: 0.29, h: 0.29, z: 5, look: 'truss', joins: ENDS },
  { type: 'corner', group: 'old', name: 'Corner', note: '90°', w: 0.29, d: 0.29, h: 0.29, z: 5, look: 'truss', joins: [[1, 0], [0, 1]] },
  { type: 'tee', group: 'old', name: 'T-Junction', w: 0.29, d: 0.29, h: 0.29, z: 5, look: 'truss', joins: [[-1, 0], [1, 0], [0, 1]] },
  { type: 'tower', group: 'old', name: 'Truss Tower', note: '5 m', w: 0.29, d: 0.29, h: 5, z: 0, look: 'tower', joins: SIDES4, up: true },
  { type: 'stand', group: 'old', name: 'Floor Stand', note: '2.5 m', w: 1, d: 1, h: 2.5, z: 0, look: 'stand', joins: [[0, 0]], up: true },
  { type: 'bar', group: 'old', name: 'Lighting Bar', note: '3 m', w: 3, d: 0.05, h: 0.05, z: 5, look: 'pipe', joins: ENDS },
  { type: 'boom', group: 'old', name: 'Boom', note: '3 m', w: 0.05, d: 0.05, h: 3, z: 0, look: 'stand', joins: [[0, 0]], up: true },
  { type: 'videowall', group: 'screen', name: 'LED Video Wall', w: 4, d: 0.15, h: 2.5, z: 0.5, look: 'screen' },
  { type: 'screen', group: 'screen', name: 'Projection Screen', w: 4, d: 0.05, h: 2.25, z: 1, look: 'screen' },
  { type: 'booth', group: 'old', name: 'DJ Booth', w: 2, d: 0.8, h: 1, z: 0, look: 'solid' },
  { type: 'speaker', group: 'old', name: 'Speaker', w: 0.5, d: 0.5, h: 1.2, z: 0, look: 'solid' },
  { type: 'curtain', group: 'old', name: 'Curtain', w: 3, d: 0.1, h: 5, z: 0, look: 'curtain' },
  { type: 'hazer', group: 'old', name: 'Haze Machine', w: 0.5, d: 0.3, h: 0.25, z: 0, look: 'solid' },
];
// The lights in the library. Each is a generic fixture, not any maker's model: how it is
// drawn on the plan (shape), how wide its beam starts out in degrees (beam), where it starts
// (z: metres above the stage floor; tilt: degrees away from straight down; pan: degrees
// clockwise from pointing upstage), and how it is controlled until Light Settings says
// otherwise. `moving` marks moving heads. A light from the library is a custom light whose
// kind remembers which fixture it is (`kind.fixture`), so cues, colours and the PDF treat it
// like any other light. Real models can be added here later, with a maker and a model name.
const FIXTURES = [
  { type: 'profile', name: 'Profile Spot', shape: 'profile', beam: 26, z: 5, tilt: 0, pan: 0, control: 'onoff' },
  { type: 'fresnel', name: 'Fresnel', shape: 'fresnel', beam: 40, z: 5, tilt: 0, pan: 0, control: 'onoff' },
  { type: 'par', name: 'PAR', shape: 'circle', beam: 30, z: 5, tilt: 0, pan: 0, control: 'rgb' },
  { type: 'mhspot', name: 'Moving Head Spot', shape: 'mover', beam: 20, z: 5, tilt: 0, pan: 0, control: 'rgb', moving: true },
  { type: 'mhwash', name: 'Moving Head Wash', shape: 'mover', beam: 45, z: 5, tilt: 0, pan: 0, control: 'rgb', moving: true },
  { type: 'mhbeam', name: 'Moving Head Beam', shape: 'mover', beam: 4, z: 5, tilt: 0, pan: 0, control: 'rgb', moving: true },
  { type: 'batten', name: 'LED Batten', shape: 'batten', beam: 60, z: 5, tilt: 0, pan: 0, control: 'rgb' },
  { type: 'follow', name: 'Followspot', shape: 'follow', beam: 8, z: 3, tilt: 70, pan: 0, control: 'onoff', off: 'front' },
  { type: 'blinder', name: 'Blinder', shape: 'blinder', beam: 80, z: 5, tilt: 75, pan: 180, control: 'onoff' },
  { type: 'strobe', name: 'Strobe', shape: 'strobe', beam: 100, z: 5, tilt: 45, pan: 180, control: 'onoff', on: '#ffffff' },
  { type: 'cyc', name: 'Cyc Light', shape: 'cyc', beam: 90, z: 5, tilt: 35, pan: 0, control: 'rgb', off: 'back' },
];
const fixtureOf = (kind) => (kind && kind.fixture ? FIXTURES.find((f) => f.type === kind.fixture) : null);
// How each fixture is drawn on the plan, around its own centre and pointing upstage.
const FIXTURE_PATHS = {
  profile: 'M-9,20 h18 v-26 l7,-15 h-32 l7,15 z',
  fresnel: 'M0,-17 a17,17 0 1,0 0.01,0 z M-10,-24 h20 v5 h-20 z',
  mover: 'M-18,-18 h36 v36 h-36 z M0,-11 a11,11 0 1,0 0.01,0 z',
  batten: 'M-36,-9 h72 v18 h-72 z',
  follow: 'M-8,26 h16 v-40 l5,-12 h-26 l5,12 z',
  blinder: 'M-21,-13 h42 v26 h-42 z M-10,-7 a7,7 0 1,0 0.01,0 z M10,-7 a7,7 0 1,0 0.01,0 z',
  strobe: 'M-24,-10 h48 v20 h-48 z M-18,-2 h36 v4 h-36 z',
  cyc: 'M-22,11 h44 l-8,-22 h-28 z',
};
// Where a light is and where it points. Lights made before these could be set hang at the
// rig's height and point straight down.
const heightOf = (light) => (light.z == null ? RIG_H : light.z);
// How far from under the light its beam lands on the stage floor, in metres (null: it never does).
function reachOf(light) {
  const tilt = light.tilt || 0, h = heightOf(light);
  return tilt < 85 && h > 0 ? h * Math.tan(tilt * Math.PI / 180) : tilt < 85 ? 0 : null;
}
// Where a light's beam goes for a pan, tilt and beam width in degrees: which way it points,
// how long the throw is, and where and how wide it lands on the stage floor, in metres.
// Worked out from the light's height and angles; one shared result is reused, since this
// runs for every light on every frame.
const THROW = { dx: 0, dy: -1, dz: 0, len: 0, r: 0, x: 0, z: 0, lands: true };
function throwOf(light, pan, tilt, beam) {
  const h = heightOf(light), t = tilt * Math.PI / 180, p = pan * Math.PI / 180, half = Math.min(60, beam / 2) * Math.PI / 180;
  THROW.dx = Math.sin(p) * Math.sin(t); THROW.dy = -Math.cos(t); THROW.dz = -Math.cos(p) * Math.sin(t);
  THROW.lands = THROW.dy < -0.08 && h > 0.05 && h / -THROW.dy <= 30;
  THROW.len = THROW.lands ? h / -THROW.dy : 10;                  // a beam that never lands is drawn 10 m long
  THROW.r = Math.max(0.15, THROW.len * Math.tan(half));
  THROW.x = light.x3 + THROW.dx * THROW.len; THROW.z = light.z3 + THROW.dz * THROW.len;
  return THROW;
}
// Light arrives weaker after a long throw, and a tight beam is brighter than a wide one.
const punch = (len, beam) => Math.min(1.6, Math.pow(5 / Math.max(1, len), 1.2)) * Math.min(1.6, Math.sqrt(30 / Math.max(2, beam)));
// DMX patch: where a light sits on the control cable (universe and start address) and how many
// channels it takes. The starting counts are plain guesses for a generic fixture (1 for a
// dimmer, 4 for colour, 16 for a moving head), not any real product's mode; type the real one.
const channelsOf = (light, kinds) => {
  if (light.ch) return light.ch;
  const f = fixtureOf(kinds.find((k) => k.id === light.kind));
  return f ? (f.moving ? 16 : f.control === 'rgb' ? 4 : 1) : 1;
};
// Every light and object in a layout as a spreadsheet (CSV): what it is, where it is in metres
// from the stage centre, how high, where it points, what it hangs on, and its DMX patch.
function fixtureList(layout, project) {
  const kinds = kindsOf(layout), objects = objectsOf(layout), m = (v) => Math.round(v * 100) / 100;
  const xy = (it) => [m((it.x - STAGE.cx) / UNIT), m((it.y - STAGE.cy) / UNIT)];
  const rows = [['ID', 'Name', 'Type', 'X (m)', 'Y (m)', 'Height (m)', 'Pan', 'Tilt', 'Beam', 'Mounted On', 'Universe', 'Address', 'Channels']];
  const plain = (list, type) => { for (const it of list) rows.push([it.id, '', type, ...xy(it), '', '', '', '', '', '', '', '']); };
  plain(layout.leds, 'LED'); plain(layout.spots, 'Spotlight'); plain(sidesOf(layout), 'Side Light'); plain(facesOf(layout), 'Face Light');
  for (const it of customsOf(layout)) {
    const kind = kinds.find((k) => k.id === it.kind), f = fixtureOf(kind), on = it.on && objects.find((o) => o.id === it.on);
    rows.push([it.id, it.name || '', kind ? kind.name + (f ? ' (Generic)' : '') : '', ...xy(it), m(heightOf(it)), it.pan || 0, it.tilt || 0, it.beam || (f ? f.beam : 30), on ? on.name : '', it.uni || '', it.addr || '', channelsOf(it, kinds)]);
  }
  for (const o of objects) rows.push([o.id, o.name, assetOf(o).name, ...xy(o), m(o.z || 0), o.rot || 0, '', '', '', '', '', '']);
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return `${project ? project.name : 'Layout'}\n` + rows.map((row) => row.map(cell).join(',')).join('\n') + '\n';
}
const assetOf = (o) => ASSETS.find((a) => a.type === o.type) || { type: o.type, name: 'Block', look: 'solid' };
// Where an object's connecting points are on the plan, turned with it.
function joinsOf(o) {
  const a = (o.rot || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return (assetOf(o).joins || []).map(([fx, fy]) => {
    const x = fx * o.w * UNIT / 2, y = fy * o.d * UNIT / 2;
    return { x: o.x + x * cos - y * sin, y: o.y + x * sin + y * cos };
  });
}
const facesOf = (layout) => layout.faces || classicFaces();
const sidesOf = (layout) => layout.sides || classicSides();
// side lights by the wing they stand in (left or right of centre), from the back of the stage to the front
function bySide(sides) {
  const out = { L: [], R: [] };
  [...sides].sort((a, b) => a.y - b.y || a.x - b.x).forEach((s) => out[s.x < STAGE.cx ? 'L' : 'R'].push(s));
  return out;
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
const FRONT_OBJECTS = [];
const LEDS = [], SPOTS = [], LED_ROW_Y = [], FACES = [], CUSTOMS = [], KINDS = [], OBJECTS = [], PEOPLE = [], SIDE_LIGHTS = { L: [], R: [] };       // filled by useLayout once the project is known
let ledRows = 0, spotRows = 0, FACE_Z = 0;
function useLayout(layout) {
  setStage(layout.stage);
  PEOPLE.length = OBJECTS.length = 0;
  for (const [x, y] of PEOPLE_AT) { const [x3, z3] = to3(sx(x), sy(y)); PEOPLE.push({ x3, z3 }); }
  for (const o of objectsOf(layout)) { const [x3, z3] = to3(o.x, o.y); OBJECTS.push(Object.assign({}, o, { x3, z3 })); }
  growDrawing(OBJECTS);
  // what the front view draws: objects on or over the stage, with how wide each looks from the front
  FRONT_OBJECTS.length = 0;
  for (const o of OBJECTS) {
    if (Math.abs(o.z3) > (STAGE.y1 - STAGE.y0) / UNIT / 2 + 0.6 || (o.z || 0) < -0.01) continue;
    const a = (o.rot || 0) * Math.PI / 180;
    FRONT_OBJECTS.push(Object.assign({ look: assetOf(o).look, across: o.w * Math.abs(Math.cos(a)) + o.d * Math.abs(Math.sin(a)) }, o));
  }
  FRONT_OBJECTS.sort((a, b) => a.z3 - b.z3);
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
  const metres = (it) => { const [x3, z3] = to3(it.x, it.y); return { id: it.id, x: it.x, y: it.y, x3, z3 }; };
  FACES.length = 0;
  for (const it of facesOf(layout)) FACES.push(metres(it));
  FACE_Z = FACES.length ? FACES.reduce((sum, f) => sum + f.z3, 0) / FACES.length : to3(0, sy(FACE_Y))[1];
  const wings = bySide(sidesOf(layout));
  for (const side of SIDES) SIDE_LIGHTS[side] = wings[side].map(metres);
  KINDS.length = CUSTOMS.length = 0;
  KINDS.push(...kindsOf(layout));
  for (const it of customsOf(layout)) if (KINDS.some((k) => k.id === it.kind)) {
    const fx = fixtureOf(KINDS.find((k) => k.id === it.kind));
    CUSTOMS.push(Object.assign(metres(it), { kind: it.kind, z: it.z, pan: it.pan || 0, tilt: it.tilt || 0, beam: it.beam || (fx ? fx.beam : 30), name: it.name, fx, moving: !!(fx && fx.moving) }));
  }
}
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
        out[led.id] = [tx * 101 + STAGE.cx, tz * 101 + STAGE.cy, wx * 101 + STAGE.cx, STAGE.y0];
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
  sidePos: { L: SIDE_LIGHTS.L.map(() => false), R: SIDE_LIGHTS.R.map(() => false) },
  cyclo: 'none', effect: 'none', bpm: 120,
  custom: {},            // custom lights: id -> colour, missing when off
  dim: {},               // custom lights: id -> brightness from 0 to 1, missing when full
  point: {},             // moving heads: id -> { pan, tilt, beam } in degrees, missing when left as the layout has them
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
    projects.push({ id, name: (oldShow && oldShow.projectName) || 'My first show', template: TEMPLATE, created: Date.now(), updated: Date.now(), cues: oldShow && oldShow.cues ? oldShow.cues.length : 0 });
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
// Drafts: items that are not in a project yet. Each draft is kept as a project of its own
// (`draft`) holding that one item, so it has its own stage layout. Drafts never show in the
// project list; their items show on the home screen and can be moved into a project that
// uses the same layout.
const realProjects = () => projects.filter((p) => !p.draft && !p.scratch);
const draftProjects = () => projects.filter((p) => p.draft && p.items.length);
if (projects.some((p) => p.drafts)) {          // the earlier arrangement: one shared holder for every draft
  const made = [];
  for (const holder of projects.filter((p) => p.drafts)) {
    for (const item of holder.items) {
      made.push({ id: 'p' + item.id, draft: true, name: item.name, template: holder.template, templateId: holder.templateId, created: item.updated || Date.now(), updated: item.updated || Date.now(), cues: item.cues || 0, thumb: item.thumb, items: [item] });
    }
  }
  projects = [...made, ...projects.filter((p) => !p.drafts)];
  raw.set(PROJECTS_KEY, projects);
  if (currentId && !currentProject()) currentId = currentItemId = null;
}
if (currentId && currentProject().draft && !currentItemId) currentId = null;      // a draft has no page of its own
// A layout is edited inside a throwaway project (`scratch`). One left over from an editing
// session that was abandoned is cleared away.
if (projects.some((p) => p.scratch) && !(currentId && currentProject().scratch && currentItemId)) {
  for (const p of projects.filter((q) => q.scratch)) {
    raw.del(projectKey(LAYOUT_KEY, p.id));
    for (const item of p.items) { raw.del(projectKey(LOOK_KEY, item.id)); raw.del(projectKey(SHOW_KEY, item.id)); }
  }
  projects = projects.filter((p) => !p.scratch);
  raw.set(PROJECTS_KEY, projects);
  if (currentId && !currentProject()) currentId = currentItemId = null;
}
const saveProjects = () => raw.set(PROJECTS_KEY, projects);

// Stage templates: where the LEDs and spotlights sit when a project starts. One is built
// in; the rest are saved from the layout editor and kept on this device.
const TEMPLATES_KEY = 'slp-templates-v1';
const BUILTIN = { id: 'kdt-tb-ucc', name: TEMPLATE, builtin: true, get layout() { return templateLayout(); } };
const SCRATCH = { id: 'blank', name: 'Blank stage', layout: { leds: [], spots: [], faces: [], sides: [] } };
let templates = raw.get(TEMPLATES_KEY, []);
const saveTemplates = () => raw.set(TEMPLATES_KEY, templates);
const findTemplate = (id) => (id === SCRATCH.id ? SCRATCH : templates.find((t) => t.id === id) || BUILTIN);
function copyLayout(layout) {
  const plain = (list) => list.map(({ id, x, y }) => ({ id, x, y }));
  const out = { leds: plain(layout.leds), spots: plain(layout.spots) };
  if (layout.faces) out.faces = plain(layout.faces);
  if (layout.sides) out.sides = plain(layout.sides);
  if (layout.kinds && layout.kinds.length) {
    out.kinds = layout.kinds.map(({ id, name, shape, fixture }) => (fixture ? { id, name, shape, fixture } : { id, name, shape }));
    out.customs = (layout.customs || []).map((light) => {
      const one = { id: light.id, kind: light.kind, x: light.x, y: light.y };
      for (const key of ['name', 'z', 'pan', 'tilt', 'beam', 'on', 'uni', 'addr', 'ch']) if (light[key] != null && light[key] !== '') one[key] = light[key];     // only what was set
      return one;
    });
  }
  if (layout.stage) out.stage = { w: layout.stage.w, d: layout.stage.d, h: layout.stage.h };
  if (layout.objects && layout.objects.length) out.objects = layout.objects.map(({ id, type, name, x, y, z, rot, w, d, h, media }) => (media ? { id, type, name, x, y, z, rot, w, d, h, media: { id: media.id, name: media.name, type: media.type } } : { id, type, name, x, y, z, rot, w, d, h }));
  return out;
}
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
// A screen can show a picture or a video: `object.media = { id, name, type }`. The file itself
// is too big for the layout, so it lives in the browser's database beside the soundtracks,
// under its id, and travels inside the show file. A layout shared by code does not carry it.
const mediaKey = (id) => 'media:' + id;
const mediaShown = {};                   // object id -> a promise of the picture or video element playing it
function mediaOf(o) {
  if (!o.media) return null;
  return mediaShown[o.id] || (mediaShown[o.id] = audioStore.get(mediaKey(o.media.id)).then((file) => new Promise((resolve) => {
    if (!file) return resolve(null);
    const url = URL.createObjectURL(file), video = /^video\//.test(o.media.type || file.type);
    const node = document.createElement(video ? 'video' : 'img');
    if (video) { node.muted = true; node.loop = true; node.playsInline = true; node.addEventListener('loadeddata', () => { node.play().catch(() => {}); resolve(node); }, { once: true }); }
    else node.addEventListener('load', () => resolve(node), { once: true });
    node.addEventListener('error', () => resolve(null), { once: true });
    node.src = url;
  })));
}
for (const o of FRONT_OBJECTS) { const ready = mediaOf(o); if (ready) ready.then((node) => { o.picture = node; }); }

let state = Object.assign(blankLook(), store.get(LOOK_KEY, {}));
let show = Object.assign({ cues: [], trackName: '' }, store.get(SHOW_KEY, {}));
if (currentProject()) show.projectName = currentProject().name;      // the project list holds the name
const prefs = Object.assign({ people: true, theme: 'dark' }, store.get('kdt-lighting-prefs-v1', {}));
// Dark is the app's theme unless light was picked by hand (`themeChosen`); a theme saved
// before that was recorded only followed the device's setting, so it does not count.
if (!prefs.themeChosen) prefs.theme = 'dark';
// The app no longer comes with a stage of its own. A device that already has projects keeps
// the KDT layout as an ordinary template (same id, so those projects still point at it).
if (!prefs.seededKdt && projects.some((p) => !p.draft && p.templateId === BUILTIN.id) && !templates.some((t) => t.id === BUILTIN.id)) {
  templates.unshift({ id: BUILTIN.id, name: TEMPLATE, layout: templateLayout(), created: Date.now() });
  saveTemplates();
  prefs.seededKdt = true;
  store.set('kdt-lighting-prefs-v1', prefs);
}
const selection = new Set();

// Line icons, drawn on a 16 x 16 grid with a thin stroke
const ICONS = {
  menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  back: '<path d="M9.5 3.5 5 8l4.5 4.5"/>',
  viewtile: '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
  viewsmall: '<path d="M3 3h.01M8 3h.01M13 3h.01M3 8h.01M8 8h.01M13 8h.01M3 13h.01M8 13h.01M13 13h.01" stroke-width="2.4"/>',
  viewlist: '<path d="M6 4h7.5M6 8h7.5M6 12h7.5"/><path d="M2.8 4h.01M2.8 8h.01M2.8 12h.01" stroke-width="2"/>',
  moveback: '<path d="M13 8H3.5M7 4.2 3.2 8 7 11.8"/>',
  moveon: '<path d="M3 8h9.5M9 4.2 12.8 8 9 11.8"/>',
  grip: '<path d="M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01" stroke-width="2"/>',
  refresh: '<path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.8v2.6h-2.6"/>',
  folder: '<path d="M2.5 4.5v7.5h11V6H8L6.5 4.5z"/>',
  moveto: '<path d="M2.5 4.5v7.5h11V6H8L6.5 4.5zM7 9h4M9.4 7.4 11 9l-1.6 1.6"/>',
  help: '<circle cx="8" cy="8" r="5.5"/><path d="M6.4 6.5a1.7 1.7 0 1 1 2.5 1.5c-.6.3-.9.7-.9 1.2M8 11.2h.01"/>',
  sliders: '<path d="M2.5 5h3.5M9.5 5h4M2.5 11h5M11 11h2.5"/><circle cx="7.7" cy="5" r="1.7"/><circle cx="9.3" cy="11" r="1.7"/>',
  layout: '<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M5 6.3h1.6M9.4 6.3H11M5 9.7h1.6M9.4 9.7H11"/>',
  share: '<circle cx="4" cy="8" r="1.7"/><circle cx="11.5" cy="4" r="1.7"/><circle cx="11.5" cy="12" r="1.7"/><path d="M5.5 7.2 10 4.8M5.5 8.8 10 11.2"/>',
  check: '<path d="M3.5 8.5 6.5 11.5 12.5 4.8"/>',
  clock: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.3"/>',
  file: '<path d="M4.5 2.5H9l2.5 2.5v8.5h-7zM9 2.5V5h2.5"/>',
  upload: '<path d="M8 10.5v-8M4.8 5.5 8 2.3l3.2 3.2M3 13.5h10"/>',
  alignleft: '<path d="M2.5 2.5v11M5 5h6.5v2.2H5zM5 9h4v2.2H5z"/>',
  aligncentre: '<path d="M8 2.5v11M4.5 5h7v2.2h-7zM5.8 9h4.4v2.2H5.8z"/>',
  alignright: '<path d="M13.5 2.5v11M4.5 5H11v2.2H4.5zM7 9h4v2.2H7z"/>',
  aligntop: '<path d="M2.5 2.5h11M5 5v6.5h2.2V5zM9 5v4h2.2V5z"/>',
  alignmiddle: '<path d="M2.5 8h11M5 4.5v7h2.2v-7zM9 5.8v4.4h2.2V5.8z"/>',
  alignbottom: '<path d="M2.5 13.5h11M5 4.5V11h2.2V4.5zM9 7v4h2.2V7z"/>',
  spreadx: '<path d="M2.5 2.5v11M13.5 2.5v11M6.9 5h2.2v6H6.9z"/>',
  spready: '<path d="M2.5 2.5h11M2.5 13.5h11M5 6.9h6v2.2H5z"/>',
  chevron: '<path d="M4.5 6.5 8 10l3.5-3.5"/>',
  forward: '<path d="M6.5 3.5 11 8l-4.5 4.5"/>',
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
const O_SPOT = LEDS.length * L, O_FACE = O_SPOT + SPOTS.length, O_TYPE = O_FACE + 1, O_POS = O_TYPE + 3, O_CYC = O_POS + SIDE_LIGHTS.L.length + SIDE_LIGHTS.R.length;
const sideAt = (s, j) => O_POS + (s ? SIDE_LIGHTS.L.length : 0) + j;       // side s (0 left, 1 right), light j from the back
const O_CUS = O_CYC + 3;                       // then r, g, b for each custom light
const O_MOV = O_CUS + CUSTOMS.length * 3;    // then pan, tilt and beam width in degrees for each custom light
const FRAME_N = O_MOV + CUSTOMS.length * 3;

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
  // a look from an older or outside file may lack parts: fill them in rather than fail
  if (!look.leds || !look.aim || !look.spots || !look.sidePos || !look.sideTypes) look = Object.assign(blankLook(), look);
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
    const c = name ? rgbOf(name) : ZERO;
    out[o] = c[0] * k; out[o + 1] = c[1] * k; out[o + 2] = c[2] * k;
    out[o + 3] = tx; out[o + 4] = tz; out[o + 5] = wide;
  }
  SPOTS.forEach((s, i) => { out[O_SPOT + i] = look.spots[s.id] ? 1 : 0; });
  out[O_FACE] = look.face / 3;
  SIDE_TYPES.forEach(([id], i) => { out[O_TYPE + i] = look.sideTypes[id] ? 1 : 0; });
  SIDES.forEach((side, s) => SIDE_LIGHTS[side].forEach((light, j) => { out[sideAt(s, j)] = look.sidePos[side] && look.sidePos[side][j] ? 1 : 0; }));
  const c = look.cyclo === 'none' ? ZERO : rgbOf(look.cyclo);
  out[O_CYC] = c[0]; out[O_CYC + 1] = c[1]; out[O_CYC + 2] = c[2];
  CUSTOMS.forEach((light, i) => {
    const value = look.custom && look.custom[light.id], rgb = value ? rgbOf(value) : ZERO;
    const dim = look.dim && look.dim[light.id] != null ? look.dim[light.id] : 1, to = light.moving && look.point && look.point[light.id];
    out[O_CUS + i * 3] = rgb[0] * dim; out[O_CUS + i * 3 + 1] = rgb[1] * dim; out[O_CUS + i * 3 + 2] = rgb[2] * dim;
    out[O_MOV + i * 3] = to ? to.pan : light.pan; out[O_MOV + i * 3 + 1] = to ? to.tilt : light.tilt; out[O_MOV + i * 3 + 2] = (to && to.beam) || light.beam;
  });
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
  for (let i = 0; i < FRAME_N; i++) out[i] = scratch[i] + (isPan(i) ? nearer(out[i] - scratch[i]) : out[i] - scratch[i]) * s;
}
// Pan is an angle: from 350 to 10 degrees is a turn of 20, not 340 the other way.
const isPan = (i) => i >= O_MOV && (i - O_MOV) % 3 === 0;
const nearer = (turn) => ((turn % 360) + 540) % 360 - 180;

// Nothing switches truly instantly: every value eases to its target in about 2 ms
// (so it lands on the next drawn frame), and beam aim takes a little longer, like a
// fixture swinging round.
function ease(dt) {
  const a = 1 - Math.exp(-dt / 0.002), b = 1 - Math.exp(-dt / 0.15), c = 1 - Math.exp(-dt / 0.3);
  for (let i = 0; i < FRAME_N; i++) {
    const isAim = i < O_SPOT && (i % L === 3 || i % L === 4);
    shown[i] += (isPan(i) ? nearer(target[i] - shown[i]) : target[i] - shown[i]) * (i >= O_MOV ? c : isAim ? b : a);         // a moving head takes a moment to swing round
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
const FACE_AT = { get z() { return FACE_Z; } }, SIDE_AT = 5.6;
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
    CUSTOMS.forEach((light, i) => {             // library and custom lights: whoever stands in the pool is lit
      const cr = D[O_CUS + i * 3], cg = D[O_CUS + i * 3 + 1], cb = D[O_CUS + i * 3 + 2];
      if (cr + cg + cb < 0.01) return;
      const T = throwOf(light, D[O_MOV + i * 3], D[O_MOV + i * 3 + 1], D[O_MOV + i * 3 + 2]);
      if (!T.lands) return;
      const d = Math.hypot(T.x - p.x3, T.z - p.z3) / (T.r + 0.35);
      if (d > 1.6) return;
      const w = Math.exp(-d * d * 1.5) * 0.55 * punch(T.len, D[O_MOV + i * 3 + 2]);
      r += cr * w; g += cg * w; b += cb * w;
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
      SIDE_LIGHTS[SIDES[side]].forEach((light, j) => { reach += D[sideAt(side, j)] * Math.max(0, 1 - Math.abs(light.z3 - p.z3) / 1.3); });
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
const selSpots = new Set(), selSides = new Set(), selCustom = new Set();
let aiming = false;        // true while the plan is waiting for a zone to be tapped
let selCyclo = false;      // the cyclorama can be selected too, to bring up its colours
const anySelected = () => selCyclo || selection.size + selSpots.size + selSides.size + selCustom.size > 0;
function clearSelection() { selection.clear(); selSpots.clear(); selSides.clear(); selCustom.clear(); selCyclo = false; }
const toggleIn = (set, key) => { set.has(key) ? set.delete(key) : set.add(key); };

// The part of the drawing on screen. Phones crop to the stage so fixtures are as large
// as possible; pinching zooms further in.
const mqPhone = window.matchMedia('(max-width: 899px)');
const baseView = () => Object.assign({}, mqPhone.matches ? PHONE_VIEW : FULL);
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
function drawFixtures(leds, spots, editing, sides = [...SIDE_LIGHTS.L, ...SIDE_LIGHTS.R], faces = FACES, customs = CUSTOMS, kinds = KINDS, objects = OBJECTS) {
  const layer = planEls.fixtureLayer;
  layer.textContent = '';
  planEls.leds = {}; planEls.aims = {}; planEls.spots = {}; planEls.face = []; planEls.side = { L: [], R: [] }; planEls.custom = {};
  const text = (x, y, value) => el('text', { x, y, 'text-anchor': 'middle' }, value, layer);
  const tag = (shape, kind, id) => {             // lets the layout editor find what was pressed
    shape.parentNode.dataset.kind = kind; shape.parentNode.dataset.id = id;
    if (editing && editing.some((one) => one.kind === kind && one.id === id)) shape.classList.add('picked');
    return shape;
  };
  const others = editing ? objects.flatMap((o) => joinsOf(o).map((at) => ({ o, at }))) : [];
  for (const o of objects) {                     // stage objects lie under the lights
    const look = assetOf(o).look, w = Math.max(o.w * UNIT, 8), d = Math.max(o.d * UNIT, 8), x = o.x - w / 2, y = o.y - d / 2;
    const g = el('g', { class: editing ? 'fx' : '', transform: `rotate(${o.rot || 0} ${o.x} ${o.y})` }, null, layer);
    const line = (x1, y1, x2, y2) => el('line', { x1, y1, x2, y2, class: 'obj-mark' }, null, g);
    if (editing) el('rect', { x: o.x - Math.max(w, 30) / 2, y: o.y - Math.max(d, 30) / 2, width: Math.max(w, 30), height: Math.max(d, 30), class: 'obj-hit' }, null, g);     // thin things are still easy to press
    const shape = el('rect', { x, y, width: w, height: d, rx: look === 'solid' ? 4 : 1, class: 'obj ' + look }, null, g);
    if (look === 'truss') {                       // zigzag bracing between the two chords
      const bays = Math.max(1, Math.round(w / d));
      for (let i = 0; i < bays; i++) line(x + w * i / bays, i % 2 ? y : y + d, x + w * (i + 1) / bays, i % 2 ? y + d : y);
    } else if (look === 'tower' || look === 'stand') {
      line(x, y, x + w, y + d); line(x + w, y, x, y + d);
    } else if (look === 'seats') {
      for (let row = 1; row * 80 < d; row++) line(x, y + row * 80, x + w, y + row * 80);
    }
    if (editing) tag(shape, 'object', o.id);
    if (o.w * UNIT > 70 && look !== 'truss' && look !== 'pipe') el('text', { x: o.x, y: o.y + 5, 'text-anchor': 'middle', class: 'obj-name' }, o.name, layer);
    // where truss connects: a dot at each end, filled where another piece meets it
    if (editing) for (const at of joinsOf(o)) {
      const met = others.some((p) => p.o !== o && Math.hypot(p.at.x - at.x, p.at.y - at.y) < 2);
      el('circle', { cx: at.x, cy: at.y, r: 5, class: 'join' + (met ? ' met' : '') }, null, layer);
    }
  }
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
  const wings = bySide(sides);
  for (const side of SIDES) {
    const d = side === 'L' ? 1 : -1;               // they point in at the stage
    wings[side].forEach((light, i) => {
      const { x, y } = light, key = side + i;
      planEls.side[side].push(tag(fixture(
        ['rect', { x: x - 36, y: y - 30, width: 72, height: 60 }],
        ['polygon', { points: `${x - 22 * d},${y} ${x + 20 * d},${y - 16} ${x + 20 * d},${y + 16}`, class: 'side' }],
        () => { toggleIn(selSides, key); syncUI(); },
        () => { selSides.delete(key); state.sidePos[side][i] = !state.sidePos[side][i]; commit(); }, layer), 'side', light.id));
    });
  }
  for (const light of faces) {
    const { x, y } = light;
    planEls.face.push(tag(fixture(
      ['rect', { x: x - 22, y: y - 30, width: 44, height: 60 }],
      ['rect', { x: x - 8, y: y - 19, width: 16, height: 38, rx: 8, class: 'face' }],
      () => { state.face = (state.face + 1) % 4; commit(); }, null, layer), 'face', light.id));
  }
  for (const light of customs) {
    const kind = kinds.find((k) => k.id === light.kind);
    if (!kind) continue;
    const { x, y } = light;
    const path = FIXTURE_PATHS[kind.shape];
    const shape = path ? ['path', { d: path, transform: `translate(${x} ${y}) rotate(${light.pan || 0})`, 'fill-rule': 'evenodd', class: 'custom' }] : {
      circle: ['circle', { cx: x, cy: y, r: 18, class: 'custom' }],
      square: ['rect', { x: x - 17, y: y - 17, width: 34, height: 34, rx: 5, class: 'custom' }],
      bar: ['rect', { x: x - 36, y: y - 11, width: 72, height: 22, rx: 5, class: 'custom' }],
      triangle: ['polygon', { points: `${x},${y - 20} ${x + 20},${y + 15} ${x - 20},${y + 15}`, class: 'custom' }],
    }[kind.shape] || ['circle', { cx: x, cy: y, r: 18, class: 'custom' }];
    // in the layout editor a tilted light shows where its beam lands
    const reach = editing ? reachOf(light) : 0;
    if (reach !== 0) {
      const a = (light.pan || 0) * Math.PI / 180, lands = reach != null && reach <= 12, far = lands ? reach * UNIT : 300, tx = x + Math.sin(a) * far, ty = y - Math.cos(a) * far;
      el('line', { x1: x, y1: y, x2: tx, y2: ty, class: 'throw' }, null, layer);
      if (lands) el('circle', { cx: tx, cy: ty, r: 7, class: 'throw' }, null, layer);        // further than 12 m away: only the direction is shown
    }
    planEls.custom[light.id] = tag(fixture(
      ['rect', { x: x - 40, y: y - 26, width: 80, height: 52 }], shape,
      () => { toggleIn(selCustom, light.id); syncUI(); }, null, layer), 'custom', light.id);
    text(x, y + 38, light.id);
  }
  // one object or library light selected in the layout editor: a handle to turn it by
  const only = editing && editing.length === 1 && editing[0];
  const turn = only && only.kind === 'object' ? objects.find((o) => o.id === only.id)
    : only && only.kind === 'custom' ? customs.find((c) => c.id === only.id && fixtureOf(kinds.find((k) => k.id === c.kind))) : null;
  if (turn) {
    const lit = only.kind === 'custom', a = ((lit ? turn.pan : turn.rot) || 0) * Math.PI / 180, near = lit ? 24 : turn.d * UNIT / 2, far = near + 38;
    el('line', { x1: turn.x + Math.sin(a) * near, y1: turn.y - Math.cos(a) * near, x2: turn.x + Math.sin(a) * far, y2: turn.y - Math.cos(a) * far, class: 'rot-stem' }, null, layer);
    el('circle', { cx: turn.x + Math.sin(a) * far, cy: turn.y - Math.cos(a) * far, r: 10, class: 'rot-handle', 'data-rot': turn.id, 'data-of': only.kind }, null, layer);
  }
}

// The stage itself and what is fixed around it. Drawn once, and again in the layout editor
// whenever the stage's size changes.
function drawStage() {
  const layer = planEls.stageLayer;
  layer.textContent = '';
  const put = (name, attrs, text) => el(name, attrs, text, layer);
  const area = (x, y, text) => put('text', { x, y, 'text-anchor': 'middle', class: 'area' }, text);
  put('rect', { x: STAGE.x0, y: STAGE.y0, width: STAGE.x1 - STAGE.x0, height: STAGE.y1 - STAGE.y0, rx: 12, class: 'stage' });
  for (const c of [0, 1, 2, 3]) put('line', { x1: ZONES.x + ZONES.w * c, y1: STAGE.y0 + 26, x2: ZONES.x + ZONES.w * c, y2: STAGE.y1 - 12, class: 'grid' });
  for (const r of [1, 2]) put('line', { x1: ZONES.x, y1: ZONES.y + ZONES.h * r, x2: ZONES.x + ZONES.w * 3, y2: ZONES.y + ZONES.h * r, class: 'grid' });
  for (let z = 0; z < 9; z++) {
    put('text', { x: ZONES.x + ZONES.w * (z % 3) + ZONES.w - 10, y: ZONES.y + ZONES.h * Math.floor(z / 3) + ZONES.h - 11, 'text-anchor': 'end', class: 'zone' }, z + 1);
  }
  planEls.cyclo = fixture(
    ['rect', { x: ZONES.x, y: STAGE.y0 - 26, width: ZONES.w * 3, height: 52 }],
    ['rect', { x: ZONES.x, y: STAGE.y0 - 13, width: ZONES.w * 3, height: 26, rx: 6, class: 'cyclo' }],
    () => { selCyclo = !selCyclo; syncUI(); }, null, layer);
  for (const y of CURTAIN_Y) {
    put('line', { x1: STAGE.x0 + 20, y1: sy(y), x2: STAGE.x0 + 114, y2: sy(y), class: 'curtain' });
    put('line', { x1: STAGE.x1 - 113, y1: sy(y), x2: STAGE.x1 - 19, y2: sy(y), class: 'curtain' });
  }
  area(STAGE.cx, sy(168), 'BACKSTAGE');
  area(STAGE.cx, sy(866), 'STAGE FRONT');
  area(sx(318), STAGE.cy - 15, 'STAGE LEFT');
  area(sx(1684), STAGE.cy - 15, 'STAGE RIGHT');
  put('line', { x1: sx(522), y1: sy(FACE_Y), x2: sx(1478), y2: sy(FACE_Y), class: 'rail' });
  area(STAGE.cx, sy(1110), 'AUDIENCE');
}
function buildPlan() {
  planEls.stageLayer = el('g', {});
  drawStage();

  planEls.fixtureLayer = el('g', {});
  drawFixtures(LEDS, SPOTS);
  // Shown over the stage while choosing where the selected LEDs should point.
  planEls.zonePick = el('g', { class: 'zone-pick' });
  for (let z = 0; z < 9; z++) {
    const x = ZONES.x + ZONES.w * (z % 3), y = ZONES.y + ZONES.h * Math.floor(z / 3);
    fixture(
      ['rect', { x: x + 4, y: y + 4, width: ZONES.w - 8, height: ZONES.h - 8, rx: 10 }],
      ['text', { x: x + ZONES.w / 2, y: y + ZONES.h / 2 + 27, 'text-anchor': 'middle', class: 'zone-num' }, z + 1],
      () => { aiming = false; forSelection((id) => { state.aim[id] = z + 1; }); },
      null, planEls.zonePick);
  }
  fixture(                                     // zone 10: the cyclorama itself
    ['rect', { x: ZONES.x + 4, y: STAGE.y0 - 34, width: ZONES.w * 3 - 8, height: 34, rx: 8 }],
    ['text', { x: ZONES.x + ZONES.w * 1.5, y: STAGE.y0 - 8, 'text-anchor': 'middle', class: 'zone-num small' }, '10  Cyclorama'],
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
  if (layoutMode) return layoutRelease();
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.rect) {
    const r = d.area, inside = (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    for (const led of LEDS) if (inside(led.x, led.y)) selection.add(led.id);
    for (const s of SPOTS) if (inside(s.x, s.y)) selSpots.add(s.id);
    for (const side of SIDES) SIDE_LIGHTS[side].forEach((light, i) => { if (inside(light.x, light.y)) selSides.add(side + i); });
    for (const light of CUSTOMS) if (inside(light.x, light.y)) selCustom.add(light.id);
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
const LIGHTS = lightsOf(currentProject(), KINDS);      // how this project's lights are controlled
// the colour of the spotlights, face lights and side lights when they are on
const onRgb = (kind) => (LIGHTS[kind].on.toLowerCase() === WARM_HEX ? WARM : hex2rgb(LIGHTS[kind].on));
const SPOT_C = onRgb('spot'), FACE_C = onRgb('face'), SIDE_C = onRgb('side');
// the plan shows them in those colours too, when they are not the usual warm white
for (const kind of SWITCHED) if (LIGHTS[kind].on.toLowerCase() !== WARM_HEX) document.documentElement.style.setProperty(`--${kind}-on`, LIGHTS[kind].on);

function button(parent, text, cls, onClick) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text;
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}

function forSelection(fn) { for (const id of selection) fn(id); commit(); }
// The colour controls for one kind of light, as its settings ask: swatches, an on/off pair,
// a colour picker or a warm-to-cool slider. `apply` gets the chosen value, or '' for off.
// `mark` collects the buttons by value so the current one can be highlighted.
function palette(box, cfg, apply, mark) {
  box.textContent = '';
  const off = () => {
    const b = button(box, '', 'swatch off', () => apply(''));
    b.title = 'Off';
    if (mark) mark.none = b;
  };
  if (cfg.type === 'onoff') {
    const seg = document.createElement('div');
    seg.className = 'seg palette-seg';
    const lit = cfg.on || '#ffffff';
    const on = button(seg, 'On', 'btn', () => apply(lit));
    const no = button(seg, 'Off', 'btn', () => apply(''));
    if (mark) { mark[lit] = on; mark.none = no; }
    box.appendChild(seg);
  } else if (cfg.type === 'rgb') {
    const pick = document.createElement('input');
    pick.type = 'color'; pick.className = 'color-pick'; pick.value = '#ff40e9'; pick.title = 'Pick any color';
    pick.addEventListener('change', () => apply(pick.value));
    const use = button(box, 'Apply', 'btn', () => apply(pick.value));
    box.insertBefore(pick, use);
    off();
  } else if (cfg.type === 'white') {
    const slide = document.createElement('input');
    slide.type = 'range'; slide.min = 2700; slide.max = 6500; slide.step = 100; slide.value = 4000; slide.className = 'white-slide';
    const tag = document.createElement('span');
    tag.className = 'hint white-tag';
    const show = () => { tag.textContent = slide.value + ' K'; };
    slide.addEventListener('input', show);
    slide.addEventListener('change', () => apply(kelvinHex(+slide.value)));
    show();
    box.appendChild(slide); box.appendChild(tag);
    off();
  } else {
    for (const color of cfg.colors) {
      const b = button(box, '', 'swatch', () => apply(color.value));
      b.style.background = hexOf(color.value); b.title = color.name;
      if (mark) mark[color.value] = b;
    }
    off();
  }
}
const each = (selector, fn) => document.querySelectorAll(selector).forEach(fn);

function buildControls() {
  palette($('led-colors'), LIGHTS.led, (value) => forSelection((id) => { if (value) state.leds[id] = value; else delete state.leds[id]; }));
  $('aim-down').addEventListener('click', () => { aiming = false; forSelection((id) => { delete state.aim[id]; }); });
  $('aim-zone').addEventListener('click', () => { aiming = !aiming; syncUI(); });
  $('deselect').addEventListener('click', () => { clearSelection(); syncUI(); });
  each('[data-sel-spots]', (b) => b.addEventListener('click', () => {
    for (const id of selSpots) state.spots[id] = b.dataset.selSpots === 'on';
    commit();
  }));
  each('[data-sel-sides]', (b) => b.addEventListener('click', () => {
    for (const key of selSides) state.sidePos[key[0]][+key.slice(1)] = b.dataset.selSides === 'on';
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
    if (kind === 'side') for (const side of SIDES) SIDE_LIGHTS[side].forEach((light, i) => selSides.add(side + i));
    syncUI();
  }));

  FACE_LEVELS.forEach((name, i) => ui.face.push(button($('face'), name, 'btn', () => { state.face = i; commit(); })));
  for (const [id, name] of SIDE_TYPES) {
    ui.sideTypes[id] = button($('side-types'), name, 'btn', () => { state.sideTypes[id] = !state.sideTypes[id]; commit(); });
  }
  palette($('cyclo-colors'), LIGHTS.cyclo, (value) => { state.cyclo = value || 'none'; commit(); }, ui.cyclo);
  // A section for each custom kind of light: pick them all, then give the selected ones (or,
  // with none selected, all of that kind) a color.
  for (const kind of KINDS) {
    const section = document.createElement('div');
    section.className = 'group'; section.id = 'sec-kind-' + kind.id;
    const head = document.createElement('div');
    head.className = 'sec-head';
    const title = document.createElement('h3');
    title.textContent = kind.name;
    const count = document.createElement('span');
    count.className = 'count';
    head.appendChild(title); head.appendChild(count); section.appendChild(head);
    const line = (label) => {
      const row = document.createElement('div');
      row.className = 'line' + (label === 'Color' ? ' top' : '');
      const lbl = document.createElement('span');
      lbl.className = 'lbl'; lbl.textContent = label;
      row.appendChild(lbl); section.appendChild(row);
      return row;
    };
    const mine = () => CUSTOMS.filter((light) => light.kind === kind.id);
    const seg = document.createElement('div');
    seg.className = 'seg';
    button(seg, 'All', 'btn', () => { clearSelection(); mine().forEach((light) => selCustom.add(light.id)); syncUI(); });
    line('Select').appendChild(seg);
    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    palette(swatches, LIGHTS[kind.id], (value) => {
      if (!state.custom) state.custom = {};
      const picked = mine().filter((light) => selCustom.has(light.id));
      for (const light of picked.length ? picked : mine()) { if (value) state.custom[light.id] = value; else delete state.custom[light.id]; }
      commit();
    });
    line('Color').appendChild(swatches);
    // the lights these controls act on: the selected ones of this kind, or all of them
    const chosen = () => { const picked = mine().filter((light) => selCustom.has(light.id)); return picked.length ? picked : mine(); };
    const slider = (label, key, min, max, unit, read, write) => {
      const row = line(label), slide = document.createElement('input'), value = document.createElement('span');
      slide.type = 'range'; slide.min = min; slide.max = max; slide.step = 1; slide.className = 'white-slide'; slide.dataset.slide = key;
      value.className = 'slide-value';
      row.appendChild(slide); row.appendChild(value);
      slide.read = () => { const first = chosen()[0]; if (first && document.activeElement !== slide) slide.value = read(first); value.textContent = Math.round(slide.value) + unit; };
      slide.addEventListener('input', () => { for (const light of chosen()) write(light, +slide.value); value.textContent = Math.round(slide.value) + unit; });    // the previews follow while it is dragged
      slide.addEventListener('change', () => { slide.blur(); commit(); });
      return row;
    };
    slider('Intensity', 'dim', 0, 100, '%',
      (light) => Math.round((state.dim && state.dim[light.id] != null ? state.dim[light.id] : 1) * 100),
      (light, v) => { if (!state.dim) state.dim = {}; if (v >= 100) delete state.dim[light.id]; else state.dim[light.id] = v / 100; });
    if (fixtureOf(kind) && fixtureOf(kind).moving) {
      const at = (light) => (state.point && state.point[light.id]) || { pan: light.pan, tilt: light.tilt };
      const set = (light, key, v) => { if (!state.point) state.point = {}; state.point[light.id] = Object.assign({}, at(light), { [key]: v }); };
      slider('Pan', 'pan', 0, 359, '°', (light) => Math.round(at(light).pan), (light, v) => set(light, 'pan', v));
      slider('Tilt', 'tilt', 0, 120, '°', (light) => Math.round(at(light).tilt), (light, v) => set(light, 'tilt', v));
      slider('Zoom', 'beam', 2, 60, '°', (light) => Math.round(at(light).beam || light.beam), (light, v) => set(light, 'beam', v));
      // Point At: the next tap on the plan is where these lights aim
      const row = line('Aim'), go = button(row, 'Point at a Spot on the Plan', 'btn', () => {
        if (document.body.classList.toggle('pointing')) {
          toast('Tap the plan where the light should point.', 2500);
          svg.addEventListener('pointerdown', pointAt, { capture: true, once: true });
        } else svg.removeEventListener('pointerdown', pointAt, { capture: true });
      });
      go.title = 'Then Tap Where the Selected Moving Heads Should Point';
      const pointAt = (e) => {
        e.stopImmediatePropagation(); e.preventDefault();
        document.body.classList.remove('pointing');
        const p = svgPoint(e);
        if (!state.point) state.point = {};
        for (const light of chosen()) {
          const dx = (p.x - light.x) / UNIT, dy = (p.y - light.y) / UNIT;
          state.point[light.id] = { beam: at(light).beam, pan: Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360), tilt: Math.round(Math.atan2(Math.hypot(dx, dy), Math.max(0.1, heightOf(light))) * 180 / Math.PI) };
        }
        commit();
      };
    }
    $('mods').appendChild(section);
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
  $('theme').addEventListener('click', () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; prefs.themeChosen = true; applyPrefs(); });
  $('watch').addEventListener('click', () => setWatch(!document.body.classList.contains('watch')));
  $('wide').innerHTML = svgIcon('expand');
  $('wide').addEventListener('click', () => setWide(!document.body.classList.contains('wide')));
  $('plan-reset').addEventListener('click', resetView);
  $('layout-add-led').addEventListener('click', () => layoutAdd('led'));
  $('layout-add-spot').addEventListener('click', () => layoutAdd('spot'));
  $('layout-add-side').addEventListener('click', () => layoutAdd('side'));
  $('layout-add-face').addEventListener('click', () => layoutAdd('face'));
  // The library: a tab for each group, and a button for each kind of object in it
  let libGroup = ASSET_GROUPS[0][0];
  const renderLibrary = () => {
    $('lib-tabs').textContent = ''; $('lib-list').textContent = '';
    for (const [id, name] of ASSET_GROUPS) button($('lib-tabs'), name, 'btn' + (id === libGroup ? ' active' : ''), () => { libGroup = id; renderLibrary(); });
    if (libGroup === 'light') for (const f of FIXTURES) {
      const b = button($('lib-list'), '', 'btn lib', () => {
        let kind = work.kinds.find((k) => k.fixture === f.type);            // every light of one fixture shares a kind, made the first time
        if (!kind) work.kinds.push(kind = { id: 'k' + newId(), name: f.name, shape: f.shape, fixture: f.type });
        layoutAdd('custom', kind.id);
      });
      b.innerHTML = `<b>${f.name}</b>${f.moving ? '<span>Moves</span>' : ''}`;
      b.title = `Add a ${f.name}`;
    }
    for (const a of ASSETS.filter((one) => one.group === libGroup)) {
      const b = button($('lib-list'), '', 'btn lib', () => layoutAdd('object', a.type));
      b.innerHTML = `<b>${a.name}</b><span>${a.note || (a.look === 'screen' ? `${a.w} m Wide, ${a.h} m Tall` : `${a.w} × ${a.d} m`)}</span>`;
      b.title = `Add ${a.name}${a.note ? ' ' + a.note : ''}`;
    }
  };
  renderLibrary();
  $('layout-redo').addEventListener('click', layoutRedo);
  $('media-pick').addEventListener('click', () => $('media-file').click());
  $('media-file').addEventListener('change', async () => {
    const file = $('media-file').files[0], item = pickedItem();
    $('media-file').value = '';
    if (!file || !item) return;
    if (!/^(image|video)\//.test(file.type)) return toast('Choose a picture or a video.', 2500);
    const id = 'm' + newId();
    await audioStore.put(mediaKey(id), file);
    layoutKeep();
    item.media = { id, name: file.name, type: file.type };
    redrawLayout();
    toast(`${file.name} will show on ${item.name} after you press Done.`, 3000);
  });
  $('media-clear').addEventListener('click', () => { const item = pickedItem(); if (!item) return; layoutKeep(); delete item.media; redrawLayout(); });
  for (const [id, name] of LAYERS) {
    const b = button($('layout-layers'), name, 'btn active', () => { hiddenLayers.has(id) ? hiddenLayers.delete(id) : hiddenLayers.add(id); redrawLayout(); });
    b.dataset.layer = id; b.title = `Show or Hide ${name} While Editing`;
  }
  $('layout-list').addEventListener('click', () => saveBlob(new Blob([fixtureList(work, currentProject())], { type: 'text/csv' }), `${currentProject().name} Fixture List.csv`));
  $('layout-patch').addEventListener('click', () => {
    layoutKeep();
    let next = 1, universe = 1;
    for (const light of [...work.customs].sort((a, b) => numberOf(a.id) - numberOf(b.id))) {
      const ch = channelsOf(light, work.kinds);
      if (next + ch - 1 > 512) { universe++; next = 1; }                 // a fixture never straddles two universes
      light.uni = universe; light.addr = next; next += ch;
    }
    toast(`Patched ${work.customs.length} light${work.customs.length === 1 ? '' : 's'} from address 1.`, 2500);
    redrawLayout();
  });
  $('layout-snap').addEventListener('click', () => { snapOn = !snapOn; redrawLayout(); });
  // Typed numbers. A value that cannot be used puts the old one back.
  const typed = (id, low, high, apply) => $(id).addEventListener('change', () => {
    const v = parseFloat($(id).value);
    if (Number.isFinite(v) && v >= low && v <= high) { layoutKeep(); apply(metres(v)); }
    else toast(`Use a number from ${low} to ${high}.`, 2500);
    $(id).blur();
    return work.stageDirty ? (delete work.stageDirty, applyStage()) : redrawLayout();
  });
  const sized = (key) => (v) => { work.stage = Object.assign(stageOf(work), { [key]: v }); work.stageDirty = true; };
  typed('stage-w', 2, 40, sized('w')); typed('stage-d', 2, 30, sized('d')); typed('stage-h', 0, 3, sized('h'));
  const placed = (set) => (v) => { const item = pickedItem(); if (item) set(item, v, work.picked.kind); };
  // an object that is moved or resized by typing takes the lights mounted on it along
  const carry = (set) => placed((item, v, kind) => {
    const was = { x: item.x, y: item.y, top: (item.z || 0) + (assetOf(item).up ? item.h : 0) };
    set(item, v, kind);
    if (kind !== 'object') return;
    const lift = (item.z || 0) + (assetOf(item).up ? item.h : 0) - was.top;
    for (const light of work.customs) if (light.on === item.id) { light.x += item.x - was.x; light.y += item.y - was.y; light.z = metres(Math.max(0, heightOf(light) + lift)); }
  });
  typed('pos-x', -40, 40, carry((item, v, kind) => Object.assign(item, hold(kind, STAGE.cx + v * UNIT, item.y))));
  typed('pos-y', -40, 40, carry((item, v, kind) => Object.assign(item, hold(kind, item.x, STAGE.cy + v * UNIT))));
  typed('obj-z', -3, 20, carry((item, v) => { item.z = v; }));
  typed('obj-w', 0.05, 40, placed((item, v) => { item.w = v; }));
  typed('obj-d', 0.05, 40, placed((item, v) => { item.d = v; }));
  typed('obj-h', 0.02, 20, carry((item, v) => { item.h = v; }));
  typed('fix-pan', -360, 360, placed((item, v) => { item.pan = (v % 360 + 360) % 360; }));
  typed('fix-tilt', 0, 180, placed((item, v) => { item.tilt = v; }));
  typed('fix-beam', 1, 120, placed((item, v) => { item.beam = v; }));
  typed('fix-uni', 1, 64, placed((item, v) => { item.uni = Math.round(v); }));
  typed('fix-addr', 1, 512, placed((item, v) => { item.addr = Math.round(v); }));
  typed('fix-ch', 1, 64, placed((item, v) => { item.ch = Math.round(v); }));
  typed('obj-rot', -360, 360, placed((item, v) => { const to = (v % 360 + 360) % 360; swing(item, to - (item.rot || 0)); item.rot = to; }));
  $('obj-name').addEventListener('change', () => {
    const item = pickedItem(), name = $('obj-name').value.trim();
    if (item && (name || work.picked.kind === 'custom')) { layoutKeep(); item.name = name; }
    $('obj-name').blur();
    redrawLayout();
  });
  $('layout-copy').addEventListener('click', layoutCopy);
  $('layout-paste').addEventListener('click', () => layoutPaste());
  $('layout-dup').addEventListener('click', layoutDuplicate);
  $('layout-undo').addEventListener('click', layoutUndo);
  each('[data-align]', (b) => b.addEventListener('click', () => layoutAlign(b.dataset.align)));
  each('[data-spread]', (b) => b.addEventListener('click', () => layoutSpread(b.dataset.spread)));
  $('layout-new-kind').addEventListener('click', () => {
    const id = 'k' + newId();
    work.kinds.push({ id, name: `Custom Light ${work.kinds.length + 1}`, shape: 'circle' });
    layoutAdd('custom', id);
  });
  $('layout-delete').addEventListener('click', layoutDelete);
  $('layout-number').addEventListener('change', layoutRenumber);
  $('layout-done').addEventListener('click', layoutDone);
  $('layout-cancel').addEventListener('click', leaveLayout);
  $('layout-template').addEventListener('click', () => {
    const template = copyLayout(findTemplate(currentProject() && currentProject().templateId).layout), had = new Set([...layout.leds, ...layout.spots].map((it) => it.id));
    const keep = (list) => list.map((it) => (had.has(it.id) ? Object.assign({ was: it.id }, it) : it));
    layoutKeep();
    Object.assign(work, { leds: keep(template.leds), spots: keep(template.spots), faces: facesOf(template), sides: sidesOf(template), customs: customsOf(template), kinds: kindsOf(template), objects: objectsOf(template), stage: template.stage || null, sel: [] });
    $('layout-kinds').dataset.shown = '';
    applyStage();
  });
  // Keep the layout being edited as a template for new projects.
  $('layout-save-tpl').addEventListener('click', () => {
    const field = $('layout-tpl-name'), name = field.value.trim();
    if (!name) { field.focus(); return toast('Give the layout a name first.', 2500); }
    templates.unshift({ id: 't' + newId(), name, layout: copyLayout(work), lights: currentProject().lights && clone(currentProject().lights), created: Date.now() });
    saveTemplates();
    field.value = '';
    toast(`Saved "${name}" to My layouts.`, 3000);
  });
  // Put this layout back into the template the project was made from (and publish it, if it is shared from here).
  const ownTemplate = () => templates.find((t) => currentProject() && t.id === currentProject().templateId && (!t.share || t.share.key));
  $('layout-update-tpl').addEventListener('click', async () => {
    const tpl = ownTemplate();
    if (!tpl) return;
    tpl.layout = copyLayout(work);
    if (currentProject().lights) tpl.lights = clone(currentProject().lights);
    saveTemplates();
    toast(`Updated the layout ${tpl.name}.`, 2500);
    await republish(tpl);
  });
  $('undo').addEventListener('click', () => stepHistory(history.undo, history.redo));
  $('redo').addEventListener('click', () => stepHistory(history.redo, history.undo));
  mqPhone.addEventListener('change', resetView);

  // Phone layout: one preview at a time, stage-wide controls in tabs.
  each('[data-view-pick]', (b) => b.addEventListener('click', () => { document.body.dataset.view = b.dataset.viewPick; syncUI(); }));
  each('[data-tab-pick]', (b) => b.addEventListener('click', () => { document.body.dataset.tab = b.dataset.tabPick; syncUI(); }));

  // "More" menu
  $('more').addEventListener('click', (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; keepOnScreen($('menu')); });
  $('menu').addEventListener('click', (e) => { if (!e.target.closest('label, input, .menu-icons')) $('menu').hidden = true; e.stopPropagation(); });
  $('menu').addEventListener('change', (e) => { if (e.target.type === 'file') $('menu').hidden = true; });
  document.addEventListener('click', () => { $('menu').hidden = true; });

  // Hide or show the side panels (desktop)
  each('[data-icon]', (el) => el.insertAdjacentHTML('afterbegin', svgIcon(el.dataset.icon)));
  $('toggle-left').addEventListener('click', () => { prefs.hideLeft = !prefs.hideLeft; applyPrefs(); });
  $('toggle-right').addEventListener('click', () => { prefs.hideRight = !prefs.hideRight; applyPrefs(); });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (layoutMode && e.key !== 'Escape') { if (!typing) layoutKey(e); return; }       // the layout editor has its own shortcuts
    if (e.key === 'Escape') {
      if (!$('menu').hidden) $('menu').hidden = true;
      else if (layoutMode) { work.sel = []; redrawLayout(); }
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
// Layout editor: move, add and delete LEDs, spotlights, face lights and side lights
// (LEDs and spotlights can be renumbered too).
// Changes are made on a working copy; Done saves it to the project and reloads, so
// every view is rebuilt from the new layout. Cancel reloads without saving.
// ---------------------------------------------------------------------------
let layoutMode = false, work = null, moving = null;
const numberOf = (id) => +String(id).replace(/^[A-Z]/, '');
const KIND_NAMES = { led: 'LED', spot: 'Spotlight', side: 'Side Light', face: 'Face Light', custom: 'Custom Light', object: 'Object' };
// What is selected in the layout editor: `work.sel`, a list of { kind, id }. `work.picked`
// is the one selected light when exactly one is, for the settings that only make sense then.
const KINDS_OF_LIGHT = ['led', 'spot', 'side', 'face', 'custom', 'object'];       // everything that can be selected, stage objects too
const itemOf = (one) => work[one.kind + 's'].find((it) => it.id === one.id);
const pickedItem = () => work.picked && itemOf(work.picked);
const selected = () => work.sel.map((one) => ({ kind: one.kind, item: itemOf(one) })).filter((one) => one.item);
const isSelected = (kind, id) => work.sel.some((one) => one.kind === kind && one.id === id);
const ROOM = 1500;                       // objects can stand up to about 15 m off the stage
const boundsOf = (kind) => (kind === 'object' || kind === 'custom' ? { x0: STAGE.x0 - ROOM, x1: STAGE.x1 + ROOM, y0: STAGE.y0 - ROOM, y1: STAGE.y1 + ROOM } : kind === 'side' || kind === 'face' ? PLAN_BOUNDS : BOUNDS);
const hold = (kind, x, y) => { const b = boundsOf(kind); return { x: Math.max(b.x0, Math.min(b.x1, x)), y: Math.max(b.y0, Math.min(b.y1, y)) }; };
// Undo and redo inside the editor: the layout as it was before each change, and after each undo.
const layoutPast = [], layoutNext = [];
const layoutNow = () => JSON.stringify({ leds: work.leds, spots: work.spots, faces: work.faces, sides: work.sides, customs: work.customs, kinds: work.kinds, objects: work.objects, stage: work.stage });
function layoutKeep() { layoutPast.push(layoutNow()); if (layoutPast.length > 80) layoutPast.shift(); layoutNext.length = 0; }
function layoutStep(from, to, none) {
  if (!from.length) return toast(none, 1500);
  to.push(layoutNow());
  const sized = JSON.stringify(work.stage);
  Object.assign(work, JSON.parse(from.pop()));
  work.sel = work.sel.filter((one) => itemOf(one));
  $('layout-kinds').dataset.shown = '';
  if (JSON.stringify(work.stage) !== sized) applyStage(); else redrawLayout();
}
const layoutUndo = () => layoutStep(layoutPast, layoutNext, 'Nothing to undo.');
const layoutRedo = () => layoutStep(layoutNext, layoutPast, 'Nothing to redo.');
// The stage changed size: move everything drawn around it, and show the whole drawing again.
function applyStage() {
  setStage(work.stage);
  growDrawing(work.objects);
  drawStage();
  resetView();
  redrawLayout();
}
// Layers in the editor: a group that is hidden is not drawn and cannot be selected or moved
// by accident. Nothing about the layout itself changes.
const LAYERS = [['light', 'Lights'], ['stage', 'Stage'], ['screen', 'Screens']];
const hiddenLayers = new Set();
const layerOf = (kind, item) => (kind !== 'object' ? 'light' : assetOf(item).group === 'screen' ? 'screen' : 'stage');
const seen = (kind) => work[kind + 's'].filter((item) => !hiddenLayers.has(layerOf(kind, item)));
// With snapping on, lights and objects land on a 5 cm grid and turn in steps of 15 degrees.
let snapOn = true;
const snapTo = (v) => (snapOn ? Math.round(v / 5) * 5 : Math.round(v));
// Numbers in the panel are metres from the centre of the stage, to the centimetre.
const metres = (v) => Math.round(v * 100) / 100;

function enterLayout() {
  layoutMode = true;
  clearSelection(); aiming = false;
  // `was` remembers each fixture's id when editing began, so cues can follow a renumbering
  const editable = (list) => list.map((it) => Object.assign({ was: it.id }, it));
  work = { leds: editable(layout.leds), spots: editable(layout.spots), faces: editable(facesOf(layout)), sides: editable(sidesOf(layout)), customs: editable(customsOf(layout)), kinds: kindsOf(layout).map((k) => Object.assign({}, k)),
    objects: objectsOf(layout).map((o) => Object.assign({}, o)), stage: layout.stage ? Object.assign({}, layout.stage) : null, sel: [] };
  Object.defineProperty(work, 'picked', {
    get() { return this.sel.length === 1 ? this.sel[0] : null; },
    set(one) { this.sel = one ? [one] : []; },
  });
  work.classic = work.leds.length + work.spots.length + work.faces.length + work.sides.length > 0;      // decided once, so the buttons do not vanish mid-edit
  layoutPast.length = layoutNext.length = 0;
  document.body.classList.add('layout-mode');
  document.body.classList.toggle('tpl-edit', !!(currentProject() && currentProject().scratch));     // a layout edited by itself
  const own = templates.find((t) => currentProject() && t.id === currentProject().templateId && (!t.share || t.share.key));
  $('layout-update-tpl').hidden = !own;
  if (own) $('layout-update-tpl').textContent = `Update “${own.name}”` + (own.share ? ' and publish' : '');
  $('deselect').hidden = true;
  redrawLayout();
}
function redrawLayout() {
  work.sel = work.sel.filter((one) => { const item = itemOf(one); return item && !hiddenLayers.has(layerOf(one.kind, item)); });
  drawFixtures(seen('led'), seen('spot'), work.sel, seen('side'), seen('face'), seen('custom'), work.kinds, seen('object'));
  each('#layout-layers .btn', (b) => b.classList.toggle('active', !hiddenLayers.has(b.dataset.layer)));
  renderKinds();
  const item = pickedItem(), many = work.sel.length;
  $('layout-picked').hidden = !many;
  $('layout-none').hidden = !!many;
  $('layout-single').hidden = !item;
  $('layout-align').hidden = many < 2;
  each('[data-spread]', (b) => { b.disabled = many < 3; });
  $('layout-paste').disabled = !layoutClip();
  if (many > 1) $('layout-kind').textContent = `${many} Selected`;
  if (item) {
    const numbered = work.picked.kind === 'led' || work.picked.kind === 'spot';       // only these carry a number people use
    const ofKind = work.picked.kind === 'custom' && work.kinds.find((k) => k.id === item.kind);
    const object = work.picked.kind === 'object';
    $('layout-kind').textContent = object ? item.name || 'Object' : ofKind ? ofKind.name : KIND_NAMES[work.picked.kind];
    // where it is, and for an object its name, size and turn; a field being typed in is left alone
    const fill = (id, value) => { if (document.activeElement !== $(id)) $(id).value = value; };
    fill('pos-x', metres((item.x - STAGE.cx) / UNIT)); fill('pos-y', metres((item.y - STAGE.cy) / UNIT));
    const fx = fixtureOf(ofKind), lit = work.picked.kind === 'custom';
    each('#layout-picked .obj-only', (n) => { n.hidden = !object; });
    each('#layout-picked .lit-only', (n) => { n.hidden = !lit; });
    each('#layout-picked .high-only', (n) => { n.hidden = !object && !lit; });
    if (lit) {
      fill('obj-name', item.name || ''); fill('obj-z', metres(heightOf(item)));
      fill('fix-pan', item.pan || 0); fill('fix-tilt', item.tilt || 0); fill('fix-beam', item.beam || (fx ? fx.beam : 30));
      fill('fix-uni', item.uni || ''); fill('fix-addr', item.addr || ''); fill('fix-ch', channelsOf(item, work.kinds));
      const on = item.on && work.objects.find((o) => o.id === item.on);
      const rig = fx && work.objects.some((o) => assetOf(o).joins);          // only layouts that still have truss or stands can mount
      $('fix-mount').textContent = on ? `Mounted on ${on.name}. Drag it off to free it.` : rig ? 'Drag it onto truss, a bar or a stand to mount it.' : '';
      $('fix-mount').hidden = !on && !rig;
    }
    $('obj-media').hidden = !object || assetOf(item).look !== 'screen';
    if (object) $('media-name').textContent = item.media ? item.media.name : 'Nothing Showing';
    $('media-clear').hidden = !object || !item.media;
    if (object) { fill('obj-name', item.name); for (const key of ['z', 'w', 'd', 'h', 'rot']) fill('obj-' + key, metres(item[key] || 0)); }
    $('layout-number').parentNode.hidden = !numbered;
    if (numbered && document.activeElement !== $('layout-number')) $('layout-number').value = numberOf(item.id);
  }
  // only what the layout has is counted; the buttons for the four classic kinds show when it uses any of them
  const counts = [[work.leds, 'LED'], [work.spots, 'spot'], [work.faces, 'face'], [work.sides, 'side'], [work.customs, 'light'], [work.objects, 'object']].filter(([list]) => list.length).map(([list, name]) => `${list.length} ${name}${name === 'LED' || list.length === 1 ? '' : 's'}`);
  $('layout-count').textContent = counts.join(' · ') || 'Empty';
  $('layout-classic').hidden = !work.classic;
  const stage = stageOf(work);
  for (const key of ['w', 'd', 'h']) if (document.activeElement !== $('stage-' + key)) $('stage-' + key).value = stage[key];
  $('layout-snap').classList.toggle('active', snapOn);
  $('layout-undo').disabled = !layoutPast.length; $('layout-redo').disabled = !layoutNext.length;
}
let boxing = null;                     // a selection box being dragged out over empty plan
let turning = null;                    // an object being turned by its handle
function layoutPress(e) {
  const g = e.target.closest('.fx[data-kind]'), add = e.shiftKey || e.metaKey || e.ctrlKey;
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  const handle = e.target.closest('[data-rot]');
  if (handle) { const lit = handle.dataset.of === 'custom'; turning = { item: work[lit ? 'customs' : 'objects'].find((o) => o.id === handle.dataset.rot), key: lit ? 'pan' : 'rot', kept: false }; moving = null; return; }
  if (!g) {                            // empty plan: drag out a box; what it touches is selected
    if (!add) work.sel = [];
    boxing = { start: svgPoint(e), had: [...work.sel], rect: null };
    moving = null;
    return redrawLayout();
  }
  const one = { kind: g.dataset.kind, id: g.dataset.id };
  if (add) {                           // Shift or Cmd: add it to the selection, or take it out
    work.sel = isSelected(one.kind, one.id) ? work.sel.filter((s) => !(s.kind === one.kind && s.id === one.id)) : [...work.sel, one];
    moving = null;
    return redrawLayout();
  }
  if (!isSelected(one.kind, one.id)) work.sel = [one];        // pressing one of a selected group keeps the group
  moving = { start: svgPoint(e), kept: false, items: selected().map(({ kind, item }) => ({ kind, item, x: item.x, y: item.y })) };
  // lights mounted on a piece that is moving ride along with it
  const carried = new Set(moving.items.filter((m) => m.kind === 'object').map((m) => m.item.id));
  for (const light of work.customs) if (carried.has(light.on) && !moving.items.some((m) => m.item === light)) moving.items.push({ kind: 'custom', item: light, x: light.x, y: light.y, rider: true });
  redrawLayout();
}
function layoutDrag(e) {
  const p = svgPoint(e), snap = snapTo;
  if (turning && turning.item) {         // the handle points the way the object's back edge faces
    const to = Math.atan2(p.x - turning.item.x, turning.item.y - p.y) * 180 / Math.PI, step = snapOn ? 15 : 1;
    const rot = ((Math.round(to / step) * step) % 360 + 360) % 360;
    if (rot === (turning.item[turning.key] || 0)) return;
    if (!turning.kept) { turning.kept = true; layoutKeep(); }
    if (turning.key === 'rot') swing(turning.item, rot - (turning.item.rot || 0));
    turning.item[turning.key] = rot;
    return redrawLayout();
  }
  if (boxing) {
    const from = boxing.start, r = { x: Math.min(p.x, from.x), y: Math.min(p.y, from.y), w: Math.abs(p.x - from.x), h: Math.abs(p.y - from.y) };
    const inside = (it) => it.x >= r.x && it.x <= r.x + r.w && it.y >= r.y && it.y <= r.y + r.h;
    work.sel = [...boxing.had];
    for (const kind of KINDS_OF_LIGHT) for (const it of seen(kind)) if (inside(it) && !isSelected(kind, it.id)) work.sel.push({ kind, id: it.id });
    redrawLayout();                                            // (this redraws the fixtures; the box is drawn after)
    boxing.rect = el('rect', { class: 'box', x: r.x, y: r.y, width: r.w, height: r.h }, null, planEls.fixtureLayer);
    return;
  }
  if (!moving) return;
  const dx = snap(p.x - moving.start.x), dy = snap(p.y - moving.start.y);
  if (!dx && !dy) return;
  if (!moving.kept) { moving.kept = true; const now = moving.items.map((m) => [m.item, m.item.x, m.item.y]); for (const m of moving.items) { m.item.x = m.x; m.item.y = m.y; } layoutKeep(); for (const [it, x, y] of now) { it.x = x; it.y = y; } }
  for (const m of moving.items) Object.assign(m.item, hold(m.kind, m.x + dx, m.y + dy));      // the whole group moves together
  const alone = moving.items.filter((m) => !m.rider);
  if (snapOn && alone.length === 1 && alone[0].kind === 'object') {
    const it = alone[0].item, was = { x: it.x, y: it.y, z: it.z || 0 };
    joinUp(it);
    for (const m of moving.items) if (m.rider) { m.item.x += it.x - was.x; m.item.y += it.y - was.y; if (m.item.z != null) m.item.z = metres(m.item.z + (it.z || 0) - was.z); }
  }
  if (alone.length === 1 && alone[0].kind === 'custom') mountUp(alone[0].item);
  redrawLayout();
}
// A piece that turns takes the lights mounted on it round with it.
function swing(piece, by) {
  const a = by * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  for (const light of work.customs) if (light.on === piece.id) {
    const dx = light.x - piece.x, dy = light.y - piece.y;
    light.x = Math.round(piece.x + dx * cos - dy * sin); light.y = Math.round(piece.y + dx * sin + dy * cos);
    light.pan = (((light.pan || 0) + by) % 360 + 360) % 360;
  }
}
// A library light dragged over truss, a bar or a stand is mounted on it: it hangs just under a
// horizontal piece, or sits on top of an upright one, and from then on moves when the piece
// does. Dragged off again, it is free. With snapping on it also lines up along the piece.
function mountUp(light) {
  if (!fixtureOf(work.kinds.find((k) => k.id === light.kind))) return;
  const under = work.objects.find((o) => {
    if (!assetOf(o).joins) return false;
    const a = -(o.rot || 0) * Math.PI / 180, dx = light.x - o.x, dy = light.y - o.y;
    const along = dx * Math.cos(a) - dy * Math.sin(a), across = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(along) <= o.w * UNIT / 2 + 12 && Math.abs(across) <= Math.max(o.d * UNIT / 2, 14) + 12;
  });
  if (!under) { if (light.on) delete light.on; return; }
  const up = assetOf(under).up;
  light.on = under.id;
  light.z = metres(up ? (under.z || 0) + under.h : Math.max(0, (under.z || 0) - 0.1));
  if (!snapOn) return;
  if (up) { light.x = under.x; light.y = under.y; return; }
  const a = (under.rot || 0) * Math.PI / 180, along = (light.x - under.x) * Math.cos(a) + (light.y - under.y) * Math.sin(a);      // slide onto its centre line
  light.x = under.x + along * Math.cos(a); light.y = under.y + along * Math.sin(a);
}
// A piece of truss dragged close to another clicks onto its nearest connecting point, and
// takes its height: level with a horizontal piece, or on top of a tower or stand.
function joinUp(item) {
  let best = null;
  for (const mine of joinsOf(item)) for (const other of work.objects) {
    if (other === item) continue;
    for (const at of joinsOf(other)) {
      const far = Math.hypot(at.x - mine.x, at.y - mine.y);
      if (far < 36 && (!best || far < best.far)) best = { far, dx: at.x - mine.x, dy: at.y - mine.y, other };
    }
  }
  if (!best) return;
  item.x += best.dx; item.y += best.dy;
  if (assetOf(item).up) return;
  item.z = metres(assetOf(best.other).up ? (best.other.z || 0) + best.other.h - item.h : best.other.z || 0);
}
function layoutRelease() {
  if ((moving || turning) && growDrawing(work.objects)) resetView();
  moving = turning = null;
  if (boxing) { boxing = null; redrawLayout(); }
}
// What was copied, kept for this browser tab so it can be pasted into another layout too.
function layoutClip() {
  try { return JSON.parse(sessionStorage.getItem('slp-clip') || 'null'); } catch (e) { return null; }
}
const clipOf = () => selected().map(({ kind, item }) => {
  const one = { kind, x: item.x, y: item.y, of: item.kind };
  if (kind === 'object') one.more = { type: item.type, name: item.name, z: item.z, rot: item.rot, w: item.w, d: item.d, h: item.h, media: item.media };
  if (kind === 'custom') { one.more = {}; for (const key of ['name', 'z', 'pan', 'tilt', 'beam', 'ch']) if (item[key] != null) one.more[key] = item[key]; }
  return one;
});
function layoutCopy() {
  const lights = clipOf();
  if (!lights.length) return;
  const kinds = work.kinds.filter((k) => lights.some((light) => light.of === k.id));
  try { sessionStorage.setItem('slp-clip', JSON.stringify({ lights, kinds })); } catch (e) { /* no session storage */ }
  toast(`Copied ${lights.length} light${lights.length === 1 ? '' : 's'}.`, 1500);
  redrawLayout();
}
// Paste what was copied, a little to the side of where it came from, and select the copies.
function layoutPaste(clip = layoutClip()) {
  if (!clip || !clip.lights.length) return;
  layoutKeep();
  for (const kind of clip.kinds || []) if (!work.kinds.some((k) => k.id === kind.id)) work.kinds.push(Object.assign({}, kind));
  work.sel = [];
  for (const light of clip.lights) {
    const list = work[light.kind + 's'], n = Math.max(0, ...list.map((it) => numberOf(it.id))) + 1;
    const id = { led: 'F', spot: '', side: 'S', face: 'A', custom: 'C', object: 'O' }[light.kind] + n;
    const item = Object.assign({ id }, light.more, hold(light.kind, light.x + 30, light.y + 30));
    if (light.kind === 'custom') item.kind = light.of;
    list.push(item);
    work.sel.push({ kind: light.kind, id });
  }
  $('layout-kinds').dataset.shown = '';
  redrawLayout();
}
function layoutDuplicate() {
  const lights = clipOf();
  if (lights.length) layoutPaste({ lights, kinds: [] });
}
// Line the selected lights up on one edge or through the middle, or space them evenly.
function layoutAlign(how) {
  const all = selected();
  if (all.length < 2) return;
  layoutKeep();
  const xs = all.map((one) => one.item.x), ys = all.map((one) => one.item.y);
  const to = { left: Math.min(...xs), right: Math.max(...xs), centre: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.min(...ys), bottom: Math.max(...ys), middle: (Math.min(...ys) + Math.max(...ys)) / 2 }[how];
  const across = how === 'left' || how === 'right' || how === 'centre';
  for (const { kind, item } of all) Object.assign(item, hold(kind, across ? Math.round(to) : item.x, across ? item.y : Math.round(to)));
  redrawLayout();
}
function layoutSpread(axis) {
  const all = selected().sort((a, b) => a.item[axis] - b.item[axis]);
  if (all.length < 3) return;
  layoutKeep();
  const from = all[0].item[axis], step = (all[all.length - 1].item[axis] - from) / (all.length - 1);
  all.forEach(({ kind, item }, i) => { const at = Math.round(from + step * i); Object.assign(item, hold(kind, axis === 'x' ? at : item.x, axis === 'y' ? at : item.y)); });
  redrawLayout();
}
function layoutNudge(dx, dy) {
  const all = selected();
  if (!all.length) return;
  layoutKeep();
  for (const { kind, item } of all) Object.assign(item, hold(kind, item.x + dx, item.y + dy));
  redrawLayout();
}
// Keyboard in the layout editor
function layoutKey(e) {
  const cmd = e.metaKey || e.ctrlKey, key = e.key.toLowerCase(), step = e.shiftKey ? 25 : 5;
  const arrows = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
  if (arrows[key]) layoutNudge(...arrows[key]);
  else if (key === 'delete' || key === 'backspace') layoutDelete();
  else if (cmd && key === 'c') layoutCopy();
  else if (cmd && key === 'v') layoutPaste();
  else if (cmd && key === 'd') layoutDuplicate();
  else if (cmd && key === 'z') (e.shiftKey ? layoutRedo : layoutUndo)();
  else if (cmd && key === 'y') layoutRedo();
  else if (cmd && key === 'a') { work.sel = KINDS_OF_LIGHT.flatMap((kind) => seen(kind).map((it) => ({ kind, id: it.id }))); redrawLayout(); }
  else return;
  e.preventDefault();
}
function layoutAdd(kind, ofKind) {
  layoutKeep();
  const list = work[kind + 's'], n = Math.max(0, ...list.map((it) => numberOf(it.id))) + 1;
  const id = { led: 'F', spot: '', side: 'S', face: 'A', custom: 'C', object: 'O' }[kind] + n;
  // drop it somewhere sensible for its kind, nudged along so new ones do not stack up
  const spare = list.filter((it) => !it.was).length, nudge = (spare % 5) * 30;
  if (kind === 'object') {
    const a = ASSETS.find((one) => one.type === ofKind), stage = stageOf(work), item = { id, type: a.type, name: a.name + (a.note ? ' ' + a.note : ''), x: STAGE.cx + nudge, y: STAGE.cy + nudge, z: a.z, rot: 0, w: a.w, d: a.d, h: a.h };
    // pieces that belong beside the stage start there, sized to it
    if (a.type === 'wing') Object.assign(item, { d: stage.d, h: Math.max(0.02, stage.h), z: -stage.h, x: STAGE.x0 - a.w * UNIT / 2 - nudge, y: STAGE.cy });
    else if (a.type === 'backstage') Object.assign(item, { w: stage.w, h: Math.max(0.02, stage.h), z: -stage.h, x: STAGE.cx, y: STAGE.y0 - a.d * UNIT / 2 - nudge });
    else if (a.beside === 'back') Object.assign(item, { x: STAGE.cx, y: STAGE.y0 - 40 - nudge, z: a.type === 'wall' ? -stage.h : a.z });
    else if (a.type === 'stairs') Object.assign(item, { x: STAGE.cx + nudge * 3, y: STAGE.y1 + a.d * UNIT / 2, z: -stage.h, h: Math.max(0.02, stage.h) });
    else if (a.beside === 'front') Object.assign(item, { x: STAGE.cx, y: STAGE.y1 + 320 + a.d * UNIT / 2 + nudge, z: -stage.h });
    list.push(item);
    growDrawing(work.objects) && resetView();
  }
  else if (kind === 'side') list.push({ id, x: sx(SIDE_X.L), y: STAGE.cy - 60 + nudge });               // in the left wing; drag across for the right
  else if (kind === 'face') list.push({ id, x: STAGE.cx - 60 + nudge, y: sy(FACE_Y) });
  else if (kind === 'custom') {
    const f = fixtureOf(work.kinds.find((k) => k.id === ofKind)), item = { id, kind: ofKind, x: STAGE.cx - 60 + nudge, y: STAGE.cy };
    if (f) Object.assign(item, { z: f.z, pan: f.pan, tilt: f.tilt, beam: f.beam }, f.off === 'front' ? { y: STAGE.y1 + 200 } : f.off === 'back' ? { y: STAGE.y0 + 60 } : {});
    list.push(item);
  }
  else list.push({ id, x: STAGE.cx - 60 + nudge, y: STAGE.cy + (kind === 'led' ? -40 : 40) });
  work.picked = { kind, id };
  redrawLayout();
}
function layoutDelete() {
  if (!work.sel.length) return;
  layoutKeep();
  for (const one of work.sel) work[one.kind + 's'] = work[one.kind + 's'].filter((it) => it.id !== one.id);
  for (const light of work.customs) if (light.on && !work.objects.some((o) => o.id === light.on)) delete light.on;       // what it hung on is gone
  work.sel = [];
  redrawLayout();
}
function layoutRenumber() {
  const item = pickedItem(), n = Math.floor(+$('layout-number').value);
  if (!item || !(n >= 1) || (work.picked.kind !== 'led' && work.picked.kind !== 'spot')) return redrawLayout();
  const id = work.picked.kind === 'led' ? 'F' + n : String(n);
  if (id !== item.id && work[work.picked.kind + 's'].some((it) => it.id === id)) {
    toast(`${id} is already used in this layout`, 3000);
    $('layout-number').value = numberOf(item.id);
    return;
  }
  layoutKeep();
  item.id = id; work.picked.id = id;
  redrawLayout();
}
// The layout editor's list of custom kinds: name, shape, add one to the stage, remove the kind.
function renderKinds() {
  const box = $('layout-kinds');
  if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;      // a name is being typed
  const now = JSON.stringify(work.kinds);
  if (box.dataset.shown === now) return;          // nothing about the kinds changed (a light was only dragged)
  box.dataset.shown = now;
  box.textContent = '';
  $('layout-kinds-none').hidden = work.kinds.length > 0;
  for (const kind of work.kinds) {
    const row = document.createElement('div');
    row.className = 'line kind-row';
    const name = document.createElement('input');
    name.type = 'text'; name.value = kind.name; name.maxLength = 30; name.placeholder = 'Name';
    name.addEventListener('input', () => { kind.name = name.value; });
    name.addEventListener('blur', () => { kind.name = name.value.trim() || 'Custom Light'; redrawLayout(); });
    const shape = document.createElement('select');
    for (const [id, text] of SHAPES) shape.add(new Option(text, id, false, id === kind.shape));
    shape.addEventListener('change', () => { layoutKeep(); kind.shape = shape.value; redrawLayout(); });
    row.appendChild(name);
    if (!kind.fixture) row.appendChild(shape);
    const add = button(row, '', 'btn icon', () => layoutAdd('custom', kind.id));
    add.innerHTML = svgIcon('plus'); add.title = 'Add One to the Stage';
    const drop = button(row, '', 'btn icon', () => {
      layoutKeep();
      work.kinds = work.kinds.filter((k) => k !== kind);
      work.customs = work.customs.filter((light) => light.kind !== kind.id);
      work.sel = [];
      redrawLayout();
    });
    drop.innerHTML = svgIcon('trash'); drop.title = 'Remove This Kind and Its Lights';
    box.appendChild(row);
  }
  $('layout-kinds-none').hidden = work.kinds.length > 0;
}
// Carry a look over to the edited layout: deleted fixtures drop out, renumbered ones follow.
// `resides` does the same for the side lights, which a look lists by position rather than by name.
function relook(look, renamed, alive, resides) {
  const move = (map) => {
    const out = {};
    for (const id in map || {}) { const now = id in renamed ? renamed[id] : id; if (alive.has(now)) out[now] = map[id]; }
    return out;
  };
  look.leds = move(look.leds); look.aim = move(look.aim); look.spots = move(look.spots); look.custom = move(look.custom);
  look.dim = move(look.dim); look.point = move(look.point);
  if (resides) resides(look);
  return look;
}
function layoutDone() {
  const renamed = {}, alive = new Set();
  const before = new Set([...layout.leds, ...layout.spots, ...customsOf(layout)].map((it) => it.id));
  for (const it of [...work.leds, ...work.spots, ...work.customs]) { alive.add(it.id); if (it.was) renamed[it.was] = it.id; }
  for (const id of before) if (!(id in renamed)) renamed[id] = '';        // deleted: maps to nothing
  // Side lights: which ones were on is remembered by light, then laid out in their new order.
  const was = { L: SIDE_LIGHTS.L.map((light) => light.id), R: SIDE_LIGHTS.R.map((light) => light.id) }, now = bySide(work.sides);
  const resides = (look) => {
    const on = new Set();
    for (const side of SIDES) was[side].forEach((id, i) => { if (look.sidePos && look.sidePos[side] && look.sidePos[side][i]) on.add(id); });
    look.sidePos = { L: now.L.map((light) => on.has(light.was)), R: now.R.map((light) => on.has(light.was)) };
  };
  layout = copyLayout(work);
  layoutMode = false;                       // let the saves below go through normally
  relook(state, renamed, alive, resides);
  show.cues.forEach((cue) => relook(cue.look, renamed, alive, resides));
  store.set(LAYOUT_KEY, layout);
  store.set(LOOK_KEY, state);
  saveShow();
  // the layout belongs to the whole project: the other items' lights and cues follow the same changes
  for (const item of currentProject().items) {
    if (item.id === currentItemId) continue;
    const look = raw.get(projectKey(LOOK_KEY, item.id), null), part = raw.get(projectKey(SHOW_KEY, item.id), null);
    if (look) raw.set(projectKey(LOOK_KEY, item.id), relook(look, renamed, alive, resides));
    if (part && Array.isArray(part.cues)) { part.cues.forEach((cue) => relook(cue.look, renamed, alive, resides)); raw.set(projectKey(SHOW_KEY, item.id), part); }
  }
  leaveLayout(true);
}
// Opened from the project page, the layout editor goes back there; otherwise the item reloads.
async function leaveLayout(saved) {
  let from = '';
  try { from = sessionStorage.getItem('slp-layout') || ''; sessionStorage.removeItem('slp-layout'); } catch (e) { /* no session storage */ }
  if (from.startsWith('tpl:')) {
    // a layout was being edited by itself: hand the result to it, clear the throwaway project, go back to Layouts
    const tpl = templates.find((t) => t.id === from.slice(4)), scratch = currentProject();
    if (saved === true && tpl) {
      tpl.layout = copyLayout(layout);
      saveTemplates();
      await republish(tpl);
    }
    scratch.items.forEach(dropItem);
    raw.del(projectKey(LAYOUT_KEY, scratch.id));
    projects = projects.filter((p) => p !== scratch);
    saveProjects();
    try { sessionStorage.setItem('slp-show-layouts', '1'); } catch (e) { /* no session storage */ }
    return setOpen(null, null);
  }
  if (from) setOpen(currentId, null); else location.reload();
}
// Edit a layout by itself, from the Layouts window: it opens in the layout editor.
function editTemplateLayout(tpl) {
  const id = 'layout-edit', itemId = 'layout-edit-item', now = Date.now();
  raw.set(projectKey(LAYOUT_KEY, id), copyLayout(tpl.layout));
  raw.set(projectKey(LOOK_KEY, itemId), blankLook());
  raw.set(projectKey(SHOW_KEY, itemId), { cues: [], trackName: '' });
  const scratch = { id, scratch: true, name: tpl.name, template: tpl.name, templateId: tpl.id, created: now, updated: now, cues: 0, items: [{ id: itemId, name: 'Layout', cues: 0, updated: now }] };
  if (tpl.lights) scratch.lights = clone(tpl.lights);
  projects = projects.filter((p) => !p.scratch);
  projects.push(scratch);
  saveProjects();
  try { sessionStorage.setItem('slp-layout', 'tpl:' + tpl.id); } catch (e) { /* no session storage */ }
  setOpen(id, itemId);
}

// Play Show: every item of a project in running order, each with its track and cues, in
// watch mode. The run is remembered while the pages change from item to item (`slp-show`).
let showRun = false, showStarted = false;
try { showRun = !!sessionStorage.getItem('slp-show') && !!currentItemId && !currentProject().draft; } catch (e) { /* no session storage */ }
// `auto`: the show moved on by itself (the item before finished), so the gap between items applies.
function showLeave(itemId, auto) {        // on to another item of the run, or (with none) back to the project
  try { if (itemId) sessionStorage.setItem('slp-show', auto ? 'auto' : '1'); else sessionStorage.removeItem('slp-show'); } catch (e) { /* no session storage */ }
  setOpen(currentId, itemId || null);
}
function showNext(auto) {
  const items = currentProject().items, at = items.findIndex((it) => it.id === currentItemId);
  showStarted = false;
  showLeave(at + 1 < items.length ? items[at + 1].id : null, auto === true);
}
let showWait = 0;                         // timer of the countdown before an item
function showStart() {
  clearInterval(showWait);
  $('show-tap').hidden = true;
  setPlaying(true);
  showStarted = true;
  // a browser that will not start sound by itself (iPhone does this) gets a button to tap
  setTimeout(() => { if (showRun && !player.playing && currentTime() < 0.2) { showStarted = false; $('show-tap').textContent = 'Tap to Play'; $('show-tap').hidden = false; } }, 700);
}
// An item of the show is ready. Show settings decide what happens next: it waits for Play,
// or counts down the gap after the item before, or simply starts.
function showBegin() {
  const item = currentItem(), own = item.show || {}, tap = $('show-tap');
  let auto = false;
  try { auto = sessionStorage.getItem('slp-show') === 'auto'; } catch (e) { /* no session storage */ }
  const gap = auto ? (own.gap != null ? own.gap : currentProject().showGap || 0) : 0;
  seek(0);
  if (own.manual) { tap.textContent = `Play ${item.name}`; tap.hidden = false; return; }
  if (!(gap > 0)) return showStart();
  const until = performance.now() + gap * 1000;
  const tick = () => {
    const left = (until - performance.now()) / 1000;
    if (left <= 0) return showStart();
    tap.textContent = `Starts in ${Math.ceil(left)} s · Tap to Start Now`;
  };
  tap.hidden = false;
  tick();
  showWait = setInterval(tick, 200);
}
// Show settings for a project: the usual gap between items, and for each item its own gap
// or that it waits for Play.
function editShowSettings(project) {
  const body = $('showset-body');
  body.textContent = '';
  const number = (value, placeholder) => {
    const field = document.createElement('input');
    field.type = 'number'; field.min = 0; field.max = 600; field.step = 0.5; field.inputMode = 'decimal';
    field.value = value == null ? '' : value; field.placeholder = placeholder;
    return field;
  };
  const top = document.createElement('div');
  top.className = 'line';
  const label = document.createElement('span');
  label.className = 'lbl mini-lbl'; label.textContent = 'Gap Between Items (Seconds)';
  const usual = number(project.showGap || 0, '0');
  top.appendChild(label); top.appendChild(usual); body.appendChild(top);
  const note = document.createElement('p');
  note.className = 'hint mini-note';
  note.textContent = 'Each item can have its own gap before it starts (leave empty for the usual one), or wait until you press Play.';
  body.appendChild(note);
  const rows = project.items.map((item, i) => {
    const own = item.show || {}, row = document.createElement('div');
    row.className = 'line showset-row';
    const name = document.createElement('span');
    name.className = 'showset-name'; name.textContent = `${i + 1}. ${item.name}`;
    const gap = number(own.gap, 'Usual');
    gap.title = 'Gap Before This Item (Seconds)';
    const wait = button(row, '', 'btn', () => { wait.classList.toggle('active'); sync(); });
    const sync = () => { wait.textContent = wait.classList.contains('active') ? 'Waits for Play' : 'Starts by Itself'; gap.disabled = wait.classList.contains('active'); };
    wait.classList.toggle('active', !!own.manual);
    sync();
    row.insertBefore(name, wait); row.insertBefore(gap, wait);
    body.appendChild(row);
    return { item, gap, wait };
  });
  $('showset-save').onclick = () => {
    const seconds = (field) => (field.value === '' ? null : Math.max(0, Math.min(600, +field.value || 0)));
    project.showGap = seconds(usual) || 0;
    for (const { item, gap, wait } of rows) {
      const own = { gap: seconds(gap), manual: wait.classList.contains('active') };
      if (own.gap == null && !own.manual) delete item.show; else item.show = own;
    }
    saveProjects();
    $('showset').hidden = true;
    toast('Show settings saved.', 2500);
  };
  $('showset-title').textContent = 'Show Settings · ' + project.name;
  $('showset').hidden = false;
}
function buildShowRun() {
  if (!showRun) return;
  const items = currentProject().items, at = items.findIndex((it) => it.id === currentItemId);
  document.body.classList.add('show-run');
  setWatch(true);
  $('show-bar').hidden = false;
  $('show-text').textContent = `${at + 1} of ${items.length} · ${items[at].name}`;
  $('show-skip').disabled = at + 1 >= items.length;
  $('show-skip').addEventListener('click', showNext);
  // back: to the start of this item if it has been playing a while, otherwise to the item before
  $('show-back').addEventListener('click', () => {
    if (at === 0 || currentTime() > 3) { seek(0); if (!player.playing) setPlaying(true); showStarted = true; return; }
    showStarted = false;
    showLeave(items[at - 1].id);
  });
  // the name in the middle lists every item, to jump anywhere in the running order
  $('show-text').addEventListener('click', (e) => {
    e.stopPropagation();
    popMenu($('show-text'), items.map((it, i) => [`${i + 1}. ${it.name}`, () => { if (i !== at) { showStarted = false; showLeave(it.id); } }, i === at]));
  });
  $('show-stop').addEventListener('click', () => showLeave(null));
  $('show-tap').addEventListener('click', showStart);
  // an item is over when its track ends; without a track, a few seconds after its last cue
  const lastCue = show.cues.length ? show.cues[show.cues.length - 1] : null;
  const quietEnd = lastCue ? lastCue.time + (lastCue.instant ? 0 : lastCue.fade || 0) + 4 : 3;
  setInterval(() => {
    if (!showStarted) return;
    const T = currentTime();
    const over = player.audio ? player.audio.ended || (!player.playing && T >= duration() - 0.15) : T >= quietEnd;
    if (over) showNext(true);
  }, 250);
}

// Phone: the preview alone, full screen and in landscape. Where the browser allows it the
// screen really goes full screen and turns; where it does not (iPhone) the page is drawn
// on its side instead, so turning the phone gives the same picture.
let wideFullscreen = false;
async function setWide(on) {
  document.body.classList.toggle('wide', on);
  $('wide').innerHTML = svgIcon(on ? 'collapse' : 'expand');
  $('wide').title = on ? 'Leave Full Screen' : 'Full Screen, Landscape';
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

// ---------------------------------------------------------------------------
// Tours: a short walk through the screen, one small card at a time, each pointing at the
// real control it is about. There is one for the home screen (which depends on whether
// you manage the lighting or plot an item) and one for the editor.
// ---------------------------------------------------------------------------
const TOURS = {
  manager: [
    ['#new-project', 'Shows', 'A show holds the stage and every item (dance) in it. Start one here and choose how many items it begins with.'],
    ['#home-more', 'Stage Layouts', 'A layout is a stage: where the lights hang. Open this menu and choose Layouts to make, edit and share them. A layout can be shared with a code that others type in.'],
    ['#import-btn', 'Import and Download', 'Bring in show or item files that others send you. Every card has a download button; tick several cards to download them together.'],
    ['#drafts', 'Drafts', 'Items made or imported without a show wait here. The folder button on a draft moves it into a show.'],
    ['#project-list', 'Inside a Show', 'Open a show to see its items. Drag the six-dot handle to put them in running order, and use the arrows on a picture to flip through that item\'s cues.'],
    ['.home-views', 'Views', 'Switch every list between large tiles, small tiles and rows.'],
  ],
  plotter: [
    ['#import-btn', 'Got a File?', 'If your lighting manager sent you an item file, import it here and choose Item.'],
    ['#draft-new', 'Or Start Fresh', 'New Item makes an empty item for you to plot. You pick the stage layout it uses, and it appears under Drafts.'],
    ['#drafts', 'Open It', 'Tap an item to open it and start plotting. Your work saves as you go.'],
  ],
  editor: [
    ['#plan', 'The Stage Plan', 'Tap a light to select it, or swipe across to select several. Pinch or scroll to zoom in.'],
    ['#mods', 'Controls', 'Colors, effects, spotlights, side lights, face lights and the cyclorama. With lights selected, only their options show.'],
    ['#views', 'Live Preview', 'See the look as the audience would. Switch between Front and 3D.'],
    ['#load-track', 'The Song', 'Load the track for this item. It stays with the item.'],
    ['#add-cue', 'Cues', 'Go to a moment in the song and press + to save the lights you see as a cue. Changes you make while on a cue save into it.'],
    ['#wave', 'Timeline', 'Drag to move through the song and pinch to zoom. Drag a cue\'s flag to change when it happens.'],
    ['#more', 'Menu', 'Export a PDF cue sheet, download the item, or switch to watch mode.'],
  ],
};
let touring = null;                 // { steps, at, done }
function showTourStep() {
  const [selector, title, text] = touring.steps[touring.at];
  const target = document.querySelector(selector), hole = $('tour-hole'), card = $('tour-card');
  $('tour-title').textContent = title;
  $('tour-text').textContent = text;
  $('tour-count').textContent = `${touring.at + 1} of ${touring.steps.length}`;
  $('tour-back').hidden = touring.at === 0;
  $('tour-next').textContent = touring.at === touring.steps.length - 1 ? 'Done' : 'Next';
  if (target && target.offsetParent) target.scrollIntoView({ block: 'nearest' });
  let r = target ? target.getBoundingClientRect() : null;
  if (r && (!r.width || !r.height)) r = null;                  // hidden on this screen: no pointer, the card sits in the middle
  hole.hidden = !r;
  const gap = 6, vw = innerWidth, vh = innerHeight;
  if (r) {
    const box = { left: Math.max(4, r.left - gap), top: Math.max(4, r.top - gap), right: Math.min(vw - 4, r.right + gap), bottom: Math.min(vh - 4, r.bottom + gap) };
    Object.assign(hole.style, { left: box.left + 'px', top: box.top + 'px', width: box.right - box.left + 'px', height: box.bottom - box.top + 'px' });
    r = box;
  }
  const w = card.offsetWidth, h = card.offsetHeight;
  let left = r ? r.left + (r.right - r.left) / 2 - w / 2 : (vw - w) / 2, top;
  if (!r) top = (vh - h) / 2;
  else if (vh - r.bottom >= h + 20) top = r.bottom + 12;        // under it
  else if (r.top >= h + 20) top = r.top - h - 12;               // over it
  else top = Math.min(vh - h - 12, Math.max(12, r.bottom - h - 16));      // it fills the screen: sit inside its lower edge
  card.style.left = Math.max(12, Math.min(vw - w - 12, left)) + 'px';
  card.style.top = Math.max(12, Math.min(vh - h - 12, top)) + 'px';
}
function startTour(name) {
  touring = { steps: TOURS[name], at: 0, name };
  $('tour').hidden = false;
  showTourStep();
}
function endTour() {
  if (!touring) return;
  prefs[touring.name === 'editor' ? 'tourEditor' : 'tourHome'] = true;
  store.set('kdt-lighting-prefs-v1', prefs);
  touring = null;
  $('tour').hidden = true;
}
function buildTours() {
  $('tour-next').addEventListener('click', () => { if (touring.at === touring.steps.length - 1) endTour(); else { touring.at++; showTourStep(); } });
  $('tour-back').addEventListener('click', () => { touring.at--; showTourStep(); });
  $('tour-skip').addEventListener('click', endTour);
  window.addEventListener('resize', () => { if (touring) showTourStep(); });
  document.addEventListener('keydown', (e) => { if (touring && e.key === 'Escape') endTour(); });
  // the first question: which tour of the home screen fits
  each('[data-role]', (b) => b.addEventListener('click', () => {
    prefs.role = b.dataset.role;
    store.set('kdt-lighting-prefs-v1', prefs);
    $('role').hidden = true;
    startTour(prefs.role);
  }));
  $('role-skip').addEventListener('click', () => {
    Object.assign(prefs, { role: prefs.role || 'skipped', tourHome: true, tourEditor: true });
    store.set('kdt-lighting-prefs-v1', prefs);
    $('role').hidden = true;
  });
  $('home-tour').insertAdjacentHTML('afterbegin', svgIcon('help'));
  $('home-tour').addEventListener('click', () => { $('role').hidden = false; });
  $('tour-editor').addEventListener('click', () => startTour('editor'));
}

// Name tags: hovering a button that has a title shows it at once in a small label, instead
// of the browser's own tooltip that takes a second to appear. (Touch screens have no hover.)
function buildTips() {
  if (!matchMedia('(hover: hover)').matches) return;
  const tip = document.createElement('div');
  tip.id = 'tip'; tip.hidden = true;
  document.body.appendChild(tip);
  let shownFor = null;
  const hide = () => { tip.hidden = true; shownFor = null; };
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest && e.target.closest('button, label.btn, canvas[title], [data-tip]');
    if (!el) return hide();
    if (el.title) {                               // take the text over from the browser's tooltip
      el.dataset.tip = el.title;
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.title);
      el.removeAttribute('title');
    }
    if (!el.dataset.tip || el === shownFor) { if (!el.dataset.tip) hide(); return; }
    shownFor = el;
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const top = r.bottom + 6 + h > innerHeight - 4 ? r.top - h - 6 : r.bottom + 6;
    tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = top + 'px';
  });
  for (const type of ['mousedown', 'wheel', 'keydown']) document.addEventListener(type, hide, true);
  document.addEventListener('mouseleave', hide);
}

// Dropdowns never use the browser's own list. Each <select> is kept (the rest of the app reads
// and sets its value as before) but hidden behind a button that opens the app's menu.
function dressSelect(select) {
  if (select.dressed) return;
  select.dressed = true;
  const face = document.createElement('button');
  face.type = 'button'; face.className = 'btn select-btn';
  const text = document.createElement('span');
  face.appendChild(text);
  face.insertAdjacentHTML('beforeend', svgIcon('chevron'));
  const show = () => { const now = select.options[select.selectedIndex]; text.textContent = now ? now.text : ''; };
  // setting .value from code (the controls following a cue, say) must update the button too
  const native = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(select, 'value', { get() { return native.get.call(select); }, set(v) { native.set.call(select, v); show(); } });
  face.addEventListener('click', (e) => {
    e.stopPropagation();
    popMenu(face, [...select.options].map((option) => [option.text, () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, option.value === select.value]));
  });
  select.hidden = true;
  select.after(face);
  new MutationObserver(show).observe(select, { childList: true });        // options filled in later
  show();
}
function buildSelects() {
  each('select', dressSelect);
  new MutationObserver((changes) => {
    for (const change of changes) {
      for (const node of change.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'SELECT') dressSelect(node);
        else node.querySelectorAll('select').forEach(dressSelect);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// A menu that would run off the side of the screen is slid back in.
function keepOnScreen(menu) {
  menu.style.transform = '';
  if (menu.hidden) return;
  const r = menu.getBoundingClientRect(), edge = 8;
  const dx = r.right > innerWidth - edge ? innerWidth - edge - r.right : r.left < edge ? edge - r.left : 0;
  if (dx) menu.style.transform = `translateX(${Math.round(dx)}px)`;
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
  const bar = document.querySelector('meta[name="theme-color"]');        // the phone's status bar matches the page
  if (bar) bar.content = prefs.theme === 'dark' ? '#1e1e1e' : '#f5f5f5';
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
    n.style.fill = c ? hexOf(c) : '';
    n.style.filter = c ? `drop-shadow(0 0 6px ${hexOf(c)})` : '';
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
  for (const light of CUSTOMS) {
    const n = planEls.custom[light.id], c = look.custom && look.custom[light.id];
    if (!n) continue;
    n.style.fill = c ? hexOf(c) : '';
    n.style.filter = c ? `drop-shadow(0 0 6px ${hexOf(c)})` : '';
    n.classList.toggle('selected', !bare && selCustom.has(light.id));
  }
  for (const n of planEls.face) n.setAttribute('class', 'face f' + look.face);
  for (const side of SIDES) planEls.side[side].forEach((n, i) => {
    n.classList.toggle('on', !!(look.sidePos[side] && look.sidePos[side][i]));
    n.classList.toggle('selected', !bare && selSides.has(side + i));
    n.parentNode.classList.toggle('sel', !bare && selSides.has(side + i));
  });
  planEls.cyclo.style.fill = look.cyclo === 'none' ? '' : hexOf(look.cyclo);
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
  $('sec-leds').hidden = !LEDS.length || (some && !selection.size);          // a kind of light the layout does not have is never shown
  $('sec-spots').hidden = !SPOTS.length || (some && !selSpots.size);
  $('sec-sides').hidden = !(SIDE_LIGHTS.L.length + SIDE_LIGHTS.R.length) || (some && !selSides.size);
  $('sec-face').hidden = !FACES.length || some;
  $('sec-cyclo').hidden = some && !selCyclo;
  for (const kind of KINDS) {
    const mine = CUSTOMS.filter((light) => light.kind === kind.id), picked = mine.filter((light) => selCustom.has(light.id)).length;
    const section = $('sec-kind-' + kind.id);
    if (!section) continue;
    section.hidden = !mine.length || (some && !picked);
    section.querySelector('.count').textContent = picked ? picked + ' selected' : '';
    for (const slide of section.querySelectorAll('[data-slide]')) slide.read();
  }
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
  $('aim-zone').textContent = aiming ? 'Tap a Zone on the Plan' : zone > 0 ? `Zone ${zone} (${ZONE_NAMES[zone - 1]})` : 'Aim at Zone';
  planEls.zonePick.style.display = aiming ? '' : 'none';
  const allSame = (values) => values.length > 0 && values.every((v) => v === values[0]);
  const spotStates = [...selSpots].map((id) => !!state.spots[id]);
  const sideStates = [...selSides].map((key) => !!state.sidePos[key[0]][+key.slice(1)]);
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
const depthScale = (z3) => 0.8 + 0.2 * clamp01((z3 * FIT.z + 3) / 6);   // further back sits closer to the centre
const frontX = (x3, z3) => FW / 2 + x3 * FIT.x * 96 * depthScale(z3);
// Where a fixture sits in the picture. The rig hangs above the top edge, so beams come
// in from off-screen instead of appearing to start in mid-air.
const rigY = (scale) => (1 - scale) * 130 - 44;
const floorY = (z3) => HORIZON + 8 + clamp01((z3 * FIT.z + 3) / 6) * (FLOOR_Y - HORIZON - 14);

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
    g.addColorStop(0, lit(SPOT_C[0], SPOT_C[1], SPOT_C[2], f[10]));
    g.addColorStop(0.2, lit(SPOT_C[0], SPOT_C[1], SPOT_C[2], f[10] * 0.8));
    g.addColorStop(0.42, lit(SPOT_C[0], SPOT_C[1], SPOT_C[2], f[10] * 0.38));
    g.addColorStop(1, lit(SPOT_C[0], SPOT_C[1], SPOT_C[2], f[10] * 0.12));
    ctx.fillStyle = g; ctx.fillRect(left, top, wide, y - top);
  }
  if (f[3] > 0.01) {                           // face light: flat across the whole front
    ctx.fillStyle = lit(FACE_C[0], FACE_C[1], FACE_C[2], f[3]);
    ctx.fillRect(left, top, wide, y - top);
  }
  const bands = [[top, y - 1.45 * u], [y - 1.45 * u, y - 0.8 * u], [y - 0.8 * u, y]];   // head, torso, legs
  for (let side = 0; side < 2; side++) {       // side light: bright on its own edge, gone by the far side
    const from = side === 0 ? left + 0.06 * u : left + wide - 0.06 * u, to = side === 0 ? x + 0.12 * u : x - 0.12 * u;
    bands.forEach(([y0, y1], i) => {
      const amount = f[4 + side * 3 + i];
      if (amount < 0.01) return;
      const g = ctx.createLinearGradient(from, 0, to, 0);
      g.addColorStop(0, lit(SIDE_C[0], SIDE_C[1], SIDE_C[2], amount)); g.addColorStop(1, 'rgb(0,0,0)');
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
  // Stage objects that stand on the stage, as plain shapes seen from the front, furthest first
  for (const o of FRONT_OBJECTS) {
    const sc = depthScale(o.z3), x = frontX(o.x3, o.z3), half = o.across * 96 * FIT.x * sc / 2, base = floorY(o.z3) - (o.z || 0) * PX * sc, tall = Math.max(2, o.h * PX * sc);
    if (o.look === 'truss' || o.look === 'tower' || o.look === 'stand' || o.look === 'pipe') {
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1;
      ctx.strokeRect(x - Math.max(half, 1), base - tall, Math.max(half, 1) * 2, tall);
      if (o.look === 'truss') { ctx.beginPath(); for (let k = -half; k < half; k += tall * 2) { ctx.moveTo(x + k, base); ctx.lineTo(Math.min(x + half, x + k + tall), base - tall); ctx.lineTo(Math.min(x + half, x + k + tall * 2), base); } ctx.stroke(); }
    } else {
      ctx.fillStyle = { screen: '#141c26', curtain: '#1c0e11', seats: '#15151b' }[o.look] || '#18181e';
      ctx.fillRect(x - half, base - tall, half * 2, tall);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x - half, base - tall, half * 2, 1.5);        // a lit top edge
      if (o.picture) { ctx.globalAlpha = 0.9; ctx.drawImage(o.picture, x - half, base - tall, half * 2, tall); ctx.globalAlpha = 1; }
    }
  }

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
    softBeam(x, rigY(s), 20 * s, x, y, 95 * s, SPOT_C[0], SPOT_C[1], SPOT_C[2], 0.4 * lvl, 0.08 * lvl);
    floorGlow(x, y, 62 * s, 9, SPOT_C[0], SPOT_C[1], SPOT_C[2], 0.1 * lvl);
  });
  CUSTOMS.forEach((light, i) => {
    const r = D[O_CUS + i * 3], g = D[O_CUS + i * 3 + 1], b = D[O_CUS + i * 3 + 2];
    if (r + g + b < 0.01) return;
    const T = throwOf(light, D[O_MOV + i * 3], D[O_MOV + i * 3 + 1], D[O_MOV + i * 3 + 2]), k = punch(T.len, D[O_MOV + i * 3 + 2]);
    const s = depthScale(light.z3), x = frontX(light.x3, light.z3), h = heightOf(light);
    const top = h >= RIG_H - 0.3 ? rigY(s) : floorY(light.z3) - h * PX * s;      // lights on the rig start above the picture; lower ones where they hang
    if (T.lands) {
      const s2 = depthScale(T.z), x2 = frontX(T.x, T.z), y2 = floorY(T.z), wide = Math.max(12, T.r * 52 * s2);
      softBeam(x, top, 20 * s, x2, y2, wide * 1.5, r, g, b, 0.4 * k, 0.09 * k);
      floorGlow(x2, y2, wide, 9, r, g, b, 0.11 * k);
    } else softBeam(x, top, 14 * s, frontX(light.x3 + T.dx * 4, light.z3 + T.dz * 4), top - T.dy * 4 * PX * s, 70 * s, r, g, b, 0.35, 0.02);    // pointing out or up: a beam that fades into the air
  });
  SIDES.forEach((side, sIdx) => {
    let n = 0;
    SIDE_LIGHTS[side].forEach((light, j) => { n += D[sideAt(sIdx, j)]; });
    if (n < 0.01) return;
    const edge = side === 'L' ? 0 : FW, tip = side === 'L' ? FW * 0.26 : FW * 0.74;     // a short throw
    SIDE_TYPES.forEach(([id], t) => {
      const a = D[O_TYPE + t] * (0.07 + 0.03 * n);
      if (a < 0.005) return;
      const y = floorY(0) - SIDE_H[id] * PX * 0.9;
      const grad = hctx.createLinearGradient(edge, 0, tip, 0);
      grad.addColorStop(0, css(SIDE_C[0], SIDE_C[1], SIDE_C[2], a)); grad.addColorStop(1, css(SIDE_C[0], SIDE_C[1], SIDE_C[2], 0));
      hctx.fillStyle = grad;
      hctx.beginPath();
      hctx.moveTo(edge, y - 5); hctx.lineTo(tip, y - 20); hctx.lineTo(tip, y + 20); hctx.lineTo(edge, y + 5);
      hctx.closePath(); hctx.fill();
    });
  });
  if (D[O_FACE] > 0.01) {                        // face lights wash down from above the audience
    const grad = hctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    grad.addColorStop(0, css(FACE_C[0], FACE_C[1], FACE_C[2], 0.02 * D[O_FACE]));
    grad.addColorStop(1, css(FACE_C[0], FACE_C[1], FACE_C[2], 0.1 * D[O_FACE]));
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
  const stageW = (STAGE.x1 - STAGE.x0) / UNIT, stageD = (STAGE.y1 - STAGE.y0) / UNIT, drop = Math.max(0.02, STAGE_H);
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(60 + stageW, 60 + stageD), solid(0x08080b)), 0, -drop, 0);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.Mesh(new THREE.BoxGeometry(stageW + 0.4, drop, stageD + 0.4), solid(0x15151a)), 0, -drop / 2, 0);
  const cyclo = add(new THREE.Mesh(new THREE.PlaneGeometry(CYC.halfW * 2, CYC.top), solid(0x0c0c11)), 0, CYC.top / 2, CYC.z);
  for (const y of LED_ROW_Y) add(new THREE.Mesh(new THREE.BoxGeometry(6.6 / FIT.x, 0.06, 0.06), solid(0x222228)), 0, RIG_H + 0.1, to3(0, y)[1]);
  // stage objects: plain blocks of their own size, standing where the plan puts them
  const shaded = (color) => [0.78, 0.78, 1.25, 0.6, 1, 0.9].map((k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));    // each face its own shade, so shapes read without real light
  const box = (w, h, d, color, x, y, z, parent) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shaded(color)), x, y, z, parent);
  const steel = solid(0x6c6c78), brace = solid(0x4c4c56);
  // a length of box truss along x: four chords and zigzag bracing
  function lattice(len, size, parent) {
    const r = 0.022, half = size / 2 - r, bays = Math.max(1, Math.round(len / 0.5)), step = len / bays;
    const slope = Math.hypot(step, half * 2), tilt = Math.atan2(half * 2, step);
    for (const y of [-half, half]) for (const z of [-half, half]) add(new THREE.Mesh(new THREE.BoxGeometry(len, r * 2, r * 2), steel), 0, y, z, parent);
    for (let i = 0; i < bays; i++) {
      const x = -len / 2 + step * (i + 0.5), way = i % 2 ? 1 : -1;
      for (const z of [-half, half]) add(new THREE.Mesh(new THREE.BoxGeometry(slope, r, r), brace), x, 0, z, parent).rotation.z = tilt * way;
      for (const y of [-half, half]) add(new THREE.Mesh(new THREE.BoxGeometry(slope, r, r), brace), x, y, 0, parent).rotation.y = tilt * way;
    }
  }
  for (const o of OBJECTS) {
    const look = assetOf(o).look, h = Math.max(0.02, o.h);
    const g = add(new THREE.Group(), o.x3, (o.z || 0) + h / 2, o.z3);      // the group's origin is the object's middle
    g.rotation.y = -(o.rot || 0) * Math.PI / 180;
    const ready = mediaOf(o);
    if (ready) ready.then((node) => {              // its picture or video, on the side that faces the audience
      if (!node) return;
      const map = node.tagName === 'VIDEO' ? new THREE.VideoTexture(node) : new THREE.Texture(node);
      map.needsUpdate = true;
      add(new THREE.Mesh(new THREE.PlaneGeometry(o.w, h), new THREE.MeshBasicMaterial({ map })), 0, 0, o.d / 2 + 0.01, g);
    });
    if (look === 'truss') lattice(o.w, Math.min(o.d, h), g);
    else if (look === 'tower') { const up = add(new THREE.Group(), 0, 0, 0, g); up.rotation.z = Math.PI / 2; lattice(h, Math.min(o.w, o.d), up); }
    else if (look === 'pipe') box(o.w, h, o.d, 0x6c6c78, 0, 0, 0, g);
    else if (look === 'stand') {                  // a base, a pole, and a short bar across the top
      const base = Math.min(Math.max(o.w, o.d), 1);
      if (base > 0.2) box(base, 0.04, base, 0x33333b, 0, -h / 2 + 0.02, 0, g);
      box(0.05, h, 0.05, 0x6c6c78, 0, 0, 0, g);
      if (base > 0.2) box(base, 0.05, 0.05, 0x6c6c78, 0, h / 2 - 0.025, 0, g);
    } else if (look === 'seats') {                // rows that rise towards the back of the house
      const rows = Math.max(1, Math.round(o.d / 0.8)), deep = o.d / rows;
      for (let row = 0; row < rows; row++) { const tall = h * (0.45 + 0.55 * row / Math.max(1, rows - 1)); box(o.w, tall, deep * 0.92, 0x23232b, 0, -h / 2 + tall / 2, -o.d / 2 + deep * (row + 0.5), g); }
    } else box(o.w, h, o.d, { screen: 0x1a2430, curtain: 0x2a1418, flat: 0x1c1c22 }[look] || 0x24242b, 0, 0, 0, g);
  }

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
  const customs = CUSTOMS.map((s) => {
    const h = heightOf(s), fx = s.fx, bar = fx && (fx.shape === 'batten' || fx.shape === 'strobe');
    const cone = add(beam(0.04, 1, 1), s.x3, h, s.z3);                    // sized and turned every frame, from its pan, tilt and beam
    const spot = add(pool(1), s.x3, 0.013, s.z3);
    let body = null;
    if (fx) {                                                             // a body for the fixture, turned with it
      body = add(new THREE.Group(), s.x3, h, s.z3);
      if (bar) box(1, 0.1, 0.12, 0x2a2a31, 0, 0.05, 0, body);
      else add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.32, 14), solid(0x2a2a31)), 0, 0.16, 0, body);
    }
    return { light: s, cone, lens: lens(s.x3, h, s.z3), pool: spot, body, bar };
  });

  const sides = [];
  SIDES.forEach((side, sIdx) => {
    const d = side === 'L' ? -1 : 1;
    SIDE_LIGHTS[side].forEach((light, j) => {
      const z = light.z3, x = light.x3 - d * 0.15;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), solid(0x222228)), light.x3, 0.65, z);
      SIDE_TYPES.forEach(([type], t) => {
        const cone = add(beam(0.05, 0.42, 3.8), x, SIDE_H[type], z);     // a short throw
        cone.rotation.z = -d * Math.PI / 2;
        sides.push({ pos: sideAt(sIdx, j), type: O_TYPE + t, cone, lens: lens(x, SIDE_H[type], z) });
      });
    });
  });

  // Face lights hang high above the audience and point down at the front of the stage.
  const FACE_H = 5.4;
  const faces = FACES.map((light) => {
    const x = light.x3, faceZ = light.z3;
    dir.set(x * 0.9 - x, -FACE_H, 1.2 - faceZ);
    const cone = add(beam(0.06, 1.0, dir.length()), x, FACE_H, faceZ);
    cone.quaternion.setFromUnitVectors(DOWN, dir.normalize());
    return { cone, lens: lens(x, FACE_H, faceZ) };
  });
  if (FACES.length) add(new THREE.Mesh(new THREE.BoxGeometry(7 / FIT.x, 0.06, 0.06), solid(0x222228)), 0, FACE_H + 0.1, FACE_Z);
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
  const far = Math.max(1, 1 / FIT.x, 1 / FIT.z);          // a bigger stage is looked at from further back
  const orbit = { az: 0.5, el: 0.45, dist: 16 * far, target: new THREE.Vector3(0, 1.7, 0) };
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
    orbit.dist = Math.max(8, Math.min(34 * far, orbit.dist * (1 + e.deltaY * (e.metaKey ? 0.001 : 0.01))));
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
      setLens(s.lens, lvl * SPOT_C[0], lvl * SPOT_C[1], lvl * SPOT_C[2]);
      s.cone.material.uniforms.color.value.setRGB(SPOT_C[0] * lvl * 0.15, SPOT_C[1] * lvl * 0.15, SPOT_C[2] * lvl * 0.15);
      s.pool.material.color.setRGB(SPOT_C[0] * lvl * 0.12, SPOT_C[1] * lvl * 0.12, SPOT_C[2] * lvl * 0.12);
    });
    customs.forEach((s, i) => {
      const r = D[O_CUS + i * 3], g = D[O_CUS + i * 3 + 1], b = D[O_CUS + i * 3 + 2];
      const pan = D[O_MOV + i * 3], T = throwOf(s.light, pan, D[O_MOV + i * 3 + 1], D[O_MOV + i * 3 + 2]), k = punch(T.len, D[O_MOV + i * 3 + 2]);
      dir.set(T.dx, T.dy, T.dz);
      if (s.body) { if (s.bar) s.body.rotation.y = -pan * Math.PI / 180; else s.body.quaternion.setFromUnitVectors(DOWN, dir); }
      s.cone.visible = r + g + b > 0.01;
      s.pool.visible = s.cone.visible && T.lands;
      setLens(s.lens, r, g, b);
      if (!s.cone.visible) return;
      s.cone.quaternion.setFromUnitVectors(DOWN, dir);
      s.cone.scale.set(T.r, T.len, T.r);
      s.pool.position.set(T.x, 0.013, T.z);
      s.pool.rotation.z = -pan * Math.PI / 180;                           // the pool stretches along the throw
      s.pool.scale.set(T.r, T.r * Math.min(4, 1 / Math.max(0.2, -T.dy)), 1);
      s.cone.material.uniforms.color.value.setRGB(r * 0.15 * k, g * 0.15 * k, b * 0.15 * k);
      s.pool.material.color.setRGB(r * 0.12 * k, g * 0.12 * k, b * 0.12 * k);
    });
    for (const s of sides) {
      const lvl = D[s.pos] * D[s.type];
      s.cone.visible = lvl > 0.01;
      setLens(s.lens, lvl * SIDE_C[0], lvl * SIDE_C[1], lvl * SIDE_C[2]);
      s.cone.material.uniforms.color.value.setRGB(SIDE_C[0] * lvl * 0.14, SIDE_C[1] * lvl * 0.14, SIDE_C[2] * lvl * 0.14);
    }
    const face = D[O_FACE];
    for (const f of faces) {
      f.cone.visible = face > 0.01;
      setLens(f.lens, face * FACE_C[0], face * FACE_C[1], face * FACE_C[2]);
      f.cone.material.uniforms.color.value.setRGB(FACE_C[0] * face * 0.16, FACE_C[1] * face * 0.16, FACE_C[2] * face * 0.16);
    }
    faceGlow.visible = face > 0.01;
    faceGlow.material.color.setRGB(FACE_C[0] * face * 0.13, FACE_C[1] * face * 0.13, FACE_C[2] * face * 0.13);
    cyclo.material.color.setRGB(0.045 + D[O_CYC] * 0.5, 0.045 + D[O_CYC + 1] * 0.5, 0.06 + D[O_CYC + 2] * 0.5);
    people.forEach((p, n) => {
      p.g.visible = prefs.people;
      // each part is one flat colour here, so the two sides are averaged
      const f = figures[n];
      p.parts.forEach((m, i) => {
        const face = f[3], side = (f[4 + i] + f[7 + i]) * 0.5, spot = f[10] * SPOT_SHARE[i], share = LED_SHARE[i];
        const mix = (c) => Math.min(1, UNLIT + f[c] * share + FACE_C[c] * face + SIDE_C[c] * side + SPOT_C[c] * spot);
        m.material.color.setRGB(mix(0), mix(1), mix(2));
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
  state = Object.assign(blankLook(), clone(show.cues[idx].look));      // a look from an older or outside file may lack parts
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
    iconButton('pencil', 'Rename Cue', () => { nameEditing = true; renderCues(); }, 'bare');
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

  iconButton('copy', 'Duplicate Cue', () => duplicateCue(cue));
  iconButton('trash', 'Delete Cue', () => deleteCue(cue));
  // Optional comment for this cue; it goes on the cue's page in the PDF.
  // It opens and closes from the comment button, which carries a dot while the cue has one.
  const noteButton = iconButton('comment', noteOpen ? 'Hide Comment' : cue.note ? 'Show Comment' : 'Add Comment',
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
  return !known || look.effect === 'none' ? 'Stage Wash' : `${known[1]} at ${look.bpm} BPM`;
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
  simple('Face Lights', FACE_LEVELS[from.face] || 'Off', FACE_LEVELS[to.face] || 'Off');
  simple('Side Lights', sideText(from), sideText(to));
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
    return { dot: hexOf(colour), text: `${colorLabel(colour, LIGHTS.led)}: ${ranges(ids, 'F')}, ${+zone ? 'aimed at ' + zoneText(zone) : 'straight down'}` };
  });
  const spots = SPOTS.filter((s) => look.spots[s.id]).map((s) => +s.id);
  return [
    ['Effect', [{ text: effect }]],
    ['LEDs', leds.length ? leds : [{ text: 'All off' }]],
    ['Spotlights', [{ text: spots.length ? ranges(spots, '') : 'All off' }]],
    ['Face Lights', [{ text: FACE_LEVELS[look.face] || 'Off' }]],
    ['Side Lights', [{ text: sideText(look) }]],
    ['Cyclorama', [look.cyclo === 'none' ? { text: 'None' } : { text: colorLabel(look.cyclo, LIGHTS.cyclo), dot: hexOf(look.cyclo) }]],
    ...KINDS.filter((kind) => CUSTOMS.some((light) => light.kind === kind.id)).map((kind) => {
      const byColor = new Map();
      for (const light of CUSTOMS) {
        const value = light.kind === kind.id && look.custom && look.custom[light.id];
        if (value) byColor.set(value, [...(byColor.get(value) || []), light.id]);
      }
      const lit = [...byColor].map(([value, ids]) => ({ dot: hexOf(value), text: `${colorLabel(value, LIGHTS[kind.id])}: ${ids.join(', ')}` }));
      return [kind.name, lit.length ? lit : [{ text: 'All off' }]];
    }),
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
  copy.setAttribute('viewBox', `${FULL.x} ${FULL.y} ${FULL.w} ${FULL.h}`);
  copy.setAttribute('width', FULL.w); copy.setAttribute('height', FULL.h);
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
  const top = EDGE + 100, mapW = 1080, mapH = Math.round(mapW * FULL.h / FULL.w);
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
function goHome() {
  try { sessionStorage.removeItem('slp-show'); } catch (e) { /* no session storage */ }
  if (currentProject().scratch) return leaveLayout(false);            // leaving a layout being edited: nothing is kept
  saveThumbnail(); setOpen(currentProject().draft ? null : currentId, null);
}     // back to this project's items (a draft goes home)
function goProjects() { saveThumbnail(); setOpen(null, null); }

// A draft is a one-item project that is not shown as a project.
async function newDraft(name, stage, from, rec) {
  const draft = createProject(name, stage, from);
  draft.draft = true;
  await addItem(draft, name || `Draft ${draftProjects().length + 1}`, rec);
  draft.name = draft.items[0].name;
  saveProjects();
  return draft;
}
// Everything about a project's stage, in one comparable string: two projects with the same
// string have the same lights in the same places, so an item fits either.
function layoutPrint(project) {
  const layout = projectLayout(project), byId = (a, b) => (a.id < b.id ? -1 : 1);
  const list = (items) => [...items].sort(byId).map((it) => `${it.id}:${it.x}:${it.y}:${it.kind || ''}`).join(',');
  return [list(layout.leds), list(layout.spots), list(facesOf(layout)), list(sidesOf(layout)), list(customsOf(layout))].join('|');
}
// File a draft into a project: its one item joins the project and the draft's holder goes.
function moveDraft(draft, into) {
  const item = draft.items[0];
  into.items.push(item);
  into.updated = Date.now();
  countCues(into);
  raw.del(projectKey(LAYOUT_KEY, draft.id));
  projects = projects.filter((p) => p !== draft);
  saveProjects();
  renderHome();
  toast(`Moved ${item.name} to ${into.name}.`, 2500);
}
// stage: the template to start on. from: a file being imported, which brings its own layout.
function createProject(name, stage, from) {
  const id = newId(), tpl = stage || BUILTIN;
  const own = from && from.layout && Array.isArray(from.layout.leds) ? from.layout : (tpl.builtin ? null : copyLayout(tpl.layout));
  if (own) raw.set(projectKey(LAYOUT_KEY, id), own);
  const project = { id, name: name || 'Untitled Show', template: (from && from.template) || tpl.name, templateId: (from && from.templateId) || tpl.id, created: Date.now(), updated: Date.now(), cues: 0, items: [] };
  const lights = (from && from.lights) || tpl.lights;
  if (lights) project.lights = clone(lights);
  if (from && from.showGap) project.showGap = from.showGap;
  projects.unshift(project);
  saveProjects();
  return project;
}
const countCues = (project) => { project.cues = project.items.reduce((n, it) => n + (it.cues || 0), 0); };
// The part of an item's file that is its cue list and track details.
function showPart(data) {
  const part = Object.assign({}, data, { cues: Array.isArray(data.cues) ? data.cues : [] });
  for (const key of ['format', 'version', 'project', 'projectName', 'template', 'templateId', 'layout', 'look', 'name', 'track', 'show', 'lights']) delete part[key];
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
  if (data.show) item.show = data.show;
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
  const copy = createProject(project.name + ' copy', null, { layout: custom, template: project.template, templateId: project.templateId, lights: project.lights });
  copy.thumb = project.thumb;
  if (project.draft) copy.draft = true;
  for (const item of project.items) await copyItem(item, copy, project.draft ? project.name + ' copy' : undefined);
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
  if (item.show) data.show = item.show;          // its show settings: own gap, or waits for Play
  delete data.projectName;
  return { data, track: await audioStore.get(item.id) };
}
// The pictures and videos a layout's screens show, as files for a show file: the files, and
// a list of where each one is ({ id: { path, name, type } }) to find them again on the way in.
async function packMedia(layout) {
  const files = [], list = {};
  for (const o of objectsOf(layout)) {
    if (!o.media || list[o.media.id]) continue;
    const file = await audioStore.get(mediaKey(o.media.id));
    if (!file) continue;
    const path = `media/${o.media.id} ${safeName(o.media.name || 'media')}`;
    list[o.media.id] = { path, name: o.media.name, type: o.media.type };
    files.push({ name: path, bytes: new Uint8Array(await file.arrayBuffer()) });
  }
  return { files, list };
}
async function packItem(project, item) {
  const { data, track } = await itemRecord(item);
  const path = track ? 'track/' + safeName(track.name || 'track') : '';
  const media = await packMedia(projectLayout(project));
  const files = [{ name: 'item.json', bytes: jsonBytes(Object.assign({ format: 'slp-item', version: 1, project: project.name, template: project.template, layout: projectLayout(project), media: media.list }, data, { track: path })) }, ...media.files];
  if (track) files.push({ name: path, bytes: new Uint8Array(await track.arrayBuffer()) });
  return zipWrite(files);
}
async function packProject(project) {
  const files = [], paths = [], media = await packMedia(projectLayout(project));
  for (const [i, item] of project.items.entries()) {
    const { data, track } = await itemRecord(item);
    const path = track ? `tracks/${i + 1} ${safeName(track.name || 'track')}` : '';
    paths.push(`items/${i + 1}.json`);
    files.push({ name: paths[i], bytes: jsonBytes(Object.assign(data, { track: path })) });
    if (track) files.push({ name: path, bytes: new Uint8Array(await track.arrayBuffer()) });
  }
  files.unshift({ name: 'project.json', bytes: jsonBytes({ format: 'slp-project', version: 1, name: project.name, template: project.template, templateId: project.templateId, layout: projectLayout(project), lights: project.lights, showGap: project.showGap || 0, items: paths, media: media.list }) });
  return zipWrite([...files, ...media.files]);
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
  // pictures and videos for the screens go straight into the browser's database, under the ids the layout uses
  const keepMedia = async (list) => {
    for (const id in list || {}) { const bytes = zip.get(list[id].path); if (bytes) await audioStore.put(mediaKey(id), new File([bytes], list[id].name || 'media', { type: list[id].type || '' })); }
  };
  const itemAt = (data) => {
    const bytes = data.track && zip.get(data.track);
    const name = data.trackName || String(data.track).split('/').pop();
    return { data, track: bytes ? new File([bytes], name, { type: AUDIO_TYPES[name.split('.').pop().toLowerCase()] || 'audio/mpeg' }) : null };
  };
  if (zip.has('project.json')) {
    const project = json('project.json');
    await keepMedia(project.media);
    out.projects.push(Object.assign(project, { items: project.items.map((path) => itemAt(json(path))) }));
  } else if (zip.has('item.json')) {
    const data = json('item.json');
    await keepMedia(data.media);
    out.items.push(itemAt(data));
  } else {                                       // several files downloaded together
    for (const [name, bytes] of zip) {
      if (/\.(slitem|slproject)$/i.test(name)) await readArchive(await zipRead(bytes.slice().buffer), out);
    }
  }
}
// Bring files in. On the project list each becomes a project; inside a project their items join it.
// On the home screen `as` says what the files should become: 'item' puts every item in Drafts,
// 'project' makes a project from each file. Inside a project the items always join it.
async function importFiles(fileList, as) {
  const project = currentProject(), bad = [];
  let items = 0, made = 0;
  toast('Importing...');
  for (const file of fileList) {
    try {
      const got = await readFile(file);
      for (const p of got.projects) {
        if (!project && as === 'item') {          // each of the project's items becomes a draft, on that project's layout
          for (const rec of p.items) await newDraft(rec.data.name, null, p, rec);
          items += p.items.length;
          continue;
        }
        const into = project || createProject(p.name, null, p);
        for (const rec of p.items) await addItem(into, rec.data.name, rec);
        if (project) items += p.items.length; else made++;
      }
      for (const rec of got.items) {
        if (!project && as === 'project') {       // a lone item asked for as a project gets one of its own
          await addItem(createProject(rec.data.project || rec.data.name, null, rec.data), rec.data.name, rec);
          made++;
        } else {
          if (project) await addItem(project, rec.data.name, rec); else await newDraft(rec.data.name, null, rec.data, rec);
          items++;
        }
      }
    } catch (e) { bad.push(file.name); }
  }
  renderHome();
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = [made && count(made, 'show'), items && count(items, 'item') + (project ? '' : ' into Drafts')].filter(Boolean);
  toast((parts.length ? `Imported ${parts.join(' and ')}.` : '') + (bad.length ? ` Could not read ${bad.join(', ')}.` : ''), 4500);
}
// Download projects (from the project list) or items (inside a project): one file, or a zip of them.
async function downloadFiles(list, owner) {       // owner: the project the items belong to; none when the list is projects
  const project = owner || currentProject();
  toast('Preparing the download...');
  const files = [], used = new Set();
  for (const thing of list) {
    let name = safeName(project && !project.draft ? `${project.name} - ${thing.name}` : thing.name);
    for (let n = 2; used.has(name.toLowerCase()); n++) name = name.replace(/( \(\d+\))?$/, ` (${n})`);
    used.add(name.toLowerCase());
    files.push({ name: name + (project ? FILE_ITEM : FILE_PROJECT), blob: project ? await packItem(project, thing) : await packProject(thing) });
  }
  if (files.length === 1) saveBlob(files[0].blob, files[0].name);
  else {
    const inside = [];
    for (const file of files) inside.push({ name: file.name, bytes: new Uint8Array(await file.blob.arrayBuffer()) });
    saveBlob(zipWrite(inside), (project ? safeName(project.name) + ' - items' : 'Cueo shows') + '.zip');
  }
  toast(`Downloaded ${files.length} ${project ? 'item' : 'show'}${files.length === 1 ? '' : 's'}.`, 3000);
}

const when = (ms) => {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// A small picture of the front view under one look: used to flip through an item's cues
// on its card without opening it. Drawn with the open project's layout.
const skimBuf = new Float32Array(FRAME_N);
function lookPicture(look) {
  compute(Object.assign(blankLook(), look), 0, skimBuf);
  shareGround(skimBuf);
  lightFigures(skimBuf);
  drawFront(skimBuf);
  const small = document.createElement('canvas');
  small.width = 320; small.height = 188;
  small.getContext('2d').drawImage(front, 0, 0, 320, 188);
  return small.toDataURL('image/jpeg', 0.7);
}

// A small menu that opens under a button and closes on the next click anywhere. entries: [label, action]
function popMenu(anchor, entries) {       // entries: [label, action, current?]
  each('.menu.pop', (old) => old.remove());
  const menu = document.createElement('div');
  menu.className = 'menu pop';
  for (const [label, action, current] of entries) {
    const b = button(menu, label, current ? 'on' : '', action);
    if (current !== undefined) b.insertAdjacentHTML('afterbegin', current ? svgIcon('check') : '<svg viewBox="0 0 16 16"></svg>');
  }
  menu.style.minWidth = Math.max(160, Math.round(anchor.getBoundingClientRect().width)) + 'px';
  const r = anchor.getBoundingClientRect();
  menu.style.left = r.left + 'px';
  menu.style.top = Math.min(r.bottom + 6, innerHeight - 40 * entries.length - 24) + 'px';
  document.body.appendChild(menu);
  keepOnScreen(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// The home screen shows the projects, or the items of the project that is open.
const picked = new Set();          // ids ticked for downloading
function renderHome() {
  const list = $('project-list'), project = currentProject();
  const things = project ? project.items : realProjects().sort((a, b) => b.updated - a.updated);
  list.textContent = '';
  const view = prefs.homeView || 'tile';
  list.className = 'project-list view-' + view;
  each('[data-home-view]', (b) => b.classList.toggle('active', b.dataset.homeView === view));
  $('home-layout').hidden = $('home-lights').hidden = !project;
  $('home-play').hidden = $('home-showset').hidden = !(project && project.items.length);
  $('home-settings').hidden = !project;
  $('layout-news').hidden = !(project && project.layoutNews);
  $('home-back').hidden = $('new-item-wrap').hidden = !project;
  $('home-logo').hidden = $('new-project').hidden = $('draft-new').hidden = !!project;
  $('import-arrow').hidden = !!project;
  $('home-title').textContent = project ? project.name : '';       // the project list has no title, only the small icon
  $('home-title').hidden = !project;
  $('home-heading').textContent = project ? `Items · ${project.template}` : 'Shows';
  $('home-empty').hidden = true;                 // the dashed card below says it instead
  $('home-empty').textContent = project ? 'No items yet. Press New item to add one.' : 'No shows yet. Press New Show to start one.';
  const loose = project ? [] : draftProjects().map((p) => p.items[0]);       // drafts can be ticked too
  for (const id of [...picked]) if (![...things, ...loose].some((t) => t.id === id)) picked.delete(id);
  $('pick-all').hidden = !things.length;
  $('pick-all').textContent = picked.size === things.length ? 'Select None' : 'Select All';
  $('pick-download').hidden = !picked.size;
  $('pick-download').textContent = `Download ${picked.size}`;
  const plural = (n, word) => `${n || 0} ${word}${n === 1 ? '' : 's'}`;
  const addCard = (thing, project, things, list) => {       // project: set when the cards are items
    const card = document.createElement('div');
    card.className = 'project' + (picked.has(thing.id) ? ' picked' : '');
    const tick = document.createElement('label');
    tick.className = 'pick'; tick.title = 'Select for Download';
    const box = document.createElement('input');
    box.type = 'checkbox'; box.checked = picked.has(thing.id);
    box.addEventListener('change', () => { if (box.checked) picked.add(thing.id); else picked.delete(thing.id); renderHome(); });
    tick.appendChild(box); card.appendChild(tick);
    if (project) card.dataset.id = thing.id; else card.dataset.pid = thing.id;        // a project card can take a dropped draft
    const shot = document.createElement('div');
    shot.className = 'shot';
    const open = document.createElement('button');
    open.className = 'project-open';
    open.title = 'Open ' + thing.name;
    const img = new Image();
    img.alt = '';
    if (thing.thumb) { img.src = thing.thumb; open.appendChild(img); }
    else { const blank = document.createElement('div'); blank.className = 'no-thumb'; blank.textContent = 'No preview yet'; open.appendChild(blank); }
    open.addEventListener('click', () => (project ? setOpen(project.id, thing.id) : openProject(thing.id)));
    shot.appendChild(open);
    if (project && thing.cues > 0) {
      // arrows over the picture flip through the item's cues, one picture each
      let at = -1;
      const tag = document.createElement('span');
      tag.className = 'skim-tag'; tag.hidden = true;
      const skim = (by) => () => {
        const cues = (raw.get(projectKey(SHOW_KEY, thing.id), {}).cues) || [];
        if (!cues.length) return;
        at = (at + by + (at < 0 && by < 0 ? 1 : 0) + cues.length) % cues.length;
        try { img.src = lookPicture(cues[at].look); } catch (e) { return; }
        if (!img.isConnected) open.replaceChildren(img);
        tag.hidden = false;
        tag.textContent = `Cue ${at + 1} of ${cues.length} · ${fmt(cues[at].time)}${cues[at].name ? ' · ' + cues[at].name : ''}`;
      };
      const arrow = (cls, icon, label, by) => {
        const b = button(shot, '', 'skim ' + cls, skim(by));
        b.innerHTML = svgIcon(icon); b.title = label; b.setAttribute('aria-label', label);
      };
      arrow('skim-back', 'back', 'Previous Cue', -1);
      arrow('skim-on', 'forward', 'Next Cue', 1);
      shot.appendChild(tag);
    }
    card.appendChild(shot);

    const info = document.createElement('div');
    info.className = 'project-info';
    const name = document.createElement('div');
    name.className = 'project-name'; name.textContent = thing.name;
    name.title = 'Rename';
    name.addEventListener('click', () => {                 // click the name to rename it in place
      const field = document.createElement('input');
      field.type = 'text'; field.value = thing.name; field.maxLength = 60; field.className = 'rename';
      name.replaceWith(field);
      field.focus(); field.select();
      let finished = false;
      const done = (keep) => {
        if (finished) return;
        finished = true;
        if (keep) thing.name = field.value.trim() || thing.name;
        if (project && project.draft) project.name = thing.name;
        saveProjects(); renderHome();
      };
      field.addEventListener('blur', () => done(true));
      field.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
    });
    const meta = document.createElement('div');
    meta.className = 'hint';
    meta.textContent = project
      ? (project.draft ? project.template : `#${things.indexOf(thing) + 1}`) + ` · ${plural(thing.cues, 'cue')} · edited ${when(thing.updated)}`
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
    if (project) {
      // Items keep the order you give them: drag the handle onto another card to move this one there.
      const grip = act('grip', 'Drag to Reorder', () => {});
      grip.classList.add('grip-handle');
      // The card lifts and follows the pointer; the card it is over is outlined, and on release it
      // takes that card's place. Nothing is moved in the page until then, so the drag cannot break off.
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { grip.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
        const page = $('home'), from = { x: e.clientX, y: e.clientY, scroll: page.scrollTop };
        let target = null, last = e;
        card.classList.add('dragging');
        document.body.classList.add('reordering');
        const follow = () => {
          card.style.transform = `translate(${last.clientX - from.x}px, ${last.clientY - from.y + page.scrollTop - from.scroll}px) scale(1.02)`;
          const under = document.elementFromPoint(last.clientX, last.clientY);        // the lifted card lets the pointer through
          // an item is dropped on another item of its project; a draft is dropped on a project
          const over = under && under.closest(project.draft ? '.project[data-pid]' : '.project[data-id]');
          if (over === target) return;
          if (target) target.classList.remove('drop-target', 'drop-no');
          target = over && over !== card && (project.draft || list.contains(over)) ? over : null;
          if (target) target.classList.add(project.draft && layoutPrint(projects.find((p) => p.id === target.dataset.pid)) !== layoutPrint(project) ? 'drop-no' : 'drop-target');
        };
        // near the top or bottom edge the page scrolls, so a long list can be crossed in one drag
        const edge = setInterval(() => {
          const y = last.clientY, step = y < 70 ? -14 : y > innerHeight - 70 ? 14 : 0;
          if (step) { page.scrollTop += step; follow(); }
        }, 16);
        const move = (ev) => { last = ev; follow(); };
        const end = (ev) => {
          clearInterval(edge);
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', end);
          grip.removeEventListener('pointercancel', end);
          document.body.classList.remove('reordering');
          if (target && ev.type === 'pointerup' && project.draft) {
            if (target.classList.contains('drop-no')) toast('That show uses a different stage layout, so this draft does not fit it.', 3500);
            else return moveDraft(project, projects.find((p) => p.id === target.dataset.pid));
          } else if (target && ev.type === 'pointerup') {
            const at = project.items.indexOf(thing), to = project.items.findIndex((it) => it.id === target.dataset.id);
            project.items.splice(at, 1);
            project.items.splice(to, 0, thing);
            saveProjects();
          }
          renderHome();
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
      });
    }
    act('copy', 'Duplicate', () => (project && !project.draft ? duplicateItem(project, thing) : duplicateProject(project || thing)));
    if (project && project.draft) {
      // a draft can be filed into a project: pick which from a small menu
      const file = act('moveto', 'Move to a Show', (e) => {
        e.stopPropagation();
        const print = layoutPrint(project), choices = realProjects().filter((p) => layoutPrint(p) === print);
        if (!choices.length) return toast(realProjects().length ? 'No show uses the same stage layout as this draft.' : 'Create a show first, then move the draft into it.', 3500);
        popMenu(file, choices.map((p) => [p.name, () => moveDraft(project, p)]));
      });
    }
    act('download', 'Download', () => downloadFiles([thing], project));
    // Deleting takes two taps: the first arms the button, the second within a few seconds deletes.
    const del = act('trash', 'Delete', () => {
      if (del.classList.contains('armed')) return project && !project.draft ? deleteItem(project, thing) : deleteProject(project || thing);
      del.classList.add('armed'); del.textContent = 'Delete?';
      setTimeout(() => { if (del.isConnected) renderHome(); }, 3500);
    });
    card.appendChild(actions);
    // the empty parts of the card open it too; the name, tick box and buttons keep their own jobs
    // (a button that redraws itself, like Delete turning into "Delete?", leaves its old icon detached: that click is not for the card)
    card.addEventListener('click', (e) => { if (e.target.isConnected && !e.target.closest('button, input, label, .project-name')) open.click(); });
    list.appendChild(card);
  };
  for (const thing of things) addCard(thing, project, things, list);
  // Drafts sit above the projects on the home screen
  const draftList = $('draft-list');
  $('drafts').hidden = !!project;
  draftList.textContent = '';
  draftList.className = 'project-list view-' + view;
  if (!project) for (const draft of draftProjects()) addCard(draft.items[0], draft, draft.items, draftList);
  if (!project) {
    const addDraft = button(draftList, '', 'project new-card', () => $('draft-new').click());
    addDraft.innerHTML = svgIcon('plus') + '<span>New Item</span>';
  }
  // On the project list: the items worked on last, across all projects, to pick up where you left off.
  const recent = project ? [] : projects.filter((p) => !p.scratch).flatMap((p) => p.items.map((item) => ({ p, item })))
    .sort((a, b) => (b.item.updated || 0) - (a.item.updated || 0)).slice(0, 4);
  $('recent').hidden = recent.length < 2;
  $('recent-list').textContent = '';
  for (const { p, item } of recent) {
    const row = button($('recent-list'), '', 'recent', () => setOpen(p.id, item.id));
    const shot = document.createElement('span');
    shot.className = 'recent-shot';
    if (item.thumb) { const img = new Image(); img.src = item.thumb; img.alt = ''; shot.appendChild(img); }
    const text = document.createElement('span');
    text.className = 'recent-text';
    const title = document.createElement('span');
    title.className = 'project-name'; title.textContent = item.name;
    const sub = document.createElement('span');
    sub.className = 'hint'; sub.textContent = `${p.draft ? 'Draft' : p.name} · edited ${when(item.updated)}`;
    text.appendChild(title); text.appendChild(sub);
    row.appendChild(shot); row.appendChild(text);
  }
  // a dashed card at the end: the same as the New project (or New item) button
  const add = button(list, '', 'project new-card', () => $(project ? 'new-item' : 'new-project').click());
  add.innerHTML = svgIcon('plus') + `<span>${project ? 'New Item' : 'New Show'}</span>`;
}

// ---------------------------------------------------------------------------
// Layouts shared with a code. A template can be published under a code anyone can type in
// to get it; they keep following it, so a change the publisher makes reaches them the next
// time they open the app online. The layouts live in a small online database; everything
// else stays on the device. There is no sign-in: the device that publishes a layout holds
// a one-time key for its next change, so only that device can change it.
//   template.share = { code, version, key? }     key: only on the publisher's device
// ---------------------------------------------------------------------------
const CLOUD = 'https://firestore.googleapis.com/v1/projects/cueo-lab/databases/(default)/documents/layouts/';
const KDT_CODE = 'kdt-ucc-theatre-lighting-plot';
const cleanCode = (text) => String(text).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
async function sha256(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const newKey = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
// -> { name, version, layout, lights }, or null when no layout has that code
async function cloudGet(code) {
  const response = await fetch(CLOUD + code, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('cloud ' + response.status);
  const fields = (await response.json()).fields, data = JSON.parse(fields.data.stringValue);
  return { name: fields.name.stringValue, version: +fields.version.integerValue, layout: data.layout, lights: data.lights || undefined, movedTo: data.movedTo };
}
// One write to the database. `key` is the current one-time key ('' for a new code), `next` the key for the write after.
// `movedTo`: the code this layout now lives under, left behind at its old code.
async function cloudWrite(code, tpl, version, key, next, movedTo) {
  const text = (stringValue) => ({ stringValue });
  return fetch(`${CLOUD}${code}?currentDocument.exists=${version > 1}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      data: text(JSON.stringify({ layout: copyLayout(tpl.layout), lights: tpl.lights || null, movedTo })),
      name: text(tpl.name.slice(0, 80)),
      version: { integerValue: String(version) },
      key: text(key),
      keyHash: text(await sha256(next)),
      updated: { timestampValue: new Date().toISOString() },
    } }),
  });
}
// Give a shared layout a different code. It is published afresh under the new one, and the
// old code is left pointing at it, so people who imported the old code are carried over.
// -> 'ok', 'taken' or 'denied'
async function cloudRecode(tpl, code) {
  const old = tpl.share;
  tpl.share = null;
  let result;
  try { result = await cloudPut(tpl, code); } catch (e) { tpl.share = old; saveTemplates(); throw e; }
  if (result !== 'ok') { tpl.share = old; saveTemplates(); return result; }
  try { await cloudWrite(old.code, tpl, old.version + 1, old.key, newKey(), code); } catch (e) { /* the old code simply stops updating */ }
  return 'ok';
}
// Publish a template under a code for the first time, or publish a change to one this device owns.
// -> 'ok', 'taken' (someone has that code) or 'denied' (this device may not change it)
async function cloudPut(tpl, code) {
  const first = !tpl.share, next = newKey();
  if (!first) {
    // a change that reached the database but whose answer was lost: its key is the current one
    const now = await cloudGet(code);
    if (now && now.version > tpl.share.version && tpl.share.pending) Object.assign(tpl.share, { key: tpl.share.pending, version: now.version });
    tpl.share.pending = next;
    saveTemplates();
  }
  const version = first ? 1 : tpl.share.version + 1;
  const response = await cloudWrite(code, tpl, version, first ? '' : tpl.share.key, next);
  if (response.ok) { tpl.share = { code, version, key: next }; saveTemplates(); return 'ok'; }
  if (response.status === 409 || response.status === 400) return first ? 'taken' : 'denied';
  if (response.status === 403) return first ? 'taken' : 'denied';
  throw new Error('cloud ' + response.status);
}
// After a change to a template this device shares: send it on. Quiet unless it fails.
async function republish(tpl) {
  if (!tpl.share || !tpl.share.key) return;
  try {
    const result = await cloudPut(tpl, tpl.share.code);
    toast(result === 'ok' ? `Published to ${tpl.share.code}.` : `Could not publish to ${tpl.share.code}: this device no longer holds its key.`, 3500);
  } catch (e) { toast(`Not published to ${tpl.share.code}: no connection. It is saved here; publish again when online.`, 4500); }
  if (!$('tpl').hidden) renderTemplates();
}
// Get a layout by its code as a template that follows it.
async function importCode(raw) {
  let code = cleanCode(raw);
  if (code.length < 4) return toast('Type the layout code first.', 2500);
  const had = templates.find((t) => t.share && t.share.code === code);
  if (had) return toast(`You already have ${had.name}.`, 2500);
  toast('Looking for that layout...');
  try {
    let got = await cloudGet(code);
    if (got && got.movedTo) { code = got.movedTo; got = await cloudGet(code); }       // the layout was given a new code
    if (!got && code === KDT_CODE) {
      // Nobody has published the KDT stage yet: the first device to ask for it by its code gets
      // the original layout as its own template and becomes its publisher.
      let tpl = templates.find((t) => t.id === BUILTIN.id && !t.share);
      if (!tpl) { tpl = { id: templates.some((t) => t.id === BUILTIN.id) ? 't' + newId() : BUILTIN.id, name: TEMPLATE, layout: templateLayout(), created: Date.now() }; templates.unshift(tpl); }
      saveTemplates();
      const result = await cloudPut(tpl, code);
      renderTemplates();
      return toast(result === 'ok' ? `${TEMPLATE} is now published as ${code}, from this device.` : `Could not publish ${code}.`, 5000);
    }
    if (!got) return toast(`No layout has the code ${code}.`, 3500);
    templates.unshift({ id: 't' + newId(), name: got.name, layout: got.layout, lights: got.lights, share: { code, version: got.version }, created: Date.now() });
    saveTemplates();
    renderTemplates();
    toast(`Imported ${got.name}.`, 3000);
  } catch (e) { toast('Could not reach the layout library. Check your connection.', 3500); }
}
// On opening the app: bring followed layouts up to date, and note which projects were built on them.
async function refreshShared() {
  let changed = false;
  for (const tpl of templates) {
    if (!tpl.share || tpl.share.key) continue;
    try {
      let got = await cloudGet(tpl.share.code);
      if (got && got.movedTo) {                    // its publisher changed the code: follow it there
        const moved = await cloudGet(got.movedTo);
        if (moved) { tpl.share = { code: got.movedTo, version: 0 }; got = moved; }
      }
      if (!got || got.version <= tpl.share.version) continue;
      Object.assign(tpl, { name: got.name, layout: got.layout, lights: got.lights });
      tpl.share.version = got.version;
      for (const project of projects) if (project.templateId === tpl.id) project.layoutNews = got.version;
      changed = true;
      toast(`${tpl.name} was updated by its publisher.`, 3500);
    } catch (e) { /* offline: try again next time */ }
  }
  if (!changed) return;
  saveTemplates(); saveProjects();
  renderHome();
  if (!$('tpl').hidden) renderTemplates();
}
// A project built on a layout that has since changed can take the new one.
function applyLayoutNews(project) {
  const tpl = templates.find((t) => t.id === project.templateId);
  if (tpl) {
    raw.set(projectKey(LAYOUT_KEY, project.id), copyLayout(tpl.layout));
    if (tpl.lights) project.lights = clone(tpl.lights); else delete project.lights;
    project.template = tpl.name;
  }
  delete project.layoutNews;
  saveProjects();
  location.reload();              // the open page was drawn with the old layout
}
// Put text on the clipboard. Browsers that refuse the modern way (some in-app browsers and
// embedded pages do) get the older one: a hidden text box, selected and copied.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* try the older way */ }
  const box = document.createElement('textarea');
  box.value = text; box.setAttribute('readonly', '');
  box.style.cssText = 'position:fixed;left:0;top:0;opacity:0;';
  document.body.appendChild(box);
  box.select(); box.setSelectionRange(0, text.length);
  let done = false;
  try { done = document.execCommand('copy'); } catch (e) { /* not allowed either */ }
  box.remove();
  return done;
}
// The window for sharing one template: choose a code, or see the one it has.
let sharing = null;
function openShare(tpl) {
  sharing = tpl;
  const mine = tpl.share && tpl.share.key;
  $('share-title').textContent = 'Share · ' + tpl.name;
  $('share-new').hidden = !!tpl.share;
  $('share-has').hidden = !tpl.share;
  $('share-code').value = cleanCode(tpl.name);
  $('share-shown').textContent = tpl.share ? tpl.share.code : '';
  $('share-change').hidden = !mine;
  $('share-recode').value = '';
  $('share-note').textContent = !tpl.share ? ''
    : mine ? 'Anyone can import this layout with the code. Changes you make to it here are published to everyone who has it.'
    : 'You follow this layout: it updates when its publisher changes it. Duplicate it to make your own version.';
  $('share').hidden = false;
}
function buildShare() {
  const close = () => { $('share').hidden = true; sharing = null; };
  $('share-close').innerHTML = svgIcon('close');
  $('share-close').addEventListener('click', close);
  $('share').addEventListener('click', (e) => { if (e.target === $('share')) close(); });
  $('share-code').addEventListener('input', () => { const at = $('share-code'); at.value = at.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'); });
  $('share-go').addEventListener('click', async () => {
    const tpl = sharing, code = cleanCode($('share-code').value);
    if (code.length < 4) return toast('A code needs at least 4 letters or numbers.', 3000);
    toast('Publishing...');
    try {
      const result = await cloudPut(tpl, code);
      if (result !== 'ok') return toast(`The code ${code} is already taken. Try another.`, 3500);
      toast(`Published. The code is ${code}.`, 4000);
      renderTemplates();
      openShare(tpl);
    } catch (e) { toast('Could not publish. Check your connection.', 3500); }
  });
  $('share-recode').addEventListener('input', () => { const at = $('share-recode'); at.value = at.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'); });
  $('share-recode-go').addEventListener('click', async () => {
    const tpl = sharing, code = cleanCode($('share-recode').value);
    if (code.length < 4) return toast('A code needs at least 4 letters or numbers.', 3000);
    if (code === tpl.share.code) return toast('That is already its code.', 2500);
    toast('Changing the code...');
    try {
      const result = await cloudRecode(tpl, code);
      if (result !== 'ok') return toast(`The code ${code} is already taken. Try another.`, 3500);
      toast(`The code is now ${code}. People who had the old code are moved over.`, 4500);
      renderTemplates();
      openShare(tpl);
    } catch (e) { toast('Could not change the code. Check your connection.', 3500); }
  });
  $('share-copy').addEventListener('click', async () => {
    const done = await copyText(sharing.share.code);
    $('share-copy').textContent = done ? 'Copied' : 'Copy';
    if (done) setTimeout(() => { $('share-copy').textContent = 'Copy'; }, 1500);
    else {                                         // last resort: leave the code selected, ready for Cmd + C
      const range = document.createRange();
      range.selectNodeContents($('share-shown'));
      getSelection().removeAllRanges(); getSelection().addRange(range);
      toast('This browser would not copy it. The code is selected: press Cmd + C.', 4500);
    }
  });
  $('tpl-code-go').addEventListener('click', () => { importCode($('tpl-code').value); $('tpl-code').value = ''; });
  $('tpl-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('tpl-code-go').click(); });
  $('news-apply').addEventListener('click', () => applyLayoutNews(currentProject()));
  $('news-later').addEventListener('click', () => { delete currentProject().layoutNews; saveProjects(); renderHome(); });
}

// Light settings: how the LEDs and the cyclorama are controlled. Edited for a template (new
// projects made from it get them) or for one project. `owner` is the template or project.
let lightsDraft = null, lightsDone = null, lightsKinds = LIGHT_KINDS;
function editLights(title, owner, save, kinds = []) {
  const now = lightsOf(owner, kinds);
  lightsKinds = [...LIGHT_KINDS, ...kinds.map((kind) => [kind.id, kind.name])];
  // work on a copy with every colour as a hex value, so each row has a colour to show
  lightsDraft = {};
  for (const [kind] of lightsKinds) lightsDraft[kind] = { type: now[kind].type, on: now[kind].on || (SWITCHED.includes(kind) ? WARM_HEX : '#ffffff'), colors: (now[kind].colors || []).map((c) => ({ name: c.name, value: hexOf(c.value).toLowerCase() })) };
  lightsDone = () => { owner.lights = Object.assign({}, owner.lights, lightsDraft); save(); if (templates.includes(owner)) republish(owner); };
  $('lights-title').textContent = 'Light Settings · ' + title;
  $('lights').hidden = false;
  renderLights();
}
function renderLights() {
  const body = $('lights-body');
  body.textContent = '';
  for (const [kind, label] of lightsKinds) {
    const cfg = lightsDraft[kind], block = document.createElement('div');
    block.className = 'lights-kind';
    const head = document.createElement('div');
    head.className = 'line';
    const name = document.createElement('span');
    name.className = 'lbl mini-lbl'; name.textContent = label;
    const type = document.createElement('select');
    for (const [id, text] of LIGHT_TYPES) if (!SWITCHED.includes(kind) || id === 'onoff') type.add(new Option(text, id, false, id === cfg.type));
    type.addEventListener('change', () => { cfg.type = type.value; renderLights(); });
    head.appendChild(name); head.appendChild(type); block.appendChild(head);
    if (cfg.type === 'set') {
      cfg.colors.forEach((color, i) => {
        const row = document.createElement('div');
        row.className = 'line lights-color';
        const pick = document.createElement('input');
        pick.type = 'color'; pick.className = 'color-pick'; pick.value = color.value;
        pick.addEventListener('input', () => { color.value = pick.value; });
        const text = document.createElement('input');
        text.type = 'text'; text.value = color.name; text.maxLength = 24; text.placeholder = 'Color Name';
        text.addEventListener('input', () => { color.name = text.value; });
        row.appendChild(pick); row.appendChild(text);
        const drop = button(row, '', 'btn icon', () => { cfg.colors.splice(i, 1); renderLights(); });
        drop.innerHTML = svgIcon('close'); drop.title = 'Remove This Color';
        block.appendChild(row);
      });
      const add = button(block, 'Add Color', 'btn lights-add', () => { cfg.colors.push({ name: '', value: '#ffffff' }); renderLights(); });
      add.insertAdjacentHTML('afterbegin', svgIcon('plus'));
    } else if (cfg.type === 'onoff') {
      const row = document.createElement('div');
      row.className = 'line lights-color';
      const pick = document.createElement('input');
      pick.type = 'color'; pick.className = 'color-pick'; pick.value = cfg.on;
      pick.addEventListener('input', () => { cfg.on = pick.value; });
      const text = document.createElement('span');
      text.className = 'lbl mini-lbl'; text.textContent = 'Color When On';
      row.appendChild(pick); row.appendChild(text);        // the swatch sits at the left, in line with the color sets
      block.appendChild(row);
    } else {
      const note = document.createElement('p');
      note.className = 'hint lights-note';
      note.textContent = { rgb: 'A color picker: any color at all.', white: 'A slider from warm white (2700 K) to cool white (6500 K).' }[cfg.type];
      block.appendChild(note);
    }
    body.appendChild(block);
  }
}
function buildLights() {
  const close = () => { $('lights').hidden = true; lightsDraft = lightsDone = null; };
  $('lights-close').innerHTML = svgIcon('close');
  $('lights-close').addEventListener('click', close);
  $('lights').addEventListener('click', (e) => { if (e.target === $('lights')) close(); });
  $('lights-save').addEventListener('click', () => {
    for (const [kind] of lightsKinds) {
      const cfg = lightsDraft[kind];
      cfg.colors = cfg.colors.map((c, i) => ({ name: c.name.trim() || `Color ${i + 1}`, value: c.value }));
      if (cfg.type === 'set' && !cfg.colors.length) return toast('A color set needs at least one color.', 3000);
    }
    lightsDone();
    close();
    toast('Light settings saved.', 2500);
  });
}

// A small plan of a template's stage for its card.
function templatePreview(layout) {
  const leds = layout.leds.map((l) => `<rect class="tp-led" x="${l.x - 17}" y="${l.y - 9}" width="34" height="18" rx="9"/>`).join('');
  const spots = layout.spots.map((sp) => `<circle class="tp-spot" cx="${sp.x}" cy="${sp.y}" r="11"/>`).join('')
    + sidesOf(layout).map((sd) => `<rect class="tp-other" x="${sd.x - 12}" y="${sd.y - 10}" width="24" height="20" rx="5"/>`).join('')
    + facesOf(layout).map((f) => `<rect class="tp-other" x="${f.x - 6}" y="${f.y - 14}" width="12" height="28" rx="6"/>`).join('')
    + customsOf(layout).map((c) => `<rect class="tp-custom" x="${c.x - 14}" y="${c.y - 14}" width="28" height="28" rx="7"/>`).join('');
  const st = layout.stage, hw = st ? st.w * UNIT / 2 : 505, hd = st ? st.d * UNIT / 2 : 305, x0 = STAGE.cx - hw, y0 = STAGE.cy - hd;
  const objects = objectsOf(layout).map((o) => `<rect class="tp-obj" x="${o.x - o.w * UNIT / 2}" y="${o.y - o.d * UNIT / 2}" width="${o.w * UNIT}" height="${o.d * UNIT}" rx="4" transform="rotate(${o.rot || 0} ${o.x} ${o.y})"/>`).join('');
  return `<svg viewBox="${x0 - 165} ${y0 - 68} ${hw * 2 + 330} ${hd * 2 + 350}"><rect class="tp-stage" x="${x0}" y="${y0}" width="${hw * 2}" height="${hd * 2}" rx="10"/>`
    + `<rect class="tp-cyc" x="${STAGE.cx - hw * 0.7515}" y="${y0 - 16}" width="${hw * 1.503}" height="12" rx="5"/>${objects}${leds}${spots}</svg>`;
}
const countText = (layout) => `${layout.leds.length} LED${layout.leds.length === 1 ? '' : 's'} · ${layout.spots.length} spotlight${layout.spots.length === 1 ? '' : 's'}`;

// New project: pick the stage to start on. The same window is where saved templates are
// renamed, copied and deleted.
let tplTab = 'all', tplPicked = null, tplManage = false, tplDraft = false;      // tplManage: only looking after layouts. tplDraft: choosing one for a new draft item
function renderTemplates() {
  const grid = $('tpl-grid');
  grid.textContent = '';
  each('[data-tpl-tab]', (b) => b.classList.toggle('active', b.dataset.tplTab === tplTab));
  const shown = [
    ...(tplTab === 'all' && !tplManage ? [SCRATCH] : []),
    ...templates.filter((t) => tplTab === 'all' || (tplTab === 'shared') === !!t.share),
  ];
  if (tplPicked && !shown.includes(tplPicked)) tplPicked = null;
  for (const tpl of shown) {
    const card = document.createElement('div');
    card.className = 'tpl-card' + (tpl === tplPicked ? ' picked' : '');
    const pick = button(card, '', 'tpl-pick' + (tpl === SCRATCH ? ' scratch' : ''), () => { tplPicked = tpl; renderTemplates(); });
    pick.innerHTML = tpl === SCRATCH ? svgIcon('plus') : templatePreview(tpl.layout);
    pick.title = tpl === SCRATCH ? 'Start From Scratch' : tpl.name;
    pick.addEventListener('dblclick', () => { tplPicked = tpl; newFromTemplate(); });
    const row = document.createElement('div');
    row.className = 'tpl-row';
    const info = document.createElement('div');
    info.className = 'tpl-info';
    const name = document.createElement('div');
    name.className = 'tpl-name'; name.textContent = tpl === SCRATCH ? 'Start From Scratch' : tpl.name;
    const meta = document.createElement('div');
    meta.className = 'hint';
    meta.textContent = tpl === SCRATCH ? 'An Empty Stage' : countText(tpl.layout) + (tpl.share ? ` · code ${tpl.share.code}` : '');
    const follows = tpl.share && !tpl.share.key;         // someone else's layout: it changes only when they change it
    info.appendChild(name); info.appendChild(meta); row.appendChild(info);
    const act = (icon, label, onClick) => {
      const b = button(row, '', 'btn icon', onClick);
      b.innerHTML = svgIcon(icon); b.title = label; b.setAttribute('aria-label', label);
      return b;
    };
    if (tpl !== SCRATCH && !follows) {
      act('pencil', 'Rename', () => {
        const field = document.createElement('input');
        field.type = 'text'; field.value = tpl.name; field.maxLength = 60; field.className = 'rename';
        name.replaceWith(field);
        field.focus(); field.select();
        field.addEventListener('blur', () => {
          const was = tpl.name;
          tpl.name = field.value.trim() || tpl.name; saveTemplates(); renderTemplates();
          if (tpl.name !== was) republish(tpl);
        });
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') field.blur(); });
      });
    }
    if (tpl !== SCRATCH && !follows) {
      act('layout', 'Edit Layout', () => editTemplateLayout(tpl));
      act('sliders', 'Light Settings', () => editLights(tpl.name, tpl, saveTemplates, kindsOf(tpl.layout)));
    }
    if (tpl !== SCRATCH) act('share', tpl.share ? 'Shared With a Code' : 'Share With a Code', () => openShare(tpl));
    if (tpl !== SCRATCH) {
      act('copy', 'Duplicate', () => {
        templates.unshift({ id: 't' + newId(), name: tpl.name + ' copy', layout: copyLayout(tpl.layout), lights: tpl.lights && clone(tpl.lights), created: Date.now() });
        saveTemplates(); renderTemplates();
      });
    }
    if (tpl !== SCRATCH) {
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
  if (tplTab === 'shared' && !templates.some((t) => t.share)) {
    const none = document.createElement('p');
    none.className = 'hint tpl-none';
    none.textContent = 'No shared layouts yet. Type a layout code above to import one, or share one of your own with the share button on its card.';
    grid.appendChild(none);
  }
  if (tplTab === 'mine' && !templates.some((t) => !t.share)) {
    const none = document.createElement('p');
    none.className = 'hint tpl-none';
    none.textContent = 'No layouts of your own yet. Press New layout to draw one, or import one with a code.';
    grid.appendChild(none);
  }
}
async function newFromTemplate() {
  if (tplManage) return;
  if (!tplPicked) return toast('Pick a layout, or Start from scratch.', 2500);
  if (tplDraft) {
    const draft = await newDraft($('new-name').value.trim(), tplPicked);
    $('tpl').hidden = true;
    renderHome();
    return toast(`Added ${draft.name} to Drafts.`, 2500);
  }
  const project = createProject($('new-name').value.trim(), tplPicked);
  const made = [];
  for (const field of [...$('items-names').children]) made.push(await addItem(project, field.value.trim()));
  if (!made.length) made.push(await addItem(project));
  setOpen(project.id, null);                  // land on the project's item list, not inside an item
}

function buildHome() {
  const dialog = $('tpl');
  const close = () => { dialog.hidden = true; };
  $('tpl-close').innerHTML = svgIcon('close');
  const openTemplates = (manage, draft) => {
    tplManage = manage; tplDraft = !!draft; tplPicked = null;
    dialog.querySelector('.tpl').classList.toggle('manage', manage);
    dialog.querySelector('.tpl').classList.toggle('draft', tplDraft);
    $('tpl-title').textContent = manage ? 'Layouts' : draft ? 'New Item' : 'New Show';
    $('tpl-create').textContent = draft ? 'Create Item' : 'Create Show';
    $('new-name-lbl').textContent = draft ? 'Item Name' : 'Show Name';
    $('new-name').placeholder = draft ? 'Untitled Item' : 'Untitled Show';
    dialog.hidden = false;
    renderTemplates();
    $('new-name').value = '';
  };
  $('new-project').addEventListener('click', () => openTemplates(false));
  $('tpl-new').addEventListener('click', () => {
    const tpl = { id: 't' + newId(), name: 'Untitled Layout', layout: { leds: [], spots: [], faces: [], sides: [] }, created: Date.now() };
    templates.unshift(tpl);
    saveTemplates();
    editTemplateLayout(tpl);
  });
  let backToLayouts = false;
  try { backToLayouts = !!sessionStorage.getItem('slp-show-layouts'); sessionStorage.removeItem('slp-show-layouts'); } catch (e) { /* no session storage */ }
  if (backToLayouts && !currentId) openTemplates(true);
  // The app menu behind the icon: things that are about the app, not one project.
  const homeMenu = $('home-menu');
  const themeLabel = () => { $('home-theme').innerHTML = prefs.theme === 'dark' ? svgIcon('sun') + 'Light Mode' : svgIcon('moon') + 'Dark Mode'; };
  for (const [id, icon] of [['home-templates', 'viewtile'], ['home-backup', 'download'], ['home-reload', 'refresh']]) $(id).insertAdjacentHTML('afterbegin', svgIcon(icon));
  themeLabel();
  $('home-more').addEventListener('click', (e) => { e.stopPropagation(); homeMenu.hidden = !homeMenu.hidden; keepOnScreen(homeMenu); });
  document.addEventListener('click', () => { homeMenu.hidden = true; });
  $('home-theme').addEventListener('click', () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; prefs.themeChosen = true; applyPrefs(); themeLabel(); });
  $('home-templates').addEventListener('click', () => openTemplates(true));
  $('home-backup').addEventListener('click', () => {
    const all = projects.filter((p) => !p.scratch && p.items.length + (p.draft ? 0 : 1));       // drafts go along, each as a one-item project
    if (all.length) downloadFiles(all); else toast('There is nothing to download yet.', 2500);
  });
  $('home-reload').addEventListener('click', async () => {
    try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) { /* offline, or no saved copy */ }
    location.reload();
  });
  const built = (document.querySelector('script[src*="app.js"]').src.match(/v=(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)/) || []).slice(1);
  $('home-version').textContent = built.length ? `Version ${built[0]}.${built[1]}.${built[2]} ${built[3]}:${built[4]}` : '';
  $('tpl-close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !/^INPUT$/.test(e.target.tagName)) close(); });
  each('[data-tpl-tab]', (b) => b.addEventListener('click', () => { tplTab = b.dataset.tplTab; renderTemplates(); }));
  $('tpl-create').addEventListener('click', newFromTemplate);
  // Import: inside a project it opens the file picker; on the home screen it first asks item or project
  let importAs = 'item';
  const importMenu = $('import-menu');
  $('import-arrow').innerHTML = svgIcon('chevron');
  $('import-btn').addEventListener('click', (e) => {
    if (currentProject()) return $('home-import').click();
    e.stopPropagation();
    importMenu.hidden = !importMenu.hidden;
    keepOnScreen(importMenu);
  });
  each('[data-import]', (b) => b.addEventListener('click', () => { importAs = b.dataset.import; $('home-import').click(); }));
  document.addEventListener('click', () => { importMenu.hidden = true; });
  $('home-import').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (files.length) importFiles(files, importAs);
  });
  $('home-back').innerHTML = svgIcon('back');
  $('home-back').addEventListener('click', () => setOpen(null, null));
  $('new-item').addEventListener('click', async () => {
    const item = await addItem(currentProject());        // it joins the list; it is opened when you choose to
    renderHome();
    toast(`Added ${item.name}.`, 2000);
  });
  // A count with one name field per item. Pasting a list (a setlist copied from notes or
  // a spreadsheet) into any field fills that field and the ones after it, one line each,
  // and adds fields if the list is longer.
  const MOST = 60;
  const itemFields = (count, less, more, names, base) => {
    const howMany = () => Math.max(1, Math.min(MOST, Math.floor(+count.value) || 1));
    const fill = () => {
      const n = howMany();
      while (names.children.length > n) names.lastChild.remove();
      while (names.children.length < n) {
        const field = document.createElement('input');
        field.type = 'text'; field.maxLength = 60; field.autocomplete = 'off';
        field.placeholder = `Item ${base() + names.children.length + 1} name`;
        names.appendChild(field);
      }
    };
    const set = (n) => { count.value = Math.max(1, Math.min(MOST, n)); fill(); };
    less.innerHTML = svgIcon('minus');
    more.innerHTML = svgIcon('plus');
    less.addEventListener('click', () => set(howMany() - 1));
    more.addEventListener('click', () => set(howMany() + 1));
    count.addEventListener('input', fill);
    count.addEventListener('change', () => set(howMany()));
    names.addEventListener('paste', (e) => {
      const lines = ((e.clipboardData && e.clipboardData.getData('text')) || '').split(/[\r\n\t]+/)
        .map((line) => line.replace(/^\s*(?:\d+\s*[.):\-]|[-•*])\s*/, '').trim()).filter(Boolean);     // drops "1." or "-" in front
      if (lines.length < 2) return;                   // a single name pastes the usual way
      e.preventDefault();
      const from = Math.max(0, [...names.children].indexOf(e.target));
      set(Math.max(howMany(), from + lines.length));
      lines.slice(0, MOST - from).forEach((line, k) => { names.children[from + k].value = line.slice(0, 60); });
    });
    return { reset(n) { names.textContent = ''; set(n); }, names: () => [...names.children].map((field) => field.value.trim()) };
  };
  // a new project starts with as many items as asked for
  const starting = itemFields($('items-count'), $('items-less'), $('items-more'), $('items-names'), () => 0);
  $('new-project').addEventListener('click', () => starting.reset(1));
  // New item makes one; the arrow beside it opens a menu for adding several at once
  const several = itemFields($('many-count'), $('many-less'), $('many-more'), $('many-names'), () => currentProject().items.length);
  const manyDialog = $('items-new'), manyMenu = $('new-item-menu');
  const closeMany = () => { manyDialog.hidden = true; };
  $('new-item-more').innerHTML = svgIcon('chevron');
  $('many-close').innerHTML = svgIcon('close');
  $('new-item-more').addEventListener('click', (e) => { e.stopPropagation(); manyMenu.hidden = !manyMenu.hidden; keepOnScreen(manyMenu); });
  document.addEventListener('click', () => { manyMenu.hidden = true; });
  $('new-item-many').addEventListener('click', () => { several.reset(2); manyDialog.hidden = false; });
  $('many-close').addEventListener('click', closeMany);
  manyDialog.addEventListener('click', (e) => { if (e.target === manyDialog) closeMany(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMany(); });
  $('many-create').addEventListener('click', async () => {
    const project = currentProject(), names = several.names();
    for (const name of names) await addItem(project, name);
    closeMany();
    renderHome();
    toast(`Added ${names.length} item${names.length === 1 ? '' : 's'}.`, 3000);
  });
  each('[data-home-view]', (b) => {
    b.innerHTML = svgIcon('view' + b.dataset.homeView);
    b.addEventListener('click', () => { prefs.homeView = b.dataset.homeView; store.set('kdt-lighting-prefs-v1', prefs); renderHome(); });
  });
  $('home-play').insertAdjacentHTML('afterbegin', svgIcon('play'));
  $('home-play').addEventListener('click', () => {
    const project = currentProject();
    try { sessionStorage.setItem('slp-show', '1'); } catch (e) { /* no session storage */ }
    setOpen(project.id, project.items[0].id);
  });
  $('home-showset').addEventListener('click', () => editShowSettings(currentProject()));
  // on a phone the project's settings buttons fold into one Settings menu
  const settingsMenu = $('home-settings-menu');
  $('home-settings-arrow').innerHTML = svgIcon('chevron');
  $('home-settings-btn').addEventListener('click', (e) => { e.stopPropagation(); settingsMenu.hidden = !settingsMenu.hidden; keepOnScreen(settingsMenu); });
  document.addEventListener('click', () => { settingsMenu.hidden = true; });
  each('[data-go]', (b) => b.addEventListener('click', () => {
    if (b.dataset.go === 'home-showset' && !currentProject().items.length) return toast('Add an item first.', 2500);
    $(b.dataset.go).click();
  }));
  $('showset-close').innerHTML = svgIcon('close');
  $('showset-close').addEventListener('click', () => { $('showset').hidden = true; });
  $('showset').addEventListener('click', (e) => { if (e.target === $('showset')) $('showset').hidden = true; });
  buildLights();
  buildShare();
  refreshShared();
  $('home-lights').addEventListener('click', () => editLights(currentProject().name, currentProject(), saveProjects, kindsOf(projectLayout(currentProject()))));
  $('home-layout').addEventListener('click', () => {
    const project = currentProject();
    if (!project.items.length) return toast('Add an item first: the layout editor opens on one of the show\'s items.', 3500);
    try { sessionStorage.setItem('slp-layout', '1'); } catch (e) { /* no session storage */ }
    setOpen(project.id, project.items[0].id);
  });
  // Drafts: make or import an item without choosing a project yet
  $('draft-new').addEventListener('click', () => openTemplates(false, true));        // a draft needs a stage layout: choose it first
  $('pick-all').addEventListener('click', () => {
    const things = currentProject() ? currentProject().items : realProjects();
    if (picked.size === things.length) picked.clear(); else things.forEach((t) => picked.add(t.id));
    renderHome();
  });
  $('pick-download').addEventListener('click', async () => {
    const things = currentProject() ? currentProject().items : realProjects();
    const chosen = things.filter((t) => picked.has(t.id));
    if (chosen.length) await downloadFiles(chosen);
    if (!currentProject()) for (const draft of draftProjects()) if (picked.has(draft.items[0].id)) await downloadFiles(draft.items, draft);
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
  if (currentItemId) audioStore.get(currentItemId).then((file) => { if (file) loadTrack(file, true); }).then(() => { if (showRun) showBegin(); });
  // The bar shows "project / item"; items are renamed from their card in the project.
  $('bar-project').textContent = show.projectName || '';
  // The arrow beside the name lists the project's items, to go straight to another one.
  const others = currentProject() && !currentProject().draft && !currentProject().scratch ? currentProject().items : [];
  $('bar-items').hidden = others.length < 2;
  $('bar-items').addEventListener('click', (e) => {
    e.stopPropagation();
    popMenu($('bar-items'), others.map((it, i) => [`${i + 1}. ${it.name}`, () => {
      if (it.id === currentItemId) return;
      saveThumbnail();
      setOpen(currentId, it.id);
    }, it.id === currentItemId]));
  });
  // Click the item's name to rename it in place.
  const label = $('bar-item'), item = currentItem();
  label.textContent = item ? item.name : '';
  label.title = 'Rename This Item';
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
let layoutAsked = false;
try { layoutAsked = !!sessionStorage.getItem('slp-layout'); } catch (e) { /* no session storage */ }
const atHome = !currentItemId;             // no item open: show the project list, or a project's items
document.body.classList.toggle('at-home', atHome);
$('home').hidden = !atHome;
if (atHome) buildHome();
else if (layoutAsked) enterLayout();          // came from the project page's Edit stage layout
setupGrips();
try { buildThree(); } catch (e) { /* no WebGL here: the rest of the app still works */ }
applyPrefs();
sizeFront(); sizeWave();
window.addEventListener('resize', () => { sizeFront(); sizeWave(); });
// the track bar can change width without the window changing (text beside it, panels): keep its drawing sharp
if (window.ResizeObserver) new ResizeObserver(() => { if (wave.clientWidth && wave.clientWidth !== waveW) sizeWave(); }).observe(wave);

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
// First visits: ask what the person is here for, then walk them through the screen they are on.
buildTours();
buildTips();
buildSelects();
buildShowRun();
setTimeout(() => {
  if (atHome && !currentId && !prefs.role) $('role').hidden = false;
  else if (atHome && !currentId && !prefs.tourHome && TOURS[prefs.role]) startTour(prefs.role);
  else if (!atHome && !layoutAsked && !showRun && !prefs.tourEditor) startTour('editor');
}, 500);

// Installable app: keep a copy of the files on the device so it opens offline.
// Only on the live site; a local preview should always show the files on disk.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
