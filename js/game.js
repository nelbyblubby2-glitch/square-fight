// ── Screen management ─────────────────────────────────────────────────────────
let activeMode = "menu"; // "menu" | "squarefight-select" | "battle" | "rogue-select" | "rogue-run"
let _lastHudBottom = 0; // tracks HUD height to trigger resize() when bars appear/disappear

// ── Silver pickup squares ──────────────────────────────────────────────────────
let silverSquares      = [];
let silverProjectiles  = [];
const SILVER_SPAWN_INTERVAL = 240; // 4 seconds at 60fps
const SILVER_MAX_COUNT      = 4;
const SILVER_COLOR          = "#e2e8f0";

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
  floatingNumbers = [];
  brownSpikes   = [];
  limeProjectiles  = [];
  grayStaticClones = [];
  goldConstructs   = [];
  goldCoins        = [];
  mistProjectiles  = [];
  magentaBeams     = [];
  emeraldProjectiles = [];
  rubyProjectiles    = [];
  rubyLasers         = [];
  silverSquares      = [];
  silverProjectiles  = [];
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
const ROGUE_UNLOCKED_IDS = new Set([1, 2, 3, 4, 5]);

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
      passive.textContent = rogueDefs[id].passiveDesc;
      card.appendChild(passive);
    } else {
      const locked = document.createElement("div");
      locked.className = "rogue-locked-label";
      locked.textContent = "SOON";
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
  goldCoins        = [];
  mistProjectiles  = [];
  magentaBeams     = [];
  emeraldProjectiles = [];
  rubyProjectiles    = [];
  rubyLasers         = [];
  silverSquares      = [];
  silverProjectiles  = [];
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
    _updateRubyLasers();
    _updateLimeProjectiles();
    _updateGrayStaticClones();
    _updateGoldConstructs();
    _updateGoldCoins();
    _updateMagentaBeams();
    _updateSilverSquares();
    _updateSilverProjectiles();
    _updateMistProjectiles();
    _updateEmeraldProjectiles();
    _updateRubyProjectiles();
  } else if (freezeTimer > 0) {
    freezeTimer--;
  }

  // Draw order
  giantSquares.forEach((g) => g.draw());
  brownSpikes.forEach((sp) => sp.draw());
  rubyLasers.forEach((rl)  => rl.draw());
  limeProjectiles.forEach((lp) => lp.draw());
  grayStaticClones.forEach((gc) => gc.draw());
  goldConstructs.forEach((gc)   => gc.draw());
  goldCoins.forEach((coin)      => coin.draw());
  silverSquares.forEach((ss)    => ss.draw());
  silverProjectiles.forEach((sp) => sp.draw());
  magentaBeams.forEach((mb)     => mb.draw());
  mistProjectiles.forEach((mp)  => mp.draw());
  emeraldProjectiles.forEach((ep) => ep.draw());
  rubyProjectiles.forEach((rp)    => rp.draw());
  squares.forEach((s) => s.draw());

  _drawAndCleanClones();

  companions.forEach((c) => c.draw());
  projectiles.forEach((p) => p.draw());

  // Sapphire pulses: update + draw + cleanup
  for (let i = bluePulses.length - 1; i >= 0; i--) {
    bluePulses[i].update();
    bluePulses[i].draw();
    if (bluePulses[i].size > bluePulses[i].maxSize) bluePulses.splice(i, 1);
  }

  // Update HUD after all damage (including blue pulses) so health bar reaches 0
  if (!gameOver) {
    updateHUD();
    // Re-measure the HUD each frame; on mobile the HUD can grow/shrink when
    // character-specific bars (e.g. purple charge) appear or disappear,
    // shifting the arena down without a resize() call.
    const hud = document.getElementById("hud");
    const hudH = hud ? Math.round(hud.getBoundingClientRect().bottom) : 0;
    if (hudH !== _lastHudBottom) {
      _lastHudBottom = hudH;
      resize();
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  for (let i = floatingNumbers.length - 1; i >= 0; i--) {
    floatingNumbers[i].update();
    floatingNumbers[i].draw();
    if (floatingNumbers[i].life <= 0) floatingNumbers.splice(i, 1);
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

    // Out of bounds (non-pink, non-bouncing-green)
    if (!p.isPink && !p.isGreenBounce && (p.x < arena.x || p.x > arena.x + arena.w || p.y < arena.y || p.y > arena.y + arena.h)) {
      // Blue projectile: spawn pulse at the edge when it goes OOB (no enemy hit)
      if (p._isBlue) {
        const pulse = new BluePulse(p.mainOwner, p.x, p.y, p.mainOwner.blueHits || 0, []);
        if (p._isBluEmpowered) pulse.applyEmpowered();
        if (p.mainOwner._rogueBlueBlastRadius) pulse.maxSize *= 1.25;
        bluePulses.push(pulse);
      }
      projectiles.splice(pi, 1);
      continue;
    }

    // Hit main squares (skip hooked lime targets)
    const hookedTargets = new Set(limeProjectiles.filter(lp => lp.hooked).map(lp => lp.pullTarget));
    let hit = false;
    squares.forEach((s) => {
      if (s === p.mainOwner || hit || hookedTargets.has(s)) return;
      // Determine projectile half-size for rect collision (matches visual size)
      const pHalf = p._isBluEmpowered ? 20 : p._isBlue ? 10 : (p._isMilestone || p._isSapphire) ? 10 : 4;
      const pLeft = p.x - pHalf, pRight = p.x + pHalf, pTop = p.y - pHalf, pBot = p.y + pHalf;
      const hit2d = pRight > s.x && pLeft < s.x + s.size && pBot > s.y && pTop < s.y + s.size;
      if (hit2d) {

        // Blue projectile: deals normal damage AND spawns an expanding pulse on hit
        // Damage scales with blueHits (passive accumulator), not bonusDamage
        if (p._isBlue) {
          const baseDmg = 1 + (p.mainOwner.blueHits || 0); // blueHits already includes passive bonus seeded at floor start
          const pdmg = p._isBluEmpowered ? baseDmg * 2 : baseDmg;
          const actualBlueDmg = s.absorbDamage(pdmg);
          s.onTakeDamage();
          SFX.takeDamage();
          floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualBlueDmg, p.mainOwner.def.color));
          spawnHitEffect(p.x, p.y, p.mainOwner.def.color);
          // Spawn pulse — pass hit target so pulse skips it (one source of damage per enemy)
          const pulse = new BluePulse(p.mainOwner, p.x, p.y, p.mainOwner.blueHits || 0, [s]);
          if (p._isBluEmpowered) pulse.applyEmpowered();
          // Blast Radius upgrade: 25% larger explosion
          if (p.mainOwner._rogueBlueBlastRadius) pulse.maxSize *= 1.25;
          bluePulses.push(pulse);
          // Projectile hits increment blueHits by 2 (damage bonus increase)
          p.mainOwner.blueHits = (p.mainOwner.blueHits || 0) + 2;
          hit = true;
          return;
        }

        // Splinter burst projectile
        if (p._isSplinter) {
          const actualSplinter = s.absorbDamage(p._splinterDamage);
          s.onTakeDamage();
          SFX.takeDamage();
          floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualSplinter, p.mainOwner.def.color));
          spawnHitEffect(p.x, p.y, p.mainOwner.def.color);
          hit = true;
          return;
        }

        const rogueBonus = p.mainOwner._rogueProjectileDamageBonus || 0;
        const pdmg = p._isGoldCoin ? p._goldCoinDamage
                   : p._isMilestone ? p._milestoneDmg
                   : p._grayProjDamage != null ? p._grayProjDamage
                   : (p.isIndigo || p.isPink ? 1 : 1 + p.owner.bonusDamage + rogueBonus);
        const actualPdmg = s.absorbDamage(pdmg);
        s.onTakeDamage();
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualPdmg, p.mainOwner.def.color));

        // Scarlet bullet: detonate stored delayed damage on hit
        if (p.isScarlet) {
          const burstDmg = s.burstScarletDelayed();
          if (burstDmg > 0) {
            const actualBurst = s.absorbDamage(burstDmg);
            SFX.takeDamage();
            floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y - 16, actualBurst, p.mainOwner.def.color));
            spawnSquareParticles(p.x, p.y, p.mainOwner.def.color, 10, 1, 4, 6);
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

        if (p.owner.onHitEnemy && !p.isIndigo && !p.isPink && !p._isGoldCoin) p.owner.onHitEnemy();

        // Green: count projectile hits (not body hits) for +1 shot upgrade
        if (p.mainOwner.def && p.mainOwner.def.type === "green" && p.mainOwner.greenFlashTimer === 0 && !p._isMilestone) {
          const passiveThreshold = Math.max(1, 3 - (p.mainOwner._roguePassiveThresholdReduction || 0));
          p.mainOwner.greenHitCounter = (p.mainOwner.greenHitCounter || 0) + 1;
          if (p.mainOwner.greenHitCounter >= passiveThreshold) {
            // If threshold is 1 and reduction is at max (2 picks), skip flash and grant immediately
            if (passiveThreshold === 1) {
              p.mainOwner.projectileCount++;
              p.mainOwner.greenHitCounter = 0;
            } else {
              p.mainOwner.greenFlashTimer = 6;  // 0.1s flash before reset+upgrade
            }
          }

          // Track total hits for milestone shot upgrade
          if (p.mainOwner._rogueMilestoneShotThreshold > 0) {
            p.mainOwner._rogueTotalHitCount = (p.mainOwner._rogueTotalHitCount || 0) + 1;
            if (p.mainOwner._rogueTotalHitCount % p.mainOwner._rogueMilestoneShotThreshold === 0) {
              // Fire a medium projectile dealing dmg = total hit count
              const milestoneProj = new Projectile(p.mainOwner, s);
              milestoneProj._isMilestone = true;
              milestoneProj._milestoneDmg = p.mainOwner.projectileCount;
              projectiles.push(milestoneProj);
            }
          }

          // Lucky Shot: 25% chance to fire 1 bonus projectile
          if (p.mainOwner._rogueHitProcShot && Math.random() < 0.25) {
            const bonusProj = new Projectile(p.mainOwner, s);
            projectiles.push(bonusProj);
          }

          // Vampire Shot: heal player on projectile hit
          if (p.mainOwner._rogueProjectileHeal > 0) {
            p.mainOwner.hp = Math.min(p.mainOwner.maxHp, p.mainOwner.hp + p.mainOwner._rogueProjectileHeal);
            floatingNumbers.push(new FloatingNumber(p.mainOwner.x + p.mainOwner.size / 2, p.mainOwner.y, "+" + p.mainOwner._rogueProjectileHeal, "#00ff44"));
          }

          // Ricochet: flip enemy velocity on projectile hit (no cooldown cost)
          if (p.mainOwner._rogueProjectileFlip) {
            s.vx = -s.vx;
            s.vy = -s.vy;
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
          spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, c.def ? c.def.color : "#ffffff", 8, 1, 4, 6);
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
        const actualGiantDmg = (s.absorbDamage) ? s.absorbDamage(damage) : (s.hp -= damage, damage);
        g.hitList.push(s);
        if (s.onTakeDamage) s.onTakeDamage();
        if (!isClone && actualGiantDmg > 0) SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualGiantDmg.toString(), g.owner.def.color));
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
      spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, c.def ? c.def.color : "#ffffff", 12, 1, 4, 8);
      clones.splice(ci, 1);
    }
  }
}

