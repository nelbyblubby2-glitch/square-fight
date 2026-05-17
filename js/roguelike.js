// ══════════════════════════════════════════════════════════════════════════════
// ROGUELIKE MODE — js/roguelike.js
// ══════════════════════════════════════════════════════════════════════════════
// rogueState holds the persistent player stats across floors.
// Each floor is a normal Square battle (squares[0] = player, squares[1] = enemy AI).
// The player starts with 100 HP and 1 Power (damage multiplier added to base dmg).
// Red's passive: every clash → +1 permanent clash damage (same mechanic as SF).
// ══════════════════════════════════════════════════════════════════════════════

let rogueState = null;

// ── Roguelike square definitions (separate from squareDefs HP which is 100) ──
const rogueDefs = {
  1: {
    name: "Red",
    color: "#ff3e3e",
    type: "red",
    startHP: 100,
    startPower: 1,
    passiveDesc: "Every direct collision grants +1 Clash Damage. (Cooldown: 3s)",
  },
  2: {
    name: "Green",
    color: "#00ff44",
    type: "green",
    startHP: 100,
    startPower: 1,
    passiveDesc: "Shoot projectiles every 4s. Every 3rd hit landed increases the projectile count by +1.",
  },
  4: {
    name: "Yellow",
    color: "#ffec3e",
    type: "yellow",
    startHP: 100,
    startPower: 1,
    passiveDesc: "Wall bounces accelerate +1 speed. Damage scales with speed. Enemy hits raise speed cap by +0.5 and acceleration by +0.08.",
  },
  3: {
    name: "Blue",
    color: "#3ea8ff",
    type: "blue",
    startHP: 100,
    startPower: 1,
    passiveDesc: "Shoot projectiles that explode on impact every 5s. Increase explosion size and +2 damage increase per hit.",
  },
  5: {
    name: "Orange",
    color: "#ff9f00",
    type: "orange",
    startHP: 100,
    startPower: 1,
    passiveDesc: "Hitting walls releases an expanding pulse that deals 1 damage.",
  },
};

// Enemy progression per floor
const rogueEnemies = [
  { id: 1,  hpScale: 1   },
  { id: 2,  hpScale: 1   },
  { id: 3,  hpScale: 1   },
  { id: 10, hpScale: 1.5 },
  { id: 5,  hpScale: 1.5 },
  { id: 6,  hpScale: 2   },
  { id: 4,  hpScale: 2   },
  { id: 8,  hpScale: 2.5 },
  { id: 7,  hpScale: 2.5 },
  { id: 9,  hpScale: 3   },
];

// ── Start a roguelike run ─────────────────────────────────────────────────────
function selectRogueChar(charId) {
  const def = rogueDefs[charId];
  if (!def) return;
  rogueState = {
    charId,
    floor: 1,
    hp: def.startHP,
    maxHp: def.startHP,
    power: def.startPower,
    clashBonus: 0,          // Red's accumulated clash damage bonus (resets each floor)
    permClashBonus: 0,      // permanent clash bonus from upgrades (never resets)
    upgradePicks: {},       // tracks how many times each limited upgrade was taken
    sizeBonus: 0,           // cumulative size multiplier (0.2 per pick)
    speedBonus: 0,          // added to BASE_SPEED
    noPassiveCooldown: false,
    passiveClashPerHit: 1,  // default +1 per clash; upgrade raises this
    hitTriggersChase: false,
    def,
    // Yellow-specific
    yellowSizeShrink: 0,    // cumulative shrink factor (0.2 per pick, up to 4)
  };
  startRogueFloor();
}

// ── Start a roguelike run (alias for select screen card click) ────────────────
function startRogueRun(charId) {
  selectRogueChar(charId);
}

