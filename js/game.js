// ── Screen management ─────────────────────────────────────────────────────────
let activeMode = "menu"; // "menu" | "squarefight-select" | "battle" | "rogue-select" | "rogue-run"

function showScreen(id) {
  const overlays = ["main-menu", "select-screen", "rogue-select-screen"];
  overlays.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  const isBattle = (id === "battle" || id === "rogue-run");
  const isRogue  = (id === "rogue-run");

  // HUD always shown during any battle mode
  const hud = document.getElementById("hud");
  if (hud) hud.style.display = isBattle ? "flex" : "none";

  // HUD home button: shown only during battle/rogue-run
  const hudHomeBtn = document.getElementById("hud-home-btn");
  if (hudHomeBtn) hudHomeBtn.style.display = isBattle ? "block" : "none";

  // Controls text: only in normal battle
  const ctrl = document.getElementById("controls");
  if (ctrl) ctrl.style.display = (isBattle && !isRogue) ? "block" : "none";

  // Bottom buttons container
  const btns = document.getElementById("bottom-left-btns");
  if (btns) btns.style.display = isBattle ? "flex" : "none";

  // Reset and Squares buttons: hidden in rogue
  const resetBtn  = document.getElementById("reset-btn");
  const rosterBtn = document.getElementById("roster-btn");
  if (resetBtn)  resetBtn.style.display  = isRogue ? "none" : "";
  if (rosterBtn) rosterBtn.style.display = isRogue ? "none" : "";

  // Mobile controls: let CSS (pointer: coarse) handle show/hide on mobile vs desktop.
  // Only control P2 visibility in rogue mode.
  const mobP2 = document.getElementById("mobile-p2");
  if (mobP2) mobP2.style.display = isRogue ? "none" : "";

  // Show the named overlay (non-battle screens)
  if (!isBattle) {
    const el = document.getElementById(id);
    if (el) el.style.display = "flex";
  }

  activeMode = id;
}

function goToMainMenu() {
  showScreen("main-menu");
  // Clear all battle state so nothing carries over when re-entering any mode
  rogueState    = null;
  selectedIds   = [1, 2];
  squares       = [];
  projectiles   = [];
  companions    = [];
  clones        = [];
  giantSquares  = [];
  pulses        = [];
  followingPulses = [];
  particles     = [];
  floatingTexts = [];
  brownSpikes   = [];
  limeProjectiles  = [];
  grayStaticClones = [];
  goldConstructs   = [];
  mistProjectiles  = [];
  gameOver         = false;
  freezeTimer      = 0;
  winDelayTimer    = 0;
  window.winScreenVisible = false;
  document.getElementById("win-overlay").style.display = "none";
  document.getElementById("win-content").style.display  = "none";
}

function goToSquareFight() {
  showScreen("select-screen");
  activeMode = "squarefight-select"; // must come AFTER showScreen()
}

// IDs that are unlocked for roguelike. Add more IDs here as you unlock them.
const ROGUE_UNLOCKED_IDS = new Set([1]);

function buildRogueSelectGrid() {
  const grid = document.getElementById("rogue-grid");
  if (!grid) return;
  grid.innerHTML = "";

  Object.entries(squareDefs).forEach(([idStr, def]) => {
    const id = Number(idStr);
    const unlocked = ROGUE_UNLOCKED_IDS.has(id);
    const card = document.createElement("div");
    card.className = "rogue-char-card " + (unlocked ? "rogue-available" : "rogue-locked");
    if (unlocked) {
      card.onclick = () => { SFX.uiClick(); startRogueRun(id); };
    }

    const preview = document.createElement("div");
    preview.className = "rogue-char-preview";
    preview.style.background = def.color;

    const name = document.createElement("div");
    name.className = "rogue-char-name";
    name.style.color = def.color;
    name.textContent = def.name.toUpperCase();

    card.appendChild(preview);
    card.appendChild(name);

    if (unlocked) {
      const passive = document.createElement("div");
      passive.className = "rogue-char-passive";
      passive.textContent = def.desc;
      card.appendChild(passive);
    } else {
      const locked = document.createElement("div");
      locked.className = "rogue-locked-label";
      locked.textContent = "LOCKED";
      card.appendChild(locked);
    }

    grid.appendChild(card);
  });
}

function goToRoguelike() {
  buildRogueSelectGrid();
  showScreen("rogue-select-screen");
}

function onWinClick() {
  if (activeMode === "rogue-run") {
    rogueOnWin();
  } else {
    resetBattle();
  }
}

