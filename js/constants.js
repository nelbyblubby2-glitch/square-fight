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

// ── Virtual Resolution ──
const VIRTUAL_WIDTH = 2560;
const VIRTUAL_HEIGHT = 1440;

// ── Character definitions ────────────────────────────────────────────────────
const squareDefs = {
  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 1: BASE COLORS & SHADES
  // ═══════════════════════════════════════════════════════════════════════════
  1:  { name: "Red",      color: "#ff3333", type: "red",      desc: "Every direct collision grants +1 Clash Damage. (Cooldown: 3s)" },
  2:  { name: "Green",    color: "#00ff44", type: "green",    desc: "Shoots projectiles every 4s. Every 3rd hit landed increases the projectile count by +1." },
  3:  { name: "Blue",     color: "#33a8ff", type: "blue",     desc: "Shoot projectiles that explode on impact every 5s. Increase explosion size and +2 damage increase per hit." },
  4:  { name: "Yellow",   color: "#ffec3e", type: "yellow",   desc: "Gain +1 speed per bounce. Speed cap starts at 3. Each hit on enemy permanently raises cap by +0.5." },
  5:  { name: "Orange",   color: "#ff9f00", type: "orange",   desc: "Hitting walls shoots a square pulse that expands. Deals 2 dmg to anyone it touches." },
  6:  { name: "Purple",   color: "#b33eff", type: "purple",    desc: "Hits apply poison (2 dmg/s). Every 4th bounce (wall/enemy) adds +1s to your poison duration." },
  7:  { name: "Pink",     color: "#ff69b4", type: "pink",     desc: "Shoot projectiles that bounce on walls (+1 Delayed Damage). Enemy hits trigger a Pulse that deals delayed damage. (Cooldown: 8s)" },
  8:  { name: "Lime",     color: "#aaff00", type: "lime",     desc: "Fires a slow bouncing projectile that trails a tether line. Hit enemy gets reeled in; each wall bounce while pulled deals escalating damage. Enemy can't touch Lime while being pulled. (Cooldown: 5s after pull completes)" },
  9:  { name: "Cyan",     color: "#00ffff", type: "cyan",     desc: "Every 6.5s, summons a giant square from outside the walls targeting the enemy for 12 Damage." },
  10: { name: "Magenta",  color: "#ff00ff", type: "magenta",  desc: "Every 4.5s, fires a beam that tethers the enemy for 4s. While linked, 100% of any damage Magenta takes is reflected back to the enemy. Clash pauses the cooldown." },
  11: { name: "Violet",   color: "#9b5de5", type: "violet",   desc: "Every 5s, stops to charge a high-precision laser. Deals 20 damage if it hits." },
  12: { name: "Indigo",   color: "#786fa6", type: "indigo",   desc: "Shoots projectiles every 2s dealing 1 dmg. Hits bounce and turn into a 1-HP copy after 1s." },
  13: { name: "Scarlet",  color: "#d91e36", type: "scarlet",  desc: "On Clash: Store 4 delayed damage on enemy + count 1 toward shot. Every 7 clashes or wall bounces: Shoot a bullet that detonates all stored damage on hit." },
  14: { name: "Crimson",  color: "#e60000", type: "crimson",  desc: "On Clash: Apply bleed to enemy (4s + 1s per 10 HP lost) and heal +1 HP (5s cooldown, heals scale with HP lost)." },
  15: { name: "White",    color: "#ffffff", type: "white",    desc: "Spawns a companion. Hit White to buff its Speed temporarily and increase Damage by +1. Companion deals 3 Damage." },
  16: { name: "Gray",     color: "#b0b0b0", type: "gray",     desc: "Deals +4 base Clash Damage. Shoots a projectile every 4s that deals 4 damage." },
  17: { name: "Brown",    color: "#d28a4e", type: "brown",    desc: "Wall bounces place a spike on the wall. Enemies touching a spike take 1 dmg. Each hit on an enemy permanently increases Brown's knockback." },
  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP 2: DYNAMIC ELEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  18: { name: "Sky",      color: "#80d4ff",                                        type: "sky",      desc: "Wall bounces create a clone (Cooldown: 3s). Clones deal 1 dmg on contact. Each enemy hit increases clone damage by +1." },
  19: { name: "Mist",     color: "#d7eeff", color2: "#7ab8ff",                   type: "mist",     desc: "Shoots 3 projectiles in a tiny arc every 2s, each dealing 1 dmg. After hitting the enemy 3 times, teleports to a random free spot in the arena." },
  20: { name: "Gold",     color: "#f1c40f", color2: "#fffaaa", color3: "#f1c40f", type: "gold",     desc: "Clashing with the enemy drops 2 Gold Coins. Collecting a coin grants +50% speed for 2s and fires a projectile dealing 4 damage." },
  21: { name: "Silver",   color: "#e2e8f0", color2: "#8899aa", color3: "#e2e8f0", type: "silver",   desc: "Starts with +3 Clash Damage (4 total). Passively spawns small Silver pickups in the arena every 4s (max 4). Collecting one grants immunity to the next hit." },
  22: { name: "Bronze",   color: "#b87333", color2: "#ffcc66",                   type: "bronze",   desc: "Starts with 2 charges. Every 2s, spends a charge to fire a piercing stick (18 dmg) that embeds in walls. Walk over your own sticks to recover a charge." },
  23: { name: "Ruby",     color: "#ff1493", color2: "#cc0000",                   type: "ruby",     desc: "Shoots a projectile that bounces exactly once off a wall in a random direction every 4s. A searing laser line connects the bounce point. Crossing the line deals 2 Damage." },
  24: { name: "Sapphire", color: "#2255cc", color2: "#00aaff",                   type: "sapphire", desc: "When hit, Heal +4 HP, +8px Size, and +1 Damage. (Cooldown: 4s)" },
  25: { name: "Emerald",  color: "#00ff88", color2: "#00ffff",                   type: "emerald",  desc: "Every 6s, locks completely in place for 2s to fire a rapid-fire barrage of 12 projectiles toward the enemy. Each bullet deals 2 damage." },
  26: { name: "Topaz",    color: "#fff200", color2: "#ffaa00", color3: "#fff200", type: "topaz",    desc: "Every 10s, drops a construct (max 3). Constructs heal +3 HP when the enemy hits them. Oldest construct removed when limit is exceeded. Starts with +3 Clash Damage." },
  27: { name: "Jade",     color: "#00a86b", color2: "#99ffd6",                   type: "jade",     desc: "Every 0.3s, leaves a static clone that lasts 1.5s. Enemy touching the clone gets frozen for 2.5s and triggers a chase. Frozen enemies take 10 dmg (+6 base Clash Damage) when hit. Slightly faster than others." },
};