// ── Start the current floor ───────────────────────────────────────────────────
function startRogueFloor() {
  if (!rogueState) return;

  // Pick enemy for this floor
  const floorIdx = Math.min(rogueState.floor - 1, rogueEnemies.length - 1);
  const enemyDef = rogueEnemies[floorIdx];

  selectedIds[0] = rogueState.charId;
  selectedIds[1] = enemyDef.id;

  // Show screen FIRST so HUD is visible before resize() measures hudBottom
  showScreen("rogue-run");

  // Defer resize()+reset by one frame so the browser has time to reflow the HUD.
  // getBoundingClientRect() returns stale 0 if called synchronously right after
  // display:none→flex, which would mis-position the arena under the HUD.
  requestAnimationFrame(() => {
    _resetRogueBattle();
    _applyRogueStats(enemyDef);
  });
}

// ── Reset battle entities for rogue floor ─────────────────────────────────────
function _resetRogueBattle() {
  resize();
  companions    = [];
  clones        = [];
  brownSpikes   = [];
  limeProjectiles  = [];
  grayStaticClones = [];
  goldConstructs   = [];
  mistProjectiles  = [];
  bluePulses   = [];
  squares       = [new Square(selectedIds[0], "left"), new Square(selectedIds[1], "right")];
  projectiles   = [];
  giantSquares  = [];
  pulses        = [];
  followingPulses = [];
  particles     = [];
  floatingNumbers = [];
  gameOver        = false;
  freezeTimer     = 0;
  winDelayTimer   = 0;
  window.winScreenVisible = false;
  document.getElementById("win-overlay").style.display = "none";
  document.getElementById("win-content").style.display = "none";
}