// ── Reset / start ─────────────────────────────────────────────────────────────
function resetBattle() {
  resize();
  companions    = [];
  clones        = [];
  brownSpikes   = [];
  
  limeProjectiles = [];
  grayStaticClones = [];
  goldConstructs   = [];
  mistProjectiles  = [];
  squares       = [new Square(selectedIds[0], "left"), new Square(selectedIds[1], "right")];
  projectiles   = [];
  giantSquares  = [];
  pulses        = [];
  followingPulses = [];
  particles     = [];
  floatingTexts = [];
  gameOver        = false;
  freezeTimer     = 0;
  winDelayTimer   = 0;
  window.winScreenVisible = false;
  document.getElementById("win-overlay").style.display = "none";
  document.getElementById("win-content").style.display = "none";
  document.getElementById("win-subtext").innerText = "CLICK OR PRESS 'R' TO REENGAGE";
}

function startBattle() {
  currentScreen = "battle";
  activeMode = "battle";
  showScreen("battle"); // hides other screens, shows HUD
  // Defer resize() by one frame so the browser reflows the HUD before
  // getBoundingClientRect() measures hudBottom. Without this, calling resize()
  // synchronously right after display:none→flex gives hudBottom=0 (stale value),
  // which shifts the arena up under the HUD instead of centering it correctly.
  requestAnimationFrame(() => {
    resetBattle(); // resetBattle() already calls resize() first
  });
}

// ── Main game loop ────────────────────────────────────────────────────────────
function loop() {
  ctx.save();

  if (freezeTimer > 0)
    ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);

  if (activeMode === "battle" || activeMode === "rogue-run") {
    _runBattle();
  } else if (activeMode === "squarefight-select") {
    renderSelectUI();
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

function _runBattle() {
  // Guard: squares may not be populated yet if resetBattle() was deferred
  // (e.g. on the frame between startBattle() and the requestAnimationFrame callback).
  if (squares.length < 2) return;

  if (!gameOver && freezeTimer <= 0) {
    // Squares that are currently being reeled by Lime skip their own physics update
    const hookedTargets = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.pullTarget));

    // Lime stops in place while hooking an enemy
    const limePulling = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.owner));

    squares.forEach((s) => {
      if (hookedTargets.has(s)) {
        // Hooked enemy: skip normal physics (lime projectile moves them)
        // BUT on last chain segment, tick timers so clashing can work
        const lp = limeProjectiles.find(lp2 => lp2.pullTarget === s && lp2.hooked);
        if (lp && lp.chain.length === 1) {
          if (s.hitImmunityTimer > 0) s.hitImmunityTimer--;
          if (s.stopTimer > 0) s.stopTimer--;
        }
        return;
      }
      if (limePulling.has(s)) {
        // Lime: freeze in place, still run skill tick
        s.stopTimer = 2;
        // No passive immunity for Lime while pulling — immunity is only granted by clashing
        s.update();
        return;
      }
      s.update();
    });

    // Square-vs-square collision: skip if hooked (unless on last chain); allow Lime collision only on last chain
    const limeOnLastChain = (s) => {
      if (s.def.type !== "lime") return false;
      const lp = limeProjectiles.find(lp2 => lp2.owner === s && lp2.hooked);
      return lp && lp.chain.length === 1;
    };
    // Enemy is on last chain = being pulled directly toward Lime (chain.length===1)
    const enemyOnLastChain = (s) => {
      const lp = limeProjectiles.find(lp2 => lp2.pullTarget === s && lp2.hooked);
      return lp && lp.chain.length === 1;
    };
    const skipCollision =
      (hookedTargets.has(squares[0]) && !enemyOnLastChain(squares[0])) ||
      (hookedTargets.has(squares[1]) && !enemyOnLastChain(squares[1])) ||
      (limePulling.has(squares[0]) && !limeOnLastChain(squares[0])) ||
      (limePulling.has(squares[1]) && !limeOnLastChain(squares[1]));
    if (!skipCollision) {
      resolveCollision(squares[0], squares[1]);
    }
    _updateProjectiles();
    _updateClones();
    _updateCompanions();
    _updateGiantSquares();
    _updatePulses();
    _updateBrownSpikes();
    _updateLimeProjectiles();
    _updateGrayStaticClones();
    _updateGoldConstructs();
    _updateMistProjectiles();
  } else if (freezeTimer > 0) {
    freezeTimer--;
  }

  if (!gameOver) {
    updateHUD();
  }

  // Draw order
  giantSquares.forEach((g) => g.draw());
  brownSpikes.forEach((sp) => sp.draw());
  limeProjectiles.forEach((lp) => lp.draw());
  grayStaticClones.forEach((gc) => gc.draw());
  goldConstructs.forEach((gc)   => gc.draw());
  mistProjectiles.forEach((mp)  => mp.draw());
  squares.forEach((s) => s.draw());

  _drawAndCleanClones();

  companions.forEach((c) => c.draw());
  projectiles.forEach((p) => p.draw());

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update();
    floatingTexts[i].draw();
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }

  _checkWin();
  _showWinScreen();
}

