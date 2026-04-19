// ── Canvas / context (set up after DOM load) ─────────────────────────────────
let canvas, ctx;

// ── Arena bounds ─────────────────────────────────────────────────────────────
const arena = { x: 0, y: 0, w: 0, h: 0 };

// ── Entity lists ──────────────────────────────────────────────────────────────
let squares        = [];
let projectiles    = [];
let companions     = [];
let giantSquares   = [];
let pulses         = [];
let followingPulses = [];
let particles      = [];
let floatingTexts  = [];
let clones         = [];
let brownSpikes    = [];

let limeProjectiles = [];
let grayStaticClones = [];   // Gray's freeze-trap clones
let goldConstructs   = [];   // Gold's static healing constructs
let mistProjectiles  = [];   // Mist's triple-shot projectiles

// ── Game state ────────────────────────────────────────────────────────────────
let currentScreen    = "battle";
let selectedIds      = [1, 2];
let gameOver         = false;
let winnerText       = "";
let freezeTimer      = 0;
let winDelayTimer    = 0;
let winScreenVisible = false;

// ── Resize: recalculate arena from window size ────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const size = Math.min(canvas.width, canvas.height) * 0.6;
  arena.w = size;
  arena.h = size;
  arena.x = (canvas.width  - size) / 2;
  arena.y = (canvas.height - size) / 2 + 50;
}