// ── Override HP and stats from rogueState ─────────────────────────────────────
function _applyRogueStats(enemyDef) {
  if (!rogueState || squares.length < 2) return;
  const player = squares[0];
  const enemy  = squares[1];

  // ── Player: use saved HP ──
  player.maxHp = rogueState.maxHp;
  player.hp    = rogueState.hp;

  // Power: adds to bonusDamage base
  player.bonusDamage = (rogueState.power - 1) + rogueState.clashBonus + (rogueState.permClashBonus || 0);

  // ── Enemy: scale down to roguelike HP (base 50, scaled) ──
  const enemyBaseHP = Math.round(50 * enemyDef.hpScale);
  enemy.maxHp = enemyBaseHP;
  enemy.hp    = enemyBaseHP;

  // Apply size upgrade
  if (rogueState.sizeBonus > 0) {
    player.size = Math.round(SIZE * (1 + rogueState.sizeBonus));
  }

  // Apply speed upgrade — set currentSpeed then re-normalize vx/vy to match
  player._rogueSpeedBonus = rogueState.speedBonus || 0;
  player.currentSpeed = BASE_SPEED + player._rogueSpeedBonus;
  player.normalizeVelocity();

  // Patch Red's passive upgrades
  if (rogueState.charId === 1) {
    player._rogueClashHook        = true;
    player._rogueNoPassiveCD      = rogueState.noPassiveCooldown || false;
    player._roguePassivePerHit    = rogueState.passiveClashPerHit || 1;
    player._rogueHitTriggersChase = rogueState.hitTriggersChase || false;
    player._hitChaseCharge        = 0;  // reset hit counter each floor
    player._rogueClashSizeStreak  = rogueState.clashSizeStreak || false;
    player._roguePassiveOnHit     = rogueState.passiveOnHit || false;
    player._rogueSpeedOnBigClash  = rogueState.speedOnBigClash || false;
    player._rogueEmergencyHeal    = rogueState.emergencyHeal || false;
    player._rogueEmergencyHealUsed = false; // reset each floor
    player._rogueClashHealAmt     = rogueState.clashHeal || 0;
    player._rogueLowHpDoublePassive = rogueState.lowHpDoublePassive || false;
    player._rogueBounceEmpowerThreshold = rogueState.bounceEmpowerThreshold || 0;
    player._rogueBounceCount      = 0;  // reset each floor
    player._rogueBounceEmpowered  = false;
  }

  // Patch Yellow's rogue upgrades
  if (rogueState.charId === 4) {
    // Passive overrides: speed cap = 3, cap growth = +0.5, wall boost = 1
    player.yellowSpeedCap  = 5 + (rogueState.speedBonus || 0);  // base cap is 3; speed upgrades raise it
    player.yellowCapGrowth = 1;
    player.yellowWallBoost = 0.5;
    // Apply shrink (size reduction)
    const shrink = rogueState.yellowSizeShrink || 0;
    if (shrink > 0) {
      player.size = Math.round(SIZE * (1 - shrink));
    }
    // Clash damage bonus from yellow upgrades
    player.bonusDamage = (rogueState.permClashBonus || 0);
    player._rogueYellowClashBonus = rogueState.permClashBonus || 0;
    // New yellow upgrades
    player._rogueYellowSpeedPulse     = rogueState.yellowSpeedPulse || false;
    player._rogueYellowAccelGainBonus = rogueState.yellowAccelGainBonus || 0;
    player._rogueYellowBounceShockwaveThreshold = rogueState.yellowBounceShockwaveThreshold || 0;
    player._rogueYellowBounceCount    = 0; // reset each floor
    player._rogueYellowClashHeal      = rogueState.yellowClashHeal || false;
    player._rogueYellowSpeedRetain    = rogueState.yellowSpeedRetain || false;
    player._rogueYellowSpeedClashDmg  = rogueState.yellowSpeedClashDmg || false;
    // Apply accel gain bonus
    if (player._rogueYellowAccelGainBonus > 0) {
      player.yellowAccelGain = (player.yellowAccelGain || 0.08) + player._rogueYellowAccelGainBonus;
    }
  }

  // Patch Green's rogue upgrades
  if (rogueState.charId === 2) {
    player._rogueSlowProjectile        = true;
    player._rogueFastProjectile        = rogueState.fastProjectile || false;
    player._rogueProjectileBounce      = rogueState.projectileBounceBonus || 0;
    player._rogueProjectileDamageBonus = rogueState.projectileDamageBonus || 0;
    player.projectileCount = 1 + (rogueState.projectileCountBonus || 0);
    // New upgrades
    player._roguePassiveThresholdReduction = rogueState.passiveThresholdReduction || 0;
    player._rogueHitProcShot               = rogueState.hitProcShot || false;
    player._rogueShootCooldownReduction    = rogueState.shootCooldownReduction || 0;
    player._rogueMilestoneShotThreshold    = rogueState.milestoneShotThreshold || 0; // 0 = disabled
    player._rogueTotalHitCount             = 0; // resets each floor
    // New upgrades
    player._rogueProjectileHeal            = rogueState.projectileHeal || 0;
    player._rogueProjectileFlip            = rogueState.projectileFlip || false;
    // Don't touch bonusDamage — that would affect clash damage too
  }

  // Patch Blue's rogue upgrades
  if (rogueState.charId === 3) {
    player.projectileCount = 1 + (rogueState.projectileCountBonus || 0);
    player._rogueBlueEmpoweredShot = rogueState.blueEmpoweredShot || false;
    player._blueShootCount = 0; // resets each floor
    player._rogueBlueBounce = rogueState.blueBounce || false;
    // Apply passive dmg bonus: seed blueHits with the bonus so it affects base dmg
    player.blueHits = rogueState.bluePassiveDmgBonus || 0;
    // No longer use bonusDamage for blue
    player.bonusDamage = 0;
    // New blue upgrades
    player._rogueBlueBlastRadius       = rogueState.blueBlastRadius || false;
    player._rogueBlueCondenser         = rogueState.blueCondenser || 0;
    player._rogueBlueSplinterThreshold = rogueState.blueSplinterThreshold || 0;
    player._rogueBlueSplinterCount     = 0;
    player._rogueBluePressureRelease   = rogueState.bluePressureRelease || false;
    player._rogueBluePressureUsed      = false;
    player._rogueBlueSingularity       = rogueState.blueSingularity || false;
  }

  // Patch Yellow stop shockwave
  if (rogueState.charId === 4) {
    player._rogueYellowStopShockwave = rogueState.yellowStopShockwave || 0;
    player._rogueYellowStopShockwaveTriggered = false;
  }

  // Patch Orange's rogue upgrades
  if (rogueState.charId === 5) {
    player._rogueOrangeRadiationInterval = rogueState.orangeRadiationInterval || 0; // 0=off, 60=1s, 30=0.5s
    player._rogueOrangeRadiationTimer    = 0;
  }
}