// ── Sub-update helpers ────────────────────────────────────────────────────────

function _updateProjectiles() {
  for (let pi = projectiles.length - 1; pi >= 0; pi--) {
    const p = projectiles[pi];
    p.update();

    // Indigo bouncing → become clone after timer
    if (p.bouncing) {
      if (p.bounceTimer <= 0) {
        clones.push(new Clone("indigo", p.x - SIZE / 2, p.y - SIZE / 2, p.mainOwner));
        projectiles.splice(pi, 1);
      }
      continue;
    }

    // Out of bounds (non-pink)
    if (!p.isPink && (p.x < arena.x || p.x > arena.x + arena.w || p.y < arena.y || p.y > arena.y + arena.h)) {
      projectiles.splice(pi, 1);
      continue;
    }

    // Hit main squares (skip hooked lime targets)
    const hookedTargets = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.pullTarget));
    let hit = false;
    squares.forEach((s) => {
      if (s === p.mainOwner || hit || hookedTargets.has(s)) return;
      if (p.x > s.x && p.x < s.x + s.size && p.y > s.y && p.y < s.y + s.size) {
        const pdmg = p.isIndigo || p.isPink ? 1 : 1 + p.owner.bonusDamage;
        s.hp -= pdmg;
        s.onTakeDamage();
        floatingTexts.push(new FloatingText(s.x + s.size / 2, s.y, pdmg, "#ffffff"));

        // Scarlet bullet: burst all bleed stacks instantly
        if (p.isScarlet) {
          const burstDmg = s.burstBleed();
          if (burstDmg > 0) {
            s.hp -= burstDmg;
            floatingTexts.push(new FloatingText(s.x + s.size / 2, s.y - 16, burstDmg, "#cc1a1a"));
            spawnSquareParticles(p.x, p.y, "#cc1a1a", 10, 1, 4, 6);
            triggerHitFreeze();
          }
        }

        if (p.isIndigo || p.isPink) {
          spawnSquareParticles(p.x, p.y, p.mainOwner.def.color, 6, 1, 3, 5);
        } else {
          spawnHitEffect(p.x, p.y, p.mainOwner.def.color);
        }

        if (p.isPink) {
          followingPulses.push(new FollowingPulse(p.mainOwner, s, p.x, p.y, p.bouncePower));
          p.mainOwner.pinkProjectileActive = false;
          p.mainOwner.pinkSkillTimer       = 480;
        }

        if (p.owner.onHitEnemy && !p.isIndigo && !p.isPink) p.owner.onHitEnemy();

        // Green: count projectile hits (not body hits) for +1 shot upgrade
        if (p.mainOwner.def && p.mainOwner.def.type === "green" && p.mainOwner.greenFlashTimer === 0) {
          p.mainOwner.greenHitCounter = (p.mainOwner.greenHitCounter || 0) + 1;
          if (p.mainOwner.greenHitCounter >= 3) {
            p.mainOwner.greenFlashTimer = 6;  // 0.1s flash before reset+upgrade
          }
        }

        if (p.isIndigo) {
          p.bouncing = true;
          p.vx = (Math.random() - 0.5) * 12;
          p.vy = (Math.random() - 0.5) * 12;
        } else {
          hit = true;
        }
      }
    });
    if (hit) { projectiles.splice(pi, 1); continue; }

    // Hit indigo and sky clones (non-bouncing projectiles)
    for (const cloneList of [clones]) {
      for (let ci = cloneList.length - 1; ci >= 0; ci--) {
        const c = cloneList[ci];
        if (p.mainOwner === c.mainOwner) continue;
        if (p.x > c.x && p.x < c.x + c.size && p.y > c.y && p.y < c.y + c.size) {
          c.hp = 0;
          const cloneColor = c instanceof Clone ? "#87ceeb" : "#6C5CE7";
          spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, cloneColor, 8, 1, 4, 6);
          floatingTexts.push(new FloatingText(c.x + c.size / 2, c.y, "1", "#ffffff"));
        }
      }
    }
  }
}

function _updateClones() {
  const hookedTargets = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.pullTarget));
  // Both indigo and sky clones use resolveCloneCollision for consistent behavior
  [...clones].forEach((c) => {
    c.update();
    squares.forEach((s) => {
      if (s !== c.mainOwner && !hookedTargets.has(s)) resolveCloneCollision(c, s);
    });
  });
}

