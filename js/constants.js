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

// ── Character definitions ────────────────────────────────────────────────────
const squareDefs = {
  1:  { name: "Red",    color: "#ff3e3e", type: "red",    desc: "Every direct collision grants +1 Permanent Damage and +1 Power to the Red square." },
  2:  { name: "Green",  color: "#00ff44", type: "green",  desc: "Shoots projectiles every 3s. Every hit landed permanently increases the next burst by +1 projectile." },
  3:  { name: "Blue",   color: "#3ea8ff", type: "blue",   desc: "When hit, gain +4 HP, +8px Size, and +1 Damage. (Cooldown: 4s)" },
  4:  { name: "Yellow", color: "#ffec3e", type: "yellow", desc: "Gain speed per bounce. Max starting dmg is 5. Each hit on enemy permanently increases your speed cap." },
  5:  { name: "White",  color: "#ffffff", type: "white",  desc: "Spawns a companion. Hit White to buff its Speed temporarily and increase Damage by +1. Companion deals 3 Damage." },
  6:  { name: "Cyan",   color: "#00ffff", type: "cyan",   desc: "Every 6.5s, summons a giant square from outside the walls targeting the enemy for 12 Damage." },
  7:  { name: "Purple", color: "#b33eff", type: "purple", desc: "Hits apply poison (2 dmg/s). Every 4th bounce (wall/enemy) adds +1s to your poison duration." },
  8:  { name: "Violet", color: "#8a2be2", type: "violet", desc: "Every 5s, stops to charge a high-precision laser. Deals 20 damage if it hits." },
  9:  { name: "Orange", color: "#ffa500", type: "orange", desc: "Hitting walls shoots a square pulse that expands. Deals 2 dmg to anyone it touches." },
  10: { name: "Indigo", color: "#6C5CE7", type: "indigo", desc: "Shoots projectiles every 2s dealing 1 dmg. Hits bounce and turn into a 1-HP copy after 1s." },
  11: { name: "Pink",   color: "#ff69b4", type: "pink",   desc: "Shoot projectiles that bounce on walls (+1 Delayed Damage). Enemy hits trigger a Pulse that deals delayed damage. (Cooldown: 8s)" },
  12: { name: "Brown",  color: "#c07840", type: "brown",  desc: "Wall bounces place a spike on the wall. Enemies touching a spike take 1 dmg. Each hit on an enemy permanently increases Brown's knockback." },
  13: { name: "Sky",    color: "#87ceeb", type: "sky",    desc: "Wall bounces create a clone (Cooldown: 3s). Clones deal 1 dmg on contact. Each enemy hit increases clone damage by +1." },
  14: { name: "Lime",   color: "#aaff00", type: "lime",   desc: "Fires a slow bouncing projectile that trails a tether line. Hit enemy gets reeled in; each wall bounce while pulled deals escalating damage. Enemy can't touch Lime while being pulled. (Cooldown: 5s after pull completes)" },
  15: { name: "Scarlet",color: "#cc1a1a", type: "scarlet",desc: "On Clash: Apply 3s Bleed (1 dmg/s). Every 3s: Shoot a fast bullet that instantly triggers all Bleed on hit." },
  16: { name: "Gray",   color: "#acacac", type: "gray",   desc: "Every 0.3s, leaves a static clone that lasts 1.5s. Enemy touching the clone gets frozen for 3s. Frozen enemies take 10 dmg when hit. Slightly faster than others." },
  17: { name: "Gold",   color: "#FFD700", type: "gold",   desc: "Every 10s, drops a construct (max 3). Constructs heal Gold +2 HP when the enemy hits them. Oldest construct removed when limit is exceeded." },
  18: { name: "Mist",   color: "#F0F8FF", type: "mist",   desc: "Shoots 3 projectiles in a tiny arc every 2s, each dealing 1 dmg. After hitting the enemy 3 times, teleports to a random free spot in the arena." },
};