// (Stats HUD removed — roguelike arena is identical to normal battle HUD)

// ── Upgrade definitions per character ────────────────────────────────────────
// Each entry: { id, name, desc, icon, limit (null=infinite, N=max picks), apply(state) }
// limit: null = infinite, number = max times this upgrade can be picked total per run
const charUpgradePools = {
  // ── RED ──
  1: [
    {
      id: "red_hp",
      name: "Vitality",
      desc: "Increase your maximum HP by 25.",
      icon: "1",
      limit: null,
      apply(state) {
        state.maxHp += 25;
      },
    },
    {
      id: "red_clash_dmg",
      name: "Power",
      desc: "Increase your clash damage by 2.",
      icon: "2",
      limit: null,
      apply(state) {
        state.permClashBonus = (state.permClashBonus || 0) + 2;
      },
    },
    {
      id: "red_size",
      name: "Mass",
      desc: "Increase your size by 50%.",
      icon: "3",
      limit: 2,
      apply(state) {
        state.sizeBonus = (state.sizeBonus || 0) + 0.5;
      },
    },
    {
      id: "red_passive_bonus",
      name: "Overwhelming Force",
      desc: "Your passive now grants +2 clash damage per clash instead of +1.",
      icon: "4",
      limit: 1,
      apply(state) {
        state.passiveClashPerHit = (state.passiveClashPerHit || 1) + 1;
      },
    },
    {
      id: "red_no_cd",
      name: "Fury",
      desc: "Your clash passive triggers every clash with no cooldown.",
      icon: "5",
      limit: 1,
      apply(state) {
        state.noPassiveCooldown = true;
      },
    },
    {
      id: "red_hit_chase",
      name: "Pursuit",
      desc: "When you take damage, activate chase regardless of cooldown. Does not trigger cooldown.",
      icon: "6",
      limit: 1,
      apply(state) {
        state.hitTriggersChase = true;
      },
    },
    {
      id: "red_speed",
      name: "Speed",
      desc: "Increase speed by 0.5.",
      icon: "7",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "red_clash_size_streak",
      name: "Combative Growth",
      desc: "Every consecutive clash within 2s increases your clash size by 20% temporarily.",
      icon: "8",
      limit: 1,
      apply(state) {
        state.clashSizeStreak = true;
      },
    },
    {
      id: "red_passive_on_hit",
      name: "Retaliation",
      desc: "Your clash passive also triggers when you take damage.",
      icon: "9",
      limit: 1,
      apply(state) {
        state.passiveOnHit = true;
      },
    },
    {
      id: "red_speed_on_big_clash",
      name: "Impact Burst",
      desc: "When dealing clash damage above 10, increase speed by 3 for 2s.",
      icon: "10",
      limit: 1,
      apply(state) {
        state.speedOnBigClash = true;
      },
    },
    {
      id: "red_emergency_heal",
      name: "Emergency Heal",
      desc: "When HP is at or below 20, heal +20 HP. Triggers once per fight.",
      icon: "11",
      limit: 1,
      apply(state) {
        state.emergencyHeal = true;
      },
    },
    {
      id: "red_clash_heal",
      name: "Siphon",
      desc: "On every clash, heal +1 HP.",
      icon: "12",
      limit: 2,
      apply(state) {
        state.clashHeal = (state.clashHeal || 0) + 1;
      },
    },
    {
      id: "red_low_hp_double_passive",
      name: "Cornered",
      desc: "While HP is below 30, your passive gain is doubled.",
      icon: "13",
      limit: 1,
      apply(state) {
        state.lowHpDoublePassive = true;
      },
    },
    {
      id: "red_bounce_empower",
      name: "Empowered Clash",
      desc: "Every 8th/7th/6th bounce (hitting enemy or wall) empowers your next clash for +10 damage.",
      icon: "14",
      limit: 3,
      apply(state) {
        // Each pick: start at 8, reduce by 1 per pick (8 → 7 → 6)
        state.bounceEmpowerPicks = (state.bounceEmpowerPicks || 0) + 1;
        state.bounceEmpowerThreshold = 9 - state.bounceEmpowerPicks; // 8, 7, 6
      },
    },
  ],

  // ── GREEN ──
  2: [
    {
      id: "green_hp",
      name: "Vitality",
      desc: "Increase your maximum HP by 25.",
      icon: "1",
      limit: null,
      apply(state) {
        state.maxHp += 25;
      },
    },
    {
      id: "green_speed",
      name: "Speed",
      desc: "Increase speed by 0.5.",
      icon: "2",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "green_proj_bounce",
      name: "Ricochet",
      desc: "Projectiles bounce off walls.",
      icon: "3",
      limit: 1,
      apply(state) {
        state.projectileBounceBonus = (state.projectileBounceBonus || 0) + 1;
      },
    },
    {
      id: "green_proj_damage_speed",
      name: "Sharpened Shot",
      desc: "Projectiles deal +1 damage.",
      icon: "4",
      limit: 1,
      apply(state) {
        state.projectileDamageBonus = (state.projectileDamageBonus || 0) + 1;
      },
    },
    {
      id: "green_proj_count",
      name: "Volley",
      desc: "Increase projectile count by 2.",
      icon: "5",
      limit: null,
      apply(state) {
        state.projectileCountBonus = (state.projectileCountBonus || 0) + 2;
      },
    },
    {
      id: "green_passive_threshold",
      name: "Focus",
      desc: "Reduce the number of hits required to gain +1 shot by 1.",
      icon: "6",
      limit: 2,
      apply(state) {
        state.passiveThresholdReduction = (state.passiveThresholdReduction || 0) + 1;
      },
    },
    {
      id: "green_hit_proc_shot",
      name: "Lucky Shot",
      desc: "Each projectile that hits the enemy has a 25% chance to fire 1 bonus projectile instantly. Does not affect shooting cooldown.",
      icon: "7",
      limit: 1,
      apply(state) {
        state.hitProcShot = true;
      },
    },
    {
      id: "green_cooldown_reduction",
      name: "Rapid Fire",
      desc: "Reduce shooting cooldown by 1 second.",
      icon: "8",
      limit: 2,
      apply(state) {
        state.shootCooldownReduction = (state.shootCooldownReduction || 0) + 1;
      },
    },
    {
      id: "green_milestone_shot",
      name: "Apex Shot",
      desc: "Every 8th/7th/6th projectile hit fires a medium-sized projectile dealing damage equal to your current hit count. Does not affect shooting cooldown.",
      icon: "9",
      limit: 3,
      apply(state) {
        state.milestoneShotPicks = (state.milestoneShotPicks || 0) + 1;
        // 8 → 7 → 6 as picks increase
        state.milestoneShotThreshold = 9 - state.milestoneShotPicks;
      },
    },
    {
      id: "green_proj_heal",
      name: "Life Steal",
      desc: "When a projectile hits the enemy, heal +1 HP.",
      icon: "10",
      limit: 1,
      apply(state) {
        state.projectileHeal = (state.projectileHeal || 0) + 1;
      },
    },
    {
      id: "green_proj_flip",
      name: "Inversion",
      desc: "When a projectile hits the enemy, flip their velocity. Does not trigger action cooldown.",
      icon: "11",
      limit: 1,
      apply(state) {
        state.projectileFlip = true;
      },
    },
  ],

  // ── YELLOW ──
  4: [
    {
      id: "yellow_hp",
      name: "Vitality",
      desc: "Increase your maximum HP by 25.",
      icon: "1",
      limit: null,
      apply(state) {
        state.maxHp += 25;
      },
    },
    {
      id: "yellow_speed",
      name: "Speed",
      desc: "Increase speed by 0.5.",
      desc: "Your base movement speed and speed cap both increase by 0.5.",
      icon: "2",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "yellow_clash_dmg",
      name: "Power",
      desc: "Increase clash damage by 2.",
      icon: "3",
      limit: null,
      apply(state) {
        state.permClashBonus = (state.permClashBonus || 0) + 2;
      },
    },
    {
      id: "yellow_shrink",
      name: "Aerodynamics",
      desc: "Decrease square size by 20% and increase speed cap by 2.",
      icon: "4",
      limit: 3,
      apply(state) {
        state.yellowSizeShrink = (state.yellowSizeShrink || 0) + 0.2;
        state.speedBonus = (state.speedBonus || 0) + 2;
      },
    },
    {
      id: "yellow_speed_pulse",
      name: "Sonic Pulse",
      desc: "When at 5 speed or higher, release a pulse on every wall bounce that deals 2 damage.",
      icon: "5",
      limit: 1,
      apply(state) {
        state.yellowSpeedPulse = true;
      },
    },
    {
      id: "yellow_accel_gain",
      name: "Momentum Surge",
      desc: "Increase acceleration gain per wall bounce by 0.7.",
      icon: "6",
      limit: 1,
      apply(state) {
        state.yellowAccelGainBonus = (state.yellowAccelGainBonus || 0) + 0.7;
      },
    },
    {
      id: "yellow_bounce_shockwave",
      name: "Tension Release",
      desc: "Every 7th/5th consecutive wall bounce triggers an expanding shockwave dealing 50% of current speed as damage. Resets on enemy clash.",
      icon: "7",
      limit: 2,
      apply(state) {
        state.yellowBounceShockwavePicks = (state.yellowBounceShockwavePicks || 0) + 1;
        // 7 → 5 bounces threshold as picks increase
        state.yellowBounceShockwaveThreshold = 8 - state.yellowBounceShockwavePicks;
      },
    },
    {
      id: "yellow_clash_heal",
      name: "Kinetic Heal",
      desc: "When clashing at 5 speed or higher, heal +3 HP.",
      icon: "8",
      limit: 1,
      apply(state) {
        state.yellowClashHeal = true;
      },
    },
    {
      id: "yellow_speed_retain",
      name: "Inertia",
      desc: "After hitting the enemy, retain 20% of your built-up speed instead of resetting completely.",
      icon: "9",
      limit: 1,
      apply(state) {
        state.yellowSpeedRetain = true;
      },
    },
    {
      id: "yellow_speed_clash_dmg",
      name: "Mach Strike",
      desc: "When at 10 speed or higher, increase clash damage by 10.",
      icon: "10",
      limit: 1,
      apply(state) {
        state.yellowSpeedClashDmg = true;
      },
    },
    {
      id: "yellow_stop_shockwave",
      name: "Shockwave Release",
      desc: "When you stop, release a shockwave dealing damage equal to 50% of your current speed.",
      icon: "11",
      limit: null,
      apply(state) {
        state.yellowStopShockwave = (state.yellowStopShockwave || 0) + 1;
      },
    },
  ],

  // ── BLUE ──
  3: [
    {
      id: "blue_hp",
      name: "Vitality",
      desc: "Increase your maximum HP by 25.",
      icon: "1",
      limit: null,
      apply(state) {
        state.maxHp += 25;
      },
    },
    {
      id: "blue_dmg",
      name: "Power",
      desc: "Increase projectile damage by 2.",
      icon: "2",
      limit: null,
      apply(state) {
        state.bluePassiveDmgBonus = (state.bluePassiveDmgBonus || 0) + 2;
      },
    },
    {
      id: "blue_speed",
      name: "Speed",
      desc: "Increase speed by 0.5.",
      icon: "3",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "blue_proj_count",
      name: "Barrage",
      desc: "Increase projectile count by 1.",
      icon: "4",
      limit: 2,
      apply(state) {
        state.projectileCountBonus = (state.projectileCountBonus || 0) + 1;
      },
    },
    {
      id: "blue_empowered_shot",
      name: "Overcharge",
      desc: "Every 2nd shot fired, the next shot is Empowered: double size, damage, and explosion size.",
      icon: "5",
      limit: 1,
      apply(state) {
        state.blueEmpoweredShot = true;
      },
    },
    {
      id: "blue_bounce",
      name: "Delayed Ordnance",
      desc: "Your projectiles are 40% slower but can bounce off walls for 5 seconds.",
      icon: "6",
      limit: 1,
      apply(state) {
        state.blueBounce = true;
      },
    },
    {
      id: "blue_blast_radius",
      name: "Blast Radius",
      desc: "Increase the base size of your explosions by 25%.",
      icon: "7",
      limit: 1,
      apply(state) {
        state.blueBlastRadius = true;
      },
    },
    {
      id: "blue_condenser",
      name: "Condenser",
      desc: "Reduce your projectile shooting cooldown by 0.5 seconds.",
      icon: "8",
      limit: 4,
      apply(state) {
        state.blueCondenser = (state.blueCondenser || 0) + 1;
      },
    },
    {
      id: "blue_splinter_burst",
      name: "Splinter Burst",
      desc: "Every 2nd shot/every shot triggers 8 projectiles moving outward in a cross shape, each dealing 2 damage.",
      icon: "9",
      limit: 2,
      apply(state) {
        state.blueSplinterPicks = (state.blueSplinterPicks || 0) + 1;
        // 1st pick = every 2nd shot, 2nd pick = every shot
        state.blueSplinterThreshold = state.blueSplinterPicks === 1 ? 2 : 1;
      },
    },
    {
      id: "blue_pressure_release",
      name: "Pressure Release",
      desc: "When dropped below 25 HP, trigger a massive screen-wide explosion that pushes the enemy away and deals damage equal to your current explosion damage stack. Triggers once per floor.",
      icon: "10",
      limit: 1,
      apply(state) {
        state.bluePressureRelease = true;
      },
    },
    {
      id: "blue_singularity",
      name: "Singularity",
      desc: "When your accumulated explosion damage bonus reaches +10 or higher, your projectiles become homing.",
      icon: "11",
      limit: 1,
      apply(state) {
        state.blueSingularity = true;
      },
    },
  ],

  // ── ORANGE ──
  5: [
    {
      id: "orange_hp",
      name: "Vitality",
      desc: "Increase your maximum HP by 25.",
      icon: "1",
      limit: null,
      apply(state) {
        state.maxHp += 25;
      },
    },
    {
      id: "orange_mass",
      name: "Mass",
      desc: "Increase your size by 20%.",
      icon: "2",
      limit: null,
      apply(state) {
        state.sizeBonus = (state.sizeBonus || 0) + 0.2;
      },
    },
    {
      id: "orange_speed",
      name: "Speed",
      desc: "Increase speed by 0.5.",
      icon: "3",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "orange_radiation",
      name: "Radiation",
      desc: "Constantly release a small pulse every 1s/0.5s that follows the enemy and deals 1 damage (same as your wall pulse).",
      icon: "4",
      limit: 2,
      apply(state) {
        state.orangeRadiationPicks = (state.orangeRadiationPicks || 0) + 1;
        // 1st pick = 60 frames (1s), 2nd pick = 30 frames (0.5s)
        state.orangeRadiationInterval = state.orangeRadiationPicks === 1 ? 60 : 30;
      },
    },
  ],
};