function _checkWin() {
  if (gameOver || !squares.some((s) => s.hp <= 0)) return;
  gameOver = true;

  // Save rogue stats RIGHT NOW before any reset can happen
  if (activeMode === "rogue-run" && rogueState && squares.length >= 2) {
    rogueState.hp = Math.max(0, Math.ceil(squares[0].hp));
    if (rogueState.charId === 1) {
      rogueState.clashBonus = Math.max(0, squares[0].bonusDamage - (rogueState.power - 1));
    }
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
        ? "CLICK TO RETURN TO MENU"
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
    // Add +2 to current speed for the boost duration, then restore
    square.speedBoostTimer = 90;
    square.speedBoostAdd   = 2; // additive bonus, applied in _updateMovement
    square.actionCooldown  = ACTION_COOLDOWN;
  } else if (action === "stop") {
    // Freeze the square in place briefly (same mechanic as gray clone freeze)
    square.stopTimer      = 90; // ~1.5 seconds
    square.actionCooldown = ACTION_COOLDOWN;
    // Yellow stop shockwave
    if (square._rogueYellowStopShockwave && square._rogueYellowStopShockwave > 0) {
      const sw = new Pulse(square);
      sw.color     = square.def.color;
      sw.thickness = 25;
      sw._yellowSpeedDmg = Math.max(1, Math.floor(square.currentSpeed * 0.5));
      sw._isYellowShockwave = true;
      pulses.push(sw);
      spawnSquareParticles(square.x + square.size / 2, square.y + square.size / 2, square.def.color, 10, 1, 3, 6);
    }
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

  // P1: Z = flip, X = chase, C = speed, V = stop
  if (key === "z") _applyAction(squares[0], "flip");
  if (key === "x") _applyAction(squares[0], "chase");
  if (key === "c") _applyAction(squares[0], "speed");
  if (key === "v") _applyAction(squares[0], "stop");

  // P2: J = flip, K = chase, L = speed, ; = stop (disabled in rogue mode)
  if (activeMode === "rogue-run") return;
  if (key === "j") _applyAction(squares[1], "flip");
  if (key === "k") _applyAction(squares[1], "chase");
  if (key === "l") _applyAction(squares[1], "speed");
  if (key === ";") _applyAction(squares[1], "stop");
});

