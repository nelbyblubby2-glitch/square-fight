// ─────────────────────────────────────────────────────────────────────────────
// RED — Every collision grants +1 permanent damage (cooldown 2s)
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("red", {
  initState(s) {
    s.redAbilityCD = 0;
    s._redLastClashTime = -999; // for clash size streak
    s._redClashSizeBonus = 0;   // temporary size bonus from streak
    s._redClashSizeTimer = 0;   // frames remaining for size bonus
    s._redSpeedBoostTimer = 0;  // frames remaining for clash burst speed
  },
  updateSkill(s) {
    if (s.redAbilityCD > 0) s.redAbilityCD--;

    // Chase charge: fire aimNext after 8-frame delay (matches bar flash duration)
    if (s._hitChaseFireCD > 0) {
      s._hitChaseFireCD--;
      if (s._hitChaseFireCD === 0) {
        s._hitChaseCharge = 0;
        s.aimNext = true;
      }
    }

    // Decay clash size streak bonus
    if (s._redClashSizeTimer > 0) {
      s._redClashSizeTimer--;
      if (s._redClashSizeTimer === 0) {
        // Remove size bonus: restore to base (including rogue size bonus)
        const rogueSize = s._rogueClashSizeStreak ? 0 : 0; // size is managed below
        s.size = Math.max(SIZE, s.size - s._redClashSizeBonus);
        s._redClashSizeBonus = 0;
      }
    }

    // Decay speed boost from Clash Burst
    if (s._redSpeedBoostTimer > 0) {
      s._redSpeedBoostTimer--;
      if (s._redSpeedBoostTimer === 0) {
        s.currentSpeed = BASE_SPEED + (s._rogueSpeedBonus || 0);
        s.normalizeVelocity();
      }
    }
  },
  onHitEnemy(s) {
    // ── Clash passive: +N permanent damage ──
    const noCD = s._rogueNoPassiveCD || false;
    if (noCD || s.redAbilityCD <= 0) {
      let perHit = s._roguePassivePerHit || 1;
      if (s._rogueLowHpDoublePassive && s.hp < 30) perHit *= 2;
      s.bonusDamage += perHit;
      if (!noCD) s.redAbilityCD = 120; // 2s at 60fps
    }

    // ── Bounce Empower: count every hit on enemy as a bounce ──
    if (s._rogueBounceEmpowerThreshold > 0 && !s._rogueBounceEmpowered) {
      s._rogueBounceCount = (s._rogueBounceCount || 0) + 1;
      if (s._rogueBounceCount >= s._rogueBounceEmpowerThreshold) {
        s._rogueBounceCount = 0;
        s._rogueBounceEmpowered = true;
      }
    }

    // ── Clash Size Streak ──
    if (s._rogueClashSizeStreak) {
      const now = performance.now();
      const timeSinceLast = (now - (s._redLastClashTime || 0)) / 1000;
      if (timeSinceLast <= 2) {
        // Consecutive clash within 2s: add 20% size boost
        const bonus = Math.round(SIZE * 0.2);
        s.size += bonus;
        s._redClashSizeBonus = (s._redClashSizeBonus || 0) + bonus;
        s._redClashSizeTimer = 120; // 2s duration, refreshed
      } else {
        // Not consecutive: remove any existing bonus
        if (s._redClashSizeBonus > 0) {
          s.size = Math.max(SIZE, s.size - s._redClashSizeBonus);
          s._redClashSizeBonus = 0;
          s._redClashSizeTimer = 0;
        }
      }
      s._redLastClashTime = now;
    }

    // ── Speed on big clash (Clash Burst) ──
    if (s._rogueSpeedOnBigClash) {
      const dmgDealt = s.getCollisionDamage();
      if (dmgDealt > 10) {
        s.currentSpeed = (BASE_SPEED + (s._rogueSpeedBonus || 0)) + 3;
        s.normalizeVelocity();
        s._redSpeedBoostTimer = 120; // 2s
      }
    }

    // ── Clash Heal ──
    if (s._rogueClashHealAmt > 0) {
      s.hp = Math.min(s.maxHp, s.hp + s._rogueClashHealAmt);
      SFX.heal();
      floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y - 14, `+${s._rogueClashHealAmt}`, "#00ff44"));
    }

  },
  onTakeDamage(s) {
    // ── Reactive Passive: passive triggers on taking damage too ──
    if (s._roguePassiveOnHit) {
      const noCD = s._rogueNoPassiveCD || false;
      if (noCD || s.redAbilityCD <= 0) {
        let perHit = s._roguePassivePerHit || 1;
        if (s._rogueLowHpDoublePassive && s.hp < 30) perHit *= 2;
        s.bonusDamage += perHit;
        if (!noCD) s.redAbilityCD = 120;
      }
    }

    // ── Emergency Heal ──
    if (s._rogueEmergencyHeal && !s._rogueEmergencyHealUsed && s.hp <= 20) {
      s._rogueEmergencyHealUsed = true;
      s.hp = Math.min(s.maxHp, s.hp + 20);
      SFX.heal();
      floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y - 14, "+20", "#00ff44"));
      spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#ff3e3e", 12, 1, 3, 6);
    }

    // ── Counter-chase: charges on taking damage (2 hits = trigger chase) ──
    if (s._rogueHitTriggersChase) {
      if (!s._hitChaseFireCD) {
        s._hitChaseCharge = (s._hitChaseCharge || 0) + 1;
        if (s._hitChaseCharge >= 2) {
          s._hitChaseFireCD = 8; // hold bar full for 8 frames, then fire
        }
      }
    }
  },
  onWallBounce(s) {
    // ── Bounce Empower: count wall bounces ──
    if (s._rogueBounceEmpowerThreshold > 0 && !s._rogueBounceEmpowered) {
      s._rogueBounceCount = (s._rogueBounceCount || 0) + 1;
      if (s._rogueBounceCount >= s._rogueBounceEmpowerThreshold) {
        s._rogueBounceCount = 0;
        s._rogueBounceEmpowered = true;
      }
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// GREEN — Shoots a growing burst of projectiles every 3s
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("green", {
  initState(s) {
    s.greenHitCounter  = 0;   // counts projectile hits on enemy; every 3 grants +1 shot
    s.greenFlashTimer  = 0;   // 6-frame full-flash before reset (0.1s)
  },
  updateSkill(s) {
    // Flash pause: bar is full, wait 0.1s then grant +1 shot and reset
    if (s.greenFlashTimer > 0) {
      s.greenFlashTimer--;
      if (s.greenFlashTimer === 0) {
        s.projectileCount++;
        s.greenHitCounter = 0;
      }
      return;
    }

    if (s.burstShotsLeft > 0) {
      if (s.shotGapTimer > 0) {
        s.shotGapTimer--;
      } else {
        projectiles.push(new Projectile(s, squares.find((t) => t !== s)));
        s.burstShotsLeft--;
        s.shotGapTimer = SHOT_GAP;
      }
    } else if (s.cooldownTimer > 0) {
      s.cooldownTimer--;
    } else {
      s.burstShotsLeft = s.projectileCount;
      s.cooldownTimer  = 180;
    }
  },
  // onHitEnemy intentionally NOT used — counting is done on projectile hit in game.js
});


// ─────────────────────────────────────────────────────────────────────────────
// BLUE — On taking damage: gain HP, size, and bonus damage (cooldown 4s)
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("blue", {
  initState(s) {
    s.blueGlobalCD = 0;
  },
  onTakeDamage(s) {
    if (s.blueGlobalCD > 0) return;
    s.bonusDamage++;
    s.hp = Math.min(100, s.hp + 4);
    SFX.heal();
    floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, "+4", "#00ff44"));
    s.size += 8;
    s.blueGlobalCD = COOLDOWN_FRAMES;
  },
  updateSkill(s) {
    if (s.blueGlobalCD > 0) s.blueGlobalCD--;
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// YELLOW — Speed increases with every wall bounce; hitting enemy raises cap
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("yellow", {
  initState(s) {
    s.yellowWallBoost = 0.5;
    s.yellowAccelGain = 0.08;
    s.yellowSpeedCap  = 5.0;
    s.yellowCapGrowth = 1.5;
  },
  getCollisionDamage(s) {
    return Math.max(1, Math.floor(s.currentSpeed));
  },
  onWallBounce(s) {
    s.currentSpeed += s.yellowWallBoost;
  },
  onHitEnemy(s) {
    s.yellowWallBoost += s.yellowAccelGain;
    s.yellowSpeedCap  += s.yellowCapGrowth;
    s.currentSpeed     = BASE_SPEED;
    s.normalizeVelocity();
  },
  // Yellow speed cap is enforced inside Square._updateMovement via the registry
  updateSkill(s) {
    const mag = Math.hypot(s.vx, s.vy);
    if (mag > s.yellowSpeedCap) {
      const ratio = s.yellowSpeedCap / mag;
      s.vx *= ratio;
      s.vy *= ratio;
      s.currentSpeed = s.yellowSpeedCap;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// WHITE — Spawns a companion; hitting White buffs companion speed & damage
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("white", {
  onSpawn(s, side) {
    const gap  = 15;
    const comp = new CompanionSquare(s);
    comp.x  = side === "left" ? s.x + s.size + gap : s.x - comp.size - gap;
    comp.y  = s.y + s.size / 2 - comp.size / 2;
    comp.vx = side === "left" ? Math.abs(comp.vx) : -Math.abs(comp.vx);
    companions.push(comp);
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// CYAN — Every 6.5s summons a giant square targeting the enemy
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("cyan", {
  initState(s) {
    s.cyanSkillTimer = 360;
  },
  updateSkill(s) {
    if (s.cyanSkillTimer > 0) {
      s.cyanSkillTimer--;
    } else {
      giantSquares.push(new GiantSquare(s, squares.find((t) => t !== s)));
      s.cyanSkillTimer = 390;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// PURPLE — Hits apply poison; every 4th bounce adds +1s poison duration
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("purple", {
  initState(s) {
    s.bounceCount         = 0;
    s.poisonDurationBonus = 0;
    s.toxicLevel          = 1;
    s.purpleChargeSegments = 0; // 0-4 wall-bounce charges shown on segmented bar
    s.purpleResetTimer    = 0;  // counts down 12 frames (0.2s) before resetting bar
  },
  updateSkill(s) {
    if (s.purpleResetTimer > 0) {
      s.purpleResetTimer--;
      if (s.purpleResetTimer === 0) {
        s.purpleChargeSegments = 0;
      }
    }
  },
  onWallBounce(s) {
    if (s.purpleResetTimer > 0) return; // mid-reset, ignore
    s.bounceCount++;
    s.purpleChargeSegments = Math.min(4, s.purpleChargeSegments + 1);
    if (s.purpleChargeSegments >= 4) {
      s.purpleResetTimer = 12; // 0.2s before bar clears
    }
    if (s.bounceCount >= 4) {
      s.poisonDurationBonus += 60;
      s.bounceCount = 0;
      s.toxicLevel++;
    }
  },
  // Poison application on collision is handled in collision.js (applyPoison),
  // which already reads poisonDurationBonus from the square instance.
});


// ─────────────────────────────────────────────────────────────────────────────
// VIOLET — Charges for 10s (like Brown). When charged, locks aim on enemy,
//           shows dotted line for 1s, then instantly fires beam. Never stops moving.
//           Hit by enemy resets charge for 2s.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("violet", {
  initState(s) {
    s.violetChargeTimer = 0;    // counts up to 600 (10s)
    s.violetCharged     = false; // ready to fire
    s.violetChargePause = 0;    // 2s pause when hit
    s.violetAimTimer    = 0;    // 60-frame aim window before firing
    s.violetAimX        = 0;
    s.violetAimY        = 0;
    s.violetBeamTimer   = 0;    // 8 frames of beam flash after firing
  },
  updateSkill(s) {
    // Hit-pause: stop charging for 2s
    if (s.violetChargePause > 0) {
      s.violetChargePause--;
      return;
    }

    // Beam flash display
    if (s.violetBeamTimer > 0) { s.violetBeamTimer--; return; }

    // Aiming phase: lock aim and count down before firing
    if (s.violetAimTimer > 0) {
      s.violetAimTimer--;
      // Continuously lock aim on enemy during aim window
      const target = squares.find((t) => t !== s);
      if (target) { s.violetAimX = target.x + target.size / 2; s.violetAimY = target.y + target.size / 2; }

      if (s.violetAimTimer === 0) {
        // FIRE
        s.violetCharged     = false;
        s.violetChargeTimer = 0;
        s.violetBeamTimer   = 8;

        const sx      = s.x + s.size / 2;
        const sy      = s.y + s.size / 2;
        const beamEnd = getBeamWallEnd(sx, sy, s.violetAimX, s.violetAimY);

        [...squares, ...clones].forEach((target) => {
          if (target === s || target.mainOwner === s) return;
          if (!lineIntersectsRect(sx, sy, beamEnd.x, beamEnd.y, target)) return;

          const isClone = (target instanceof Clone);
          const damage  = isClone ? 1 : 20;
          target.hp -= damage;
          if (target.onTakeDamage) target.onTakeDamage();
          if (!isClone) SFX.takeDamage();
          floatingNumbers.push(new FloatingNumber(target.x + target.size / 2, target.y, damage.toString(), "#ffffff"));
          spawnSquareParticles(target.x + target.size / 2, target.y + target.size / 2, s.def.color, 10, 1, 3, 5);
          if (!isClone) triggerHitFreeze();
        });
      }
      return;
    }

    // Charge buildup (like Brown's charge)
    if (!s.violetCharged) {
      s.violetChargeTimer++;
      if (s.violetChargeTimer >= 600) {
        s.violetCharged     = true;
        s.violetChargeTimer = 0;
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#8a2be2", 10, 1, 3, 5);
      }
    } else {
      // Charged: lock aim and begin 1s aim window, then recharge
      s.violetCharged = false;
      s.violetAimTimer = 60;
    }
  },
  onHitEnemy(s) {
    // Clash: pause charging for 2s but keep the chargeTimer where it is
    s.violetAimTimer    = 0;
    s.violetChargePause = 120;
    // If already charged, mark uncharged but keep timer at 600 so bar stays full
    if (s.violetCharged) {
      s.violetCharged     = false;
      s.violetChargeTimer = 600; // keep bar full during pause
    }
  },
  onTakeDamage(s) {
    // Taking damage does NOT interrupt violet's charge
  },
  draw(s) {
    // Dotted aim line during aim window only
    if (s.violetAimTimer > 0) {
      const sx      = s.x + s.size / 2;
      const sy      = s.y + s.size / 2;
      const beamEnd = getBeamWallEnd(sx, sy, s.violetAimX, s.violetAimY);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(beamEnd.x, beamEnd.y);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(138, 43, 226, 0.6)";
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Beam flash when fired
    if (s.violetBeamTimer > 0) {
      const sx      = s.x + s.size / 2;
      const sy      = s.y + s.size / 2;
      const beamEnd = getBeamWallEnd(sx, sy, s.violetAimX, s.violetAimY);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(beamEnd.x, beamEnd.y);
      ctx.setLineDash([]);
      ctx.strokeStyle = "#8a2be2";
      ctx.lineWidth   = 8;
      ctx.shadowBlur  = 15;
      ctx.shadowColor = "#8a2be2";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// ORANGE — Each wall bounce emits an expanding damage pulse
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("orange", {
  onWallBounce(s) {
    pulses.push(new Pulse(s));
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// INDIGO — Shoots every 2s; hits bounce and become 1-HP clones after 1s
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("indigo", {
  initState(s) {
    s.indigoShootTimer = 120;
  },
  updateSkill(s) {
    if (s.indigoShootTimer > 0) {
      s.indigoShootTimer--;
    } else {
      const target = squares.find((t) => t !== s);
      if (target) projectiles.push(new Projectile(s, target));
      s.indigoShootTimer = 180;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// PINK — Bouncing projectile; on hit triggers a delayed expanding pulse
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("pink", {
  initState(s) {
    s.pinkSkillTimer       = 0;
    s.pinkProjectileActive = false;
    s.pinkBounceCount      = 0;
  },
  updateSkill(s) {
    if (s.pinkProjectileActive) return;
    if (s.pinkSkillTimer > 0) {
      s.pinkSkillTimer--;
    } else {
      const target = squares.find((t) => t !== s);
      if (target) { projectiles.push(new Projectile(s, target)); s.pinkProjectileActive = true; }
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// BROWN — Wall bounces place a spike (max 30); charges for 6s → fixed high knockback
//         Charge resets for 2s if Brown hits an enemy.
//         Enemy knocked back decays speed per wall bounce.
//         If high-speed enemy hits Brown, enemy speed resets to base; Brown unaffected.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("brown", {
  initState(s) {
    s.brownChargeTimer  = 0;   // counts up to 360 (6s)
    s.brownCharged      = false; // ready to deal high knockback
    s.brownChargePause  = 0;   // 2s pause after hitting enemy
    s.brownKnockbackVal = 18;  // fixed high knockback speed when charged
  },
  updateSkill(s) {
    if (s.brownChargePause > 0) {
      s.brownChargePause--;
      // Don't reset chargeTimer here — onHitEnemy already handled state
      return;
    }
    if (!s.brownCharged) {
      s.brownChargeTimer++;
      if (s.brownChargeTimer >= 360) {
        s.brownCharged = true;
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#c07840", 10, 1, 3, 5);
      }
    }
  },
  onWallBounce(s) {
    // Limit to 30 spikes — remove oldest if over
    if (brownSpikes.length >= 30) brownSpikes.shift();
    let wallSide = null;
    const bx = s.x + s.size / 2, by = s.y + s.size / 2;
    const dL = Math.abs(s.x - arena.x);
    const dR = Math.abs((s.x + s.size) - (arena.x + arena.w));
    const dT = Math.abs(s.y - arena.y);
    const dB = Math.abs((s.y + s.size) - (arena.y + arena.h));
    const minD = Math.min(dL, dR, dT, dB);
    if      (minD === dL) wallSide = "left";
    else if (minD === dR) wallSide = "right";
    else if (minD === dT) wallSide = "top";
    else                  wallSide = "bottom";
    brownSpikes.push(new BrownSpike(s, wallSide, bx, by));
  },
  onHitEnemy(s) {
    if (s.brownCharged) {
      // Charged clash: consume the charge and stop for 2s, but don't reset the timer
      s.brownCharged = false;
      s.brownChargeTimer = 0;
      s.brownChargePause = 120;
    } else {
      // Uncharged clash: pause charge buildup for 2s
      s.brownChargePause = 120;
    }
  },
  draw(s) {
    // Charge indicator is drawn in the UI, nothing to draw on the square itself
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// SKY — Wall bounces spawn clones (cooldown 3s); hits increase clone dmg
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("sky", {
  initState(s) {
    s.skyCloneCooldown = 0;
    s.skyCloneDmg      = 1;
  },
  onWallBounce(s) {
    if (s.skyCloneCooldown > 0) return;
    clones.push(new Clone("sky", s.x, s.y, s, {damage: s.skyCloneDmg || 1}));
    s.skyCloneCooldown = 180; // 3 seconds
  },
  onHitEnemy(s) {
    s.skyCloneDmg++;
    // Update all existing clones on the field to match new damage
    clones.filter(c=>c.cloneType==="sky").forEach((c) => { if (c.owner === s) c.damage = s.skyCloneDmg; });
  },
  updateSkill(s) {
    if (s.skyCloneCooldown > 0) s.skyCloneCooldown--;
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// LIME — Slow random-aim bouncing projectile with chain tether; hooks enemy and reels them in
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("lime", {
  initState(s) {
    s.limeCooldown         = 0;
    s.limeProjectileActive = false;
  },
  updateSkill(s) {
    if (s.limeCooldown > 0) { s.limeCooldown--; return; }
    if (s.limeProjectileActive) return;
    limeProjectiles.push(new LimeProjectile(s));
    s.limeProjectileActive = true;
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// SCARLET — On Clash: Apply 3s Bleed (1 dmg/s). Every 3s: Shoot a fast bullet
//           that instantly triggers all Bleed stacks on hit.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("scarlet", {
  initState(s) {
    s.scarletShootTimer = 300;
  },
  updateSkill(s) {
    if (s.scarletShootTimer > 0) {
      s.scarletShootTimer--;
      return;
    }
    const target = squares.find((t) => t !== s);
    if (target) {
      projectiles.push(new Projectile(s, target));
      spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#cc1a1a", 5, 1, 2, 4);
    }
    s.scarletShootTimer = 300;
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// GRAY — Faster movement; every 0.5s leaves a static clone (lasts 1.5s).
//        Enemy touching the clone is frozen for 2s. Frozen enemy hit = 3 dmg.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("gray", {
  initState(s) {
    s.currentSpeed     = GRAY_SPEED;
    s.grayCloneTimer   = 0;
  },
  updateSkill(s) {
    s.grayCloneTimer++;
    if (s.grayCloneTimer >= 18) {   // 6 frames = 0.1s at 60fps
      s.grayCloneTimer = 0;
      grayStaticClones.push(new GrayStaticClone(s));
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// GOLD — Every 10s drops a static construct (max 2, oldest removed if over cap).
//        Construct heals Gold +1 HP when the enemy hits it.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("gold", {
  initState(s) {
    s.goldConstructTimer = 0;
  },
  updateSkill(s) {
    s.goldConstructTimer++;
    if (s.goldConstructTimer >= 600) {   // 600 frames = 10s
      s.goldConstructTimer = 0;
      const myConstructs = goldConstructs.filter(c => c.owner === s);
      if (myConstructs.length >= 3) {
        // Remove oldest
        const oldest = myConstructs[0];
        const idx    = goldConstructs.indexOf(oldest);
        if (idx !== -1) goldConstructs.splice(idx, 1);
      }
      goldConstructs.push(new GoldConstruct(s));
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// MIST — Shoots 3 projectiles in a tiny arc every 2s (1 dmg each).
//        After hitting the enemy 6 times with projectiles, teleport to a random
//        free spot in the arena (not occupied by an enemy square or construct).
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("mist", {
  initState(s) {
    s.mistShootTimer  = 60;
    s.mistHitCounter  = 0;
    s.mistFlashTimer  = 0;
  },
  updateSkill(s) {
    // Flash pause: bar is full, wait 0.1s then teleport and reset
    if (s.mistFlashTimer > 0) {
      s.mistFlashTimer--;
      if (s.mistFlashTimer === 0) {
        s.mistHitCounter = 0;
        _mistTeleport(s);
      }
      return;
    }
    if (s.mistShootTimer > 0) {
      s.mistShootTimer--;
      return;
    }
    // Fire 3 projectiles in a small arc
    const target = squares.find((t) => t !== s);
    if (target) {
      const dx   = target.x + target.size / 2 - (s.x + s.size / 2);
      const dy   = target.y + target.size / 2 - (s.y + s.size / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const baseAngle = Math.atan2(dy, dx);
      const arcSpread = 0.18;  // ~10 degrees spread each side
      [-arcSpread, 0, arcSpread].forEach((offset) => {
        const angle = baseAngle + offset;
        mistProjectiles.push(new MistProjectile(s, angle));
      });
    }
    s.mistShootTimer = 60;  // 2s cooldown
  },
});