// ── Upgrade Screen State ──────────────────────────────────────────────────────
let _upgradeRerollsLeft = 3;
let _currentUpgradeOptions = [];

// Returns available upgrades for current run (respects per-run pick counts)
function _getAvailablePool() {
  const pool = charUpgradePools[rogueState.charId] || [];
  const picks = rogueState.upgradePicks || {};
  return pool.filter(upg => {
    if (upg.limit === null) return true;
    return (picks[upg.id] || 0) < upg.limit;
  });
}

function _getUpgradeOptions(count) {
  const available = _getAvailablePool();
  if (available.length === 0) return [];

  // Shuffle and pick up to `count`, no duplicates
  const shuffled = available.slice().sort(() => Math.random() - 0.5);
  const picks = [];
  for (let i = 0; i < count; i++) {
    picks.push(shuffled[i % shuffled.length]);
  }
  return picks;
}

function _showUpgradeScreen() {
  _upgradeRerollsLeft = 3;
  _currentUpgradeOptions = _getUpgradeOptions(3);
  _renderUpgradeCards();
  document.getElementById("upgrade-overlay").style.display = "block";
  document.getElementById("upgrade-screen").style.display = "flex";
}

function _hideUpgradeScreen() {
  document.getElementById("upgrade-overlay").style.display = "none";
  document.getElementById("upgrade-screen").style.display = "none";
}