function _updateCompanions() {
  const hookedTargets = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.pullTarget));
  companions.forEach((c) => {
    c.update();
    squares.forEach((s) => { if (!hookedTargets.has(s)) resolveCompanionCollision(c, s); });
  });
}

function _updateGiantSquares() {
  for (let gi = giantSquares.length - 1; gi >= 0; gi--) {
    const g = giantSquares[gi];
    g.update();

    [...squares, ...clones].forEach((s) => {
      if (s === g.owner || g.hitList.includes(s)) return;
      if (g.x < s.x + s.size && g.x + g.size > s.x && g.y < s.y + s.size && g.y + g.size > s.y) {
        const isClone = (s instanceof Clone);
        const damage  = isClone ? 1 : 12;
        s.hp -= damage;
        g.hitList.push(s);
        if (s.onTakeDamage) s.onTakeDamage();
        floatingTexts.push(new FloatingText(s.x + s.size / 2, s.y, damage.toString(), "#ffffff"));
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, g.owner.def.color, 8, 1, 3, 5);
        if (!isClone) triggerHitFreeze();
      }
    });

    if (g.life <= 0) giantSquares.splice(gi, 1);
  }
}

function _updatePulses() {
  for (let pi = pulses.length - 1; pi >= 0; pi--) {
    pulses[pi].update();
    pulses[pi].draw();
    if (pulses[pi].size > pulses[pi].maxSize) pulses.splice(pi, 1);
  }
  for (let fi = followingPulses.length - 1; fi >= 0; fi--) {
    followingPulses[fi].update();
    followingPulses[fi].draw();
    if (followingPulses[fi].active && followingPulses[fi].size > followingPulses[fi].maxSize)
      followingPulses.splice(fi, 1);
  }
}

function _drawAndCleanClones() {
  for (let ci = clones.length - 1; ci >= 0; ci--) {
    const c = clones[ci];
    c.draw();
    if (c.hp <= 0) {
      spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, c.def.color, 12, 1, 4, 8);
      clones.splice(ci, 1);
    }
  }
}

function _checkWin() {
  if (gameOver || !squares.some((s) => s.hp <= 0)) return;
  gameOver = true;

  // Save rogue stats RIGHT NOW before any reset can happen
  if (activeMode === "rogue-run" && rogueState && squares.length >= 2) {
    rogueState.hp         = Math.max(0, Math.ceil(squares[0].hp));
    rogueState.clashBonus = Math.max(0, squares[0].bonusDamage - (rogueState.power - 1));
  }

  const loser  = squares.find((s) => s.hp <= 0);
  const winner = squares.find((s) => s.hp > 0);

  if (activeMode === "rogue-run" && rogueState) {
    const playerWon = squares[0] && squares[0].hp > 0;
    const floor = rogueState.floor;
    const nextFloor = floor + 1;
    if (playerWon) {
      const isLastFloor = floor >= rogueEnemies.length;
      winnerText = isLastFloor ? "FLOOR CLEARED!" : `FLOOR ${floor} CLEARED!`;
      document.getElementById("win-subtext").innerText = isLastFloor
        ? "CLICK TO SEE RESULTS"
        : `CLICK TO ADVANCE TO FLOOR ${nextFloor}`;
    } else {
      winnerText = "YOU DIED";
      document.getElementById("win-subtext").innerText = "CLICK TO RETURN TO MENU";
    }
  } else {
    winnerText = winner ? `${winner.def.name.toUpperCase()} WINS` : "DRAW";
    document.getElementById("win-subtext").innerText = "CLICK OR PRESS 'R' TO REENGAGE";
  }

  winDelayTimer = 90;
  if (loser) {
    for (let i = 0; i < 60; i++) {
      const p = new Particle(loser.x + loser.size / 2, loser.y + loser.size / 2, loser.def.color, 4 + Math.random() * 5);
      p.vx = (Math.random() - 0.5) * 18;
      p.vy = (Math.random() - 0.5) * 18;
      particles.push(p);
    }
  }
}

function _showWinScreen() {
  if (!gameOver || window.ScreenVisible) return;
  if (winDelayTimer > 0) { winDelayTimer--; return; }
  window.winScreenVisible = true;
  document.getElementById("win-overlay").style.display = "block";
  document.getElementById("win-content").style.display = "flex";
  document.getElementById("win-text").innerText = winnerText;
}

// ── Brown spikes ──────────────────────────────────────────────────────────────
function _updateBrownSpikes() {
  brownSpikes.forEach(sp => sp.update());
}

