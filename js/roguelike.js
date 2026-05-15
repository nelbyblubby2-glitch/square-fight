// ══════════════════════════════════════════════════════════════════════════════
// ROGUELIKE MODE — js/roguelike.js
// ══════════════════════════════════════════════════════════════════════════════
// rogueState holds the persistent player stats across floors.
// Each floor is a normal Square battle (squares[0] = player, squares[1] = enemy AI).
// The player starts with 50 HP and 1 Power (damage multiplier added to base dmg).
// Red's passive: every clash → +1 permanent clash damage (same mechanic as SF).
// ══════════════════════════════════════════════════════════════════════════════

let rogueState = null;

// ── Roguelike square definitions (separate from squareDefs HP which is 100) ──
const rogueDefs = {
  1: {
    name: "Red",
    color: "#ff3e3e",
    type: "red",
    startHP: 80,
    startPower: 1,
    passiveDesc: "Every clash → +1 permanent damage (Cooldown: 3s)",
  },
  2: {
    name: "Green",
    color: "#00ff44",
    type: "green",
    startHP: 80,
    startPower: 1,
    passiveDesc: "Shoot projectiles every 3s. Every 3 hits → +1 shot.",
  },
};

// Enemy progression per floor
const rogueEnemies = [
  { id: 1,  hpScale: 1   },  // floor 1: Red at 50% HP (25 HP effectively — same start)
  { id: 2,  hpScale: 1   },  // floor 2: Green
  { id: 3,  hpScale: 1   },  // floor 3: Blue
  { id: 5,  hpScale: 1.5 },  // floor 4: White
  { id: 9,  hpScale: 1.5 },  // floor 5: Orange
  { id: 7,  hpScale: 2   },  // floor 6: Purple
  { id: 14, hpScale: 2   },  // floor 7: Lime
  { id: 16, hpScale: 2.5 },  // floor 8: Gray
  { id: 18, hpScale: 2.5 },  // floor 9: Mist
  { id: 17, hpScale: 3   },  // floor 10: Gold (boss)
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

  // Patch Green's rogue upgrades
  if (rogueState.charId === 2) {
    player._rogueSlowProjectile        = true;
    player._rogueFastProjectile        = rogueState.fastProjectile || false;
    player._rogueProjectileBounce      = rogueState.projectileBounceBonus || 0;
    player._rogueProjectileDamageBonus = rogueState.projectileDamageBonus || 0;
    player.projectileCount = 1 + (rogueState.projectileCountBonus || 0);
    // Don't touch bonusDamage — that would affect clash damage too
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
      name: "+10 Max HP",
      desc: "Increase your maximum HP by 10.",
      icon: "",
      limit: null,
      apply(state) {
        state.maxHp += 10;
      },
    },
    {
      id: "red_clash_dmg",
      name: "+1 Clash Damage",
      desc: "Your clashes permanently deal 1 more damage.",
      icon: "",
      limit: null,
      apply(state) {
        state.permClashBonus = (state.permClashBonus || 0) + 1;
      },
    },
    {
      id: "red_size",
      name: "Increase size by 20%.",
      desc: "Your square grows 20% larger.",
      icon: "",
      limit: null,
      apply(state) {
        state.sizeBonus = (state.sizeBonus || 0) + 0.2;
      },
    },
    {
      id: "red_passive_bonus",
      name: "Passive +1 bonus.",
      desc: "Your passive now grants +2 clash damage per clash instead of +1.",
      icon: "",
      limit: 1,
      apply(state) {
        state.passiveClashPerHit = (state.passiveClashPerHit || 1) + 1;
      },
    },
    {
      id: "red_no_cd",
      name: "Remove passive cooldown.",
      desc: "Your clash passive triggers every clash with no cooldown.",
      icon: "",
      limit: 1,
      apply(state) {
        state.noPassiveCooldown = true;
      },
    },
    {
      id: "red_hit_chase",
      name: "Counter-chase on hit.",
      desc: "When you take damage, activate chase regardless of cooldown. Does not trigger cooldown.",
      icon: "",
      limit: 1,
      apply(state) {
        state.hitTriggersChase = true;
      },
    },
    {
      id: "red_speed",
      name: "Increase speed by 0.5.",
      desc: "Your base movement speed increases by 0.5.",
      icon: "",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "red_clash_size_streak",
      name: "Clash Size Streak",
      desc: "Every consecutive clash within 2s increases your clash size by 20% temporarily.",
      icon: "",
      limit: 1,
      apply(state) {
        state.clashSizeStreak = true;
      },
    },
    {
      id: "red_passive_on_hit",
      name: "Reactive Passive",
      desc: "Your clash passive also triggers when you take damage.",
      icon: "",
      limit: 1,
      apply(state) {
        state.passiveOnHit = true;
      },
    },
    {
      id: "red_speed_on_big_clash",
      name: "Clash Burst",
      desc: "When dealing clash damage above 10, increase speed by 3 for 2s.",
      icon: "",
      limit: 1,
      apply(state) {
        state.speedOnBigClash = true;
      },
    },
    {
      id: "red_emergency_heal",
      name: "Emergency Heal",
      desc: "When HP is at or below 20, heal +20 HP. Triggers once per fight.",
      icon: "",
      limit: 1,
      apply(state) {
        state.emergencyHeal = true;
      },
    },
    {
      id: "red_clash_heal",
      name: "Clash Heal",
      desc: "On every clash, heal +1 HP.",
      icon: "",
      limit: 2,
      apply(state) {
        state.clashHeal = (state.clashHeal || 0) + 1;
      },
    },
    {
      id: "red_low_hp_double_passive",
      name: "Desperate Power",
      desc: "While HP is below 30, your passive gain is doubled.",
      icon: "",
      limit: 1,
      apply(state) {
        state.lowHpDoublePassive = true;
      },
    },
    {
      id: "red_bounce_empower",
      name: "Bounce Empower",
      desc: "Every 8th/7th/6th bounce (hitting enemy or wall) empowers your next clash for +10 damage.",
      icon: "",
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
      name: "+10 Max HP",
      desc: "Increase your maximum HP by 10.",
      icon: "",
      limit: null,
      apply(state) {
        state.maxHp += 10;
      },
    },
    {
      id: "green_speed",
      name: "+0.5 Speed",
      desc: "Your base movement speed increases by 0.5.",
      icon: "",
      limit: null,
      apply(state) {
        state.speedBonus = (state.speedBonus || 0) + 0.5;
      },
    },
    {
      id: "green_proj_bounce",
      name: "Projectile Bounce",
      desc: "Your projectiles bounce off walls.",
      icon: "",
      limit: 1,
      apply(state) {
        state.projectileBounceBonus = (state.projectileBounceBonus || 0) + 1;
      },
    },
    {
      id: "green_proj_damage_speed",
      name: "Sharpened Shot",
      desc: "Projectiles deal +1 damage.",
      icon: "",
      limit: 1,
      apply(state) {
        state.projectileDamageBonus = (state.projectileDamageBonus || 0) + 1;
      },
    },
    {
      id: "green_proj_count",
      name: "+1 Projectile",
      desc: "Fire one additional projectile per burst.",
      icon: "",
      limit: null,
      apply(state) {
        state.projectileCountBonus = (state.projectileCountBonus || 0) + 1;
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


