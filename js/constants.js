// ── Game constants ──────────────────────────────────────────────────────────
const SIZE             = 50;
const BASE_SPEED       = 3.2;
const BOOST_SPEED      = 8.5;
const PROJECTILE_SPEED = 9.5;
const COOLDOWN_FRAMES  = 240;
const ACTION_COOLDOWN  = 360;
const SHOT_GAP         = 8;
const FREEZE_DURATION  = 4;
const HIT_IMMUNITY     = 15;
const GRAY_SPEED       = 3.8;   // slightly faster than BASE_SPEED (3.2)

// ── Virtual Resolution ──
const VIRTUAL_WIDTH = 2560;
const VIRTUAL_HEIGHT = 1440;

// ── Character definitions ────────────────────────────────────────────────────
const squareDefs = {
  // --- THE TOP THREE PRIMARIES (High Contrast Neon) ---
  1:  { name: "Red",      color: "#ff3333", type: "red",      desc: "Every direct collision grants +1 Clash Damage. (Cooldown: 3s)" },
  2:  { name: "Green",    color: "#00ff44", type: "green",    desc: "Shoots projectiles every 4s. Every 3rd hit landed increases the projectile count by +1." },
  3:  { name: "Blue",     color: "#33a8ff", type: "blue",     desc: "Shoot projectiles that explode on impact every 5s. Increase explosion size and +2 damage increase per hit." },

  // --- STANDARD COMMON COLORS (Bright & Crisp) ---
  4:  { name: "Yellow",   color: "#ffec3e", type: "yellow",   desc: "Gain +1 speed per bounce. Speed cap starts at 3. Each hit on enemy permanently raises cap by +0.5." },
  5:  { name: "Orange",   color: "#ff9f00", type: "orange",   desc: "Hitting walls shoots a square pulse that expands. Deals 2 dmg to anyone it touches." },
  6:  { name: "Purple",   color: "#b33eff", type: "purple",   desc: "Hits apply poison (2 dmg/s). Every 4th bounce (wall/enemy) adds +1s to your poison duration." },
  7:  { name: "Pink",     color: "#ff69b4", type: "pink",     desc: "Shoot projectiles that bounce on walls (+1 Delayed Damage). Enemy hits trigger a Pulse that deals delayed damage. (Cooldown: 8s)" },
  8:  { name: "White",    color: "#ffffff", type: "white",    desc: "Spawns a companion. Hit White to buff its Speed temporarily and increase Damage by +1. Companion deals 3 Damage." },
  9:  { name: "Gray",     color: "#b0b0b0", type: "gray",     desc: "Deals +3 base Clash Damage. Shoots a projectile every 4s that deals 3 damage." },
  10: { name: "Brown",    color: "#d28a4e", type: "brown",    desc: "Wall bounces place a spike on the wall. Enemies touching a spike take 1 dmg. Each hit on an enemy permanently increases Brown's knockback." },

  // --- RARE ELEMENTS & VIBRANT SHADES (Radiant Glow) ---
  11: { name: "Scarlet",  color: "#d91e36", type: "scarlet",  desc: "On Clash: Store 4 delayed damage on enemy + count 1 toward shot. Every 7 clashes or wall bounces: Shoot a bullet that detonates all stored damage on hit." },
  12: { name: "Gold",     color: "#f1c40f", type: "gold",     desc: "Clashing with the enemy drops 2 Gold Coins. Collecting a coin grants +50% speed for 2s and fires a projectile dealing 4 damage." },
  13: { name: "Lime",     color: "#aaff00", type: "lime",     desc: "Fires a slow bouncing projectile that trails a tether line. Hit enemy gets reeled in; each wall bounce while pulled deals escalating damage. Enemy can't touch Lime while being pulled. (Cooldown: 5s after pull completes)" },
  14: { name: "Cyan",     color: "#00ffff", type: "cyan",     desc: "Every 6.5s, summons a giant square from outside the walls targeting the enemy for 12 Damage." },
  15: { name: "Sky",      color: "#80d4ff", type: "sky",      desc: "Wall bounces create a clone (Cooldown: 3s). Clones deal 1 dmg on contact. Each enemy hit increases clone damage by +1." },
  16: { name: "Indigo",   color: "#786fa6", type: "indigo",   desc: "Shoots projectiles every 2s dealing 1 dmg. Hits bounce and turn into a 1-HP copy after 1s." },
  17: { name: "Violet",   color: "#9b5de5", type: "violet",   desc: "Every 5s, stops to charge a high-precision laser. Deals 20 damage if it hits." },
  18: { name: "Magenta",  color: "#ff00ff", type: "magenta",  desc: "Every 4.5s, fires a beam that tethers the enemy for 4s. While linked, 100% of any damage Magenta takes is reflected back to the enemy. Clash pauses the cooldown." },
  19: { name: "Mist",     color: "#e3f2fd", type: "mist",     desc: "Shoots 3 projectiles in a tiny arc every 2s, each dealing 1 dmg. After hitting the enemy 3 times, teleports to a random free spot in the arena." },

  // --- HIGH-SPECIFIC ULTRA GEMSTONES & PRECIOUS TINTS (Deep Luxury Colors) ---
  20: { name: "Ruby",     color: "#ff1493", type: "ruby",     desc: "Shoots a projectile that bounces exactly once off a wall in a random direction every 4s. A searing laser line connects the bounce point. Crossing the line deals 2 Damage." },
  21: { name: "Sapphire", color: "#2255cc", type: "sapphire", desc: "When hit, Heal +4 HP, +8px Size, and +1 Damage. (Cooldown: 4s)" },
  22: { name: "Emerald",  color: "#00ff88", type: "emerald",  desc: "Every 6s, locks completely in place for 2s to fire a rapid-fire barrage of 12 projectiles toward the enemy. Each bullet deals 2 damage." },
  23: { name: "Topaz",    color: "#fff200", type: "topaz",    desc: "Every 10s, drops a construct (max 3). Constructs heal +3 HP when the enemy hits them. Oldest construct removed when limit is exceeded. Starts with +3 Clash Damage." },
  24: { name: "Crimson",  color: "#e60000", type: "crimson",  desc: "On Clash: Apply bleed to enemy (4s + 1s per 10 HP lost) and heal +1 HP (5s cooldown, heals scale with HP lost)." },
  25: { name: "Jade",     color: "#00a86b", type: "jade",     desc: "Every 0.3s, leaves a static clone that lasts 1.5s. Enemy touching the clone gets frozen for 3s. Frozen enemies take 10 dmg when hit. Slightly faster than others." },
};