// Touch / swipe input removed — mobile uses buttons only

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

// ── Silver pickup squares ──────────────────────────────────────────────────────
// Spawns a silver square every 4s (max 4 in arena). Collecting it grants
// silverImmunity += 1 (absorbs next damage hit). Stacks are stored so roguelike
// upgrades can allow multiple charges (if silverImmunity > 0 it won't cap out here,
// roguelike mode can skip the cap check or raise it via player._silverMaxStack).
function _updateSilverSquares() {
  // Update each silver square + check pickup — only the Silver that spawned it can collect (like gold coins)
  for (let i = silverSquares.length - 1; i >= 0; i--) {
    const ss = silverSquares[i];
    ss.update();

    const collector = ss.owner;
    if (!collector || collector.hp <= 0) { silverSquares.splice(i, 1); continue; }

    {
      const sq = collector;
      const dx   = sq.x + sq.size / 2 - (ss.x + ss.size / 2);
      const dy   = sq.y + sq.size / 2 - (ss.y + ss.size / 2);
      const dist = Math.hypot(dx, dy);
      const pickupRange = (sq.size + ss.size) / 2 + 8;

      if (dist < pickupRange) {
        // Grant one immunity charge (roguelike can raise _silverMaxStack for stacking)
        const maxStack = sq._silverMaxStack || 1;
        if (sq.silverImmunity < maxStack) {
          sq.silverImmunity++;
        }

        // Feedback
        spawnSquareParticles(ss.x + ss.size / 2, ss.y + ss.size / 2, SILVER_COLOR, 14, 1, 4, 7);
        SFX.uiClick && SFX.uiClick();
        silverSquares.splice(i, 1);
        break;
      }
    }
  }
}