function _renderUpgradeCards() {
  const color = rogueState.def.color;
  const row = document.getElementById("upgrade-cards-row");
  row.innerHTML = "";

  if (_currentUpgradeOptions.length === 0) {
    const msg = document.createElement("div");
    msg.style.cssText = "color:rgba(255,255,255,0.4);font-size:13px;letter-spacing:0.15em;font-weight:700;";
    msg.innerText = "NO UPGRADES AVAILABLE";
    row.appendChild(msg);
  }

  _currentUpgradeOptions.forEach((upg, idx) => {
    const picks = rogueState.upgradePicks || {};
    const timesTaken = picks[upg.id] || 0;

    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.style.borderColor = color + "44";
    card.onmouseenter = () => { card.style.boxShadow = `0 12px 40px ${color}30`; };
    card.onmouseleave = () => { card.style.boxShadow = ""; };
    card.onclick = () => { SFX.uiClick(); roguePickUpgrade(idx); };

    const name = document.createElement("div");
    name.className = "upgrade-card-name";
    name.style.color = color;
    name.innerText = upg.name;

    const desc = document.createElement("div");
    desc.className = "upgrade-card-desc";
    desc.innerText = upg.desc;

    card.appendChild(name);
    card.appendChild(desc);

    if (upg.limit !== null) {
      const badge = document.createElement("div");
      badge.className = "upgrade-card-limit";
      badge.innerText = `${timesTaken}/${upg.limit}`;
      card.appendChild(badge);
    }

    row.appendChild(card);
  });

  const btn = document.getElementById("upgrade-reroll-btn");
  btn.disabled = _upgradeRerollsLeft <= 0;
  document.getElementById("upgrade-reroll-count").innerText =
    `${_upgradeRerollsLeft} REROLL${_upgradeRerollsLeft !== 1 ? "S" : ""} LEFT`;
}

