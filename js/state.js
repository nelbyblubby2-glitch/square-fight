// ── Canvas / context (set up after DOM load) ─────────────────────────────────
let canvas, ctx;
let canvasScale = 1;

// ── Arena bounds ─────────────────────────────────────────────────────────────
// 1. Choose your desired Arena Size
const arenaW = 400; 
const arenaH = 400;

// 2. Calculate X to center it: (VirtualWidth - ArenaWidth) / 2
// (1600 - 400) / 2 = 600
const arenaX = (VIRTUAL_WIDTH - arenaW) / 2;

// 3. Set Y to create a gap:
// The HUD usually ends around Y=150. Setting Y=200 gives a 50px gap.
const arenaY = 540; 

// 4. Update the arena object
const arena = { 
  x: arenaX, 
  y: arenaY, 
  w: arenaW, 
  h: arenaH 
};

// ── Settings ──
const ARENA_MARGIN = 30;  // The "small gap" on left, right, and bottom
const HUD_GAP      = 180; // The gap at the top for your HP bars/UI

// ── Entity lists ──────────────────────────────────────────────────────────────
let squares        = [];
let projectiles    = [];
let companions     = [];
let giantSquares   = [];
let pulses         = [];
let followingPulses = [];
let particles      = [];
let floatingNumbers  = [];
let clones         = [];
let brownSpikes    = [];

let limeProjectiles = [];
let grayStaticClones = [];   // Gray's freeze-trap clones
let goldConstructs   = [];   // Gold's static healing constructs
let mistProjectiles  = [];   // Mist's triple-shot projectiles
let bluePulses   = [];   // Blue's exploding projectile pulses

// ── Game state ────────────────────────────────────────────────────────────────
let currentScreen    = "battle";
let selectedIds      = [1, 2];
let gameOver         = false;
let winnerText       = "";
let freezeTimer      = 0;
let winDelayTimer    = 0;
let winScreenVisible = false;

// ── Resize Logic ──
function resize() {
  if (!canvas) return;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // 1. Measure where the HUD actually ends so we never draw over it.
  const hud = document.getElementById("hud");
  const hudBottom = hud ? hud.getBoundingClientRect().bottom : 0;

  // 2. The usable area for the arena is:
  //    - horizontally: ARENA_MARGIN gap on each side
  //    - vertically:   ARENA_MARGIN gap below the HUD, ARENA_MARGIN gap at the bottom
  const availW = screenW - 2 * ARENA_MARGIN;
  const availH = screenH - hudBottom - 2 * ARENA_MARGIN;

  canvasScale = Math.min(availW / arenaW, availH / arenaH);

  // 3. Set internal resolution (unchanged — game logic always uses virtual coords)
  canvas.width  = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;

  // 4. Centre arena horizontally; pin arena top to (hudBottom + ARENA_MARGIN).
  const arenaCX     = arenaX + arenaW / 2;
  const canvasLeft  = screenW / 2 - arenaCX * canvasScale;
  const canvasTop   = hudBottom + ARENA_MARGIN - arenaY * canvasScale;

  canvas.style.width    = (VIRTUAL_WIDTH  * canvasScale) + "px";
  canvas.style.height   = (VIRTUAL_HEIGHT * canvasScale) + "px";
  canvas.style.position = "absolute";
  canvas.style.left     = canvasLeft + "px";
  canvas.style.top      = canvasTop  + "px";
}