// ── Lime projectiles & pull mechanic ─────────────────────────────────────────
function _updateLimeProjectiles() {
  for (let i = limeProjectiles.length - 1; i >= 0; i--) {
    const lp = limeProjectiles[i];
    lp.update();

    // Remove if done (pull completed or cancelled)
    if (!lp.active && !lp.hooked) {
      limeProjectiles.splice(i, 1);
    }
  }
}

// ── Helper: apply a player action ────────────────────────────────────────────
function _applyAction(square, action) {
  if (!square || square.actionCooldown > 0) return;
  if (action === "flip") {
    square.vx = -square.vx;
    square.vy = -square.vy;
    square.actionCooldown = ACTION_COOLDOWN;
  } else if (action === "chase") {
    // On next wall bounce, aim at the opponent
    square.aimNext = true;
    square.actionCooldown = ACTION_COOLDOWN;
  } else if (action === "speed") {
    square.speedBoostTimer = 90;
    square.actionCooldown = ACTION_COOLDOWN;
  }
}

// ── Mobile button action helper (called from HTML ontouchstart/onclick) ────────
function _mobileAction(playerIdx, action) {
  if (activeMode !== "battle" && activeMode !== "rogue-run") return;
  if (gameOver) return;
  if (activeMode === "rogue-run" && playerIdx === 1) return; // P2 disabled in rogue
  _applyAction(squares[playerIdx], action);
}

// ── Keyboard input ────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  // R: reset only in normal battle (not rogue)
  if (key === "r" && activeMode === "battle") { SFX.uiClick(); resetBattle(); }

  if ((activeMode !== "battle" && activeMode !== "rogue-run") || gameOver) return;

  // P1: Z = flip, X = chase, C = speed
  if (key === "z") _applyAction(squares[0], "flip");
  if (key === "x") _applyAction(squares[0], "chase");
  if (key === "c") _applyAction(squares[0], "speed");

  // P2: J = flip, K = chase, L = speed (disabled in rogue mode)
  if (activeMode === "rogue-run") return;
  if (key === "j") _applyAction(squares[1], "flip");
  if (key === "k") _applyAction(squares[1], "chase");
  if (key === "l") _applyAction(squares[1], "speed");
});

// ── Touch / swipe input ───────────────────────────────────────────────────────
// Called from index.html after canvas is assigned, so `canvas` is guaranteed defined.
function _initTouchControls() {
  // We split the screen in half: left half = P1, right half = P2
  // Swipe left/right  → flip X
  // Swipe up/down     → flip Y
  // Tap (no swipe)    → stop
  const SWIPE_THRESHOLD = 30; // px

  let touches = {}; // track each touch by identifier

  function playerIndexForX(x) {
    return x < window.innerWidth / 2 ? 0 : 1;
  }

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      touches[t.identifier] = { startX: t.clientX, startY: t.clientY, playerIdx: playerIndexForX(t.clientX) };
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (currentScreen !== "battle" || gameOver) { touches = {}; return; }
    for (const t of e.changedTouches) {
      const start = touches[t.identifier];
      if (!start) continue;
      delete touches[t.identifier];

      const dx = t.clientX - start.startX;
      const dy = t.clientY - start.startY;
      const sq = squares[start.playerIdx];

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
        // Tap → speed
        _applyAction(sq, "speed");
      } else if (Math.abs(dx) >= Math.abs(dy)) {
        // Horizontal swipe → flip
        _applyAction(sq, "flip");
      } else {
        // Vertical swipe → chase
        _applyAction(sq, "chase");
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchcancel", (e) => {
    for (const t of e.changedTouches) delete touches[t.identifier];
  }, { passive: false });
}

window.addEventListener("resize", resize);

// ── Gray static clones ────────────────────────────────────────────────────────
function _updateGrayStaticClones() {
  for (let i = grayStaticClones.length - 1; i >= 0; i--) {
    const gc = grayStaticClones[i];
    gc.update();
    if (gc.life <= 0) {
      grayStaticClones.splice(i, 1);
    }
  }
}

// ── Gold constructs ────────────────────────────────────────────────────────────
function _updateGoldConstructs() {
  goldConstructs.forEach((gc) => {
    gc.update();
    // Collide enemy squares against the construct (Gold itself passes through)
    squares.forEach((s) => {
      if (s === gc.owner) return;
      resolveConstructCollision(gc, s);
    });
  });
}

// ── Mist projectiles ──────────────────────────────────────────────────────────
function _updateMistProjectiles() {
  for (let i = mistProjectiles.length - 1; i >= 0; i--) {
    const mp = mistProjectiles[i];
    mp.update();
    if (!mp.alive) mistProjectiles.splice(i, 1);
  }
}