// ── Silver projectiles ─────────────────────────────────────────────────────────
// Fired by Silver every 4s; bounces off walls, converts to pickup 0.8s after
// first wall bounce. Hits enemies for 4 dmg (no pickup drop on hit).
function _updateSilverProjectiles() {
  for (let i = silverProjectiles.length - 1; i >= 0; i--) {
    const sp = silverProjectiles[i];
    sp.update();

    // Convert to pickup if countdown reached zero
    if (sp.hasBounced && sp.bounceCountdown <= 0) {
      if (silverSquares.length < SILVER_MAX_COUNT) {
        const sq = new SilverSquare(sp.owner);
        sq.x = sp.x;
        sq.y = sp.y;
        silverSquares.push(sq);
      }
      spawnSquareParticles(sp.x + sp.size / 2, sp.y + sp.size / 2, SILVER_COLOR, 12, 1, 3, 6);
      silverProjectiles.splice(i, 1);
      continue;
    }

    // Check enemy hit — deal 4 dmg, no pickup drop
    let hit = false;
    for (const s of squares) {
      if (s === sp.owner || s.hp <= 0 || hit) continue;
      const pHalf = sp.size / 2;
      const cx = sp.x + pHalf, cy = sp.y + pHalf;
      if (cx + pHalf > s.x && cx - pHalf < s.x + s.size &&
          cy + pHalf > s.y && cy - pHalf < s.y + s.size) {
        const actualDmg = s.absorbDamage(4);
        s.onTakeDamage();
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualDmg, SILVER_COLOR));
        spawnHitEffect(cx, cy, SILVER_COLOR);
        silverProjectiles.splice(i, 1);
        hit = true;
      }
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

// ── Gold coins (dropped on clash, collected by Gold for speed boost + shot) ───
function _updateGoldCoins() {
  for (let i = goldCoins.length - 1; i >= 0; i--) {
    const coin = goldCoins[i];
    coin.update();

    // Remove coin if its owner is gone
    const collector = coin.owner;
    if (!collector || collector.hp <= 0) { goldCoins.splice(i, 1); continue; }

    const dx   = collector.x + collector.size / 2 - (coin.x + coin.size / 2);
    const dy   = collector.y + collector.size / 2 - (coin.y + coin.size / 2);
    const dist = Math.hypot(dx, dy);
    const pickupRange = (collector.size + coin.size) / 2 + 10;

    if (coin.uncollectableTimer <= 0 && dist < pickupRange) {
      // Collected! Grant 50% speed boost for 2s and fire a gold projectile (4 dmg)
      _onGoldCoinCollected(collector, coin);
      goldCoins.splice(i, 1);
    }
  }
}

function _onGoldCoinCollected(goldSquare, coin) {
  // Speed boost: 50% of currentSpeed, additive, lasts 2s (120 frames)
  const speedBoost = goldSquare.currentSpeed * 0.50;
  goldSquare.speedBoostTimer = Math.max(goldSquare.speedBoostTimer || 0, 120);
  goldSquare.speedBoostAdd   = Math.max(goldSquare.speedBoostAdd || 0, speedBoost);

  // Fire a gold projectile toward the enemy dealing 4 damage
  const enemy = squares.find(s => s !== goldSquare);
  if (enemy) {
    const goldProj          = new Projectile(goldSquare, enemy);
    goldProj._isGoldCoin    = true;
    goldProj._goldCoinDamage = 4;
    projectiles.push(goldProj);
  }

  // Sparkle burst at coin position — no floating text, just particles
  spawnSquareParticles(coin.x + coin.size / 2, coin.y + coin.size / 2, goldSquare.def.color, 12, 1, 4, 7);
  SFX.heal();
}

// Called from characters.js gold onHitEnemy to drop 2 coins at the clash point
function dropGoldCoinsOnClash(goldSquare, enemy) {
  const cx = (goldSquare.x + goldSquare.size / 2 + enemy.x + enemy.size / 2) / 2;
  const cy = (goldSquare.y + goldSquare.size / 2 + enemy.y + enemy.size / 2) / 2;
  for (let i = 0; i < 2; i++) {
    goldCoins.push(new GoldCoin(cx, cy, goldSquare));
  }
  spawnSquareParticles(cx, cy, goldSquare.def.color, 6, 1, 2, 4);
}

// ── Magenta beams ─────────────────────────────────────────────────────────────
function _updateMagentaBeams() {
  for (let i = magentaBeams.length - 1; i >= 0; i--) {
    const mb = magentaBeams[i];
    mb.update();
    if (!mb.active && !mb.tethered) {
      magentaBeams.splice(i, 1);
    }
  }
}
function _updateMistProjectiles() {
  for (let i = mistProjectiles.length - 1; i >= 0; i--) {
    const mp = mistProjectiles[i];
    mp.update();
    if (!mp.alive) mistProjectiles.splice(i, 1);
  }
}

function _updateEmeraldProjectiles() {
  const EMERALD_DMG = 1;
  for (let i = emeraldProjectiles.length - 1; i >= 0; i--) {
    const ep = emeraldProjectiles[i];
    ep.update();

    if (!ep.alive) {
      emeraldProjectiles.splice(i, 1);
      continue;
    }

    // Collision with enemy squares
    let hit = false;
    squares.forEach((s) => {
      if (hit || s === ep.owner) return;
      const pHalf = 5;
      if (ep.x + pHalf > s.x && ep.x - pHalf < s.x + s.size &&
          ep.y + pHalf > s.y && ep.y - pHalf < s.y + s.size) {
        const actualEmeraldDmg = s.absorbDamage(EMERALD_DMG);
        s.onTakeDamage();
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualEmeraldDmg, ep.owner.def.color));
        spawnHitEffect(ep.x, ep.y, ep.owner.def.color);
        ep.alive = false;
        hit = true;
      }
    });

    if (!ep.alive) {
      emeraldProjectiles.splice(i, 1);
    }
  }
}

function _updateRubyProjectiles() {
  for (let i = rubyProjectiles.length - 1; i >= 0; i--) {
    const rp = rubyProjectiles[i];
    rp.update();
    if (!rp.alive) {
      // Make sure owner state is cleaned up
      rp.owner.rubyProjectileActive = false;
      if (rp.owner.rubyCD <= 0) rp.owner.rubyCD = 240;
      rubyProjectiles.splice(i, 1);
    }
  }
}

function _updateRubyLasers() {
  rubyLasers.forEach(rl => rl.update());
}