function rogueRerollUpgrades() {
  if (_upgradeRerollsLeft <= 0) return;
  _upgradeRerollsLeft--;
  _currentUpgradeOptions = _getUpgradeOptions(3);
  _renderUpgradeCards();
}

function roguePickUpgrade(idx) {
  if (!rogueState) return;
  const upg = _currentUpgradeOptions[idx];
  if (!upg) return;

  // Track picks for limited upgrades
  if (!rogueState.upgradePicks) rogueState.upgradePicks = {};
  rogueState.upgradePicks[upg.id] = (rogueState.upgradePicks[upg.id] || 0) + 1;

  upg.apply(rogueState);
  _hideUpgradeScreen();
  _advanceToNextFloor();
}

// ── Called when the win screen is clicked in rogue mode ──────────────────────
function rogueOnWin() {
  if (!rogueState) return;

  const playerWon = rogueState.hp > 0;

  if (playerWon) {
    // Hide win overlay first
    document.getElementById("win-overlay").style.display = "none";
    document.getElementById("win-content").style.display = "none";
    window.winScreenVisible = false;

    rogueState.floor++;
    rogueState.clashBonus = 0;
    // Save current HP before upgrade screen (don't reset yet)

    if (rogueState.floor > rogueEnemies.length) {
      // Run complete — go straight to main menu
      rogueState = null;
      window._rogueRunComplete = true;
      goToMainMenu();
    } else {
      // Show upgrade screen before advancing
      _showUpgradeScreen();
    }
  } else {
    rogueState = null;
    document.getElementById("win-overlay").style.display = "none";
    document.getElementById("win-content").style.display = "none";
    window.winScreenVisible = false;
    goToMainMenu();
  }
}

function _advanceToNextFloor() {
  // Restore HP to max (after any upgrade was applied)
  rogueState.hp = rogueState.maxHp;
  startRogueFloor();
}
