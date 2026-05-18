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
        s.currentSpeed = s.baseSpeed + (s._rogueSpeedBonus || 0);
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
        s.currentSpeed = (s.baseSpeed + (s._rogueSpeedBonus || 0)) + 3;
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
      spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 12, 1, 3, 6);
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
    s.cooldownTimer    = 180; // start at full cooldown so green doesn't shoot immediately
    s.burstShotsLeft   = 0;
  },
  updateSkill(s) {
    // Compute dynamic passive threshold (3 - reduction, min 1)
    const passiveThreshold = Math.max(1, 3 - (s._roguePassiveThresholdReduction || 0));
    // Compute shooting cooldown in frames (180 = 3s, minus 60 per reduction pick, min 60)
    const shootCooldown = Math.max(60, 180 - (s._rogueShootCooldownReduction || 0) * 60);

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
      s.cooldownTimer  = shootCooldown;
    }
  },
  // onHitEnemy intentionally NOT used — counting is done on projectile hit in game.js
});


// ─────────────────────────────────────────────────────────────────────────────
// BLUE — Every 5s: shoot a slow medium projectile. It releases a BluePulse
//        when it hits OR goes out of bounds. Each projectile hit increments
//        blueHits, which increases BOTH projectile damage and pulse damage/size.
//        An enemy is hit by projectile OR pulse — never both.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("blue", {
  initState(s) {
    s.blueShootCD    = 0;
    s.blueHits       = 0;  // projectile hits landed (grows pulse level)
    s.blueBurstLeft  = 0;  // shots remaining in current burst
    s.blueShotGap    = 0;  // gap timer between burst shots
    s._blueShootCount = 0; // Tracks shot segments: 0 -> 1 -> 2 (Full UI) -> 3 (Reset)
    s._rogueBlueSplinterCount = 0; // tracks shots fired for splinter burst
  },
  updateSkill(s) {
    // ── Pressure Release: triggers once per floor when HP drops below 25 ──
    if (s._rogueBluePressureRelease && !s._rogueBluePressureUsed && s.hp > 0 && s.hp < 25) {
      s._rogueBluePressureUsed = true;
      const cx = s.x + s.size / 2;
      const cy = s.y + s.size / 2;
      // Screen-wide pulse dealing damage = blueHits stack
      const dmg = Math.max(1, s.blueHits || 0);
      const sw = new BluePulse(s, cx, cy, 0, [s]);
      sw.damage  = dmg;
      sw.maxSize = Math.max(arena.w, arena.h) * 3;
      sw.growth  = 30;
      bluePulses.push(sw);
      spawnSquareParticles(cx, cy, s.def.color, 20, 2, 4, 8);
      SFX.takeDamage();
    }

    // Burst in progress
    if (s.blueBurstLeft > 0) {
      if (s.blueShotGap > 0) {
        s.blueShotGap--;
      } else {
        const target = squares.find(t => t !== s);
        if (target) {
          // ── Singularity: homing when blueHits >= 10 ──
          const isHoming = s._rogueBlueSingularity && (s.blueHits || 0) >= 10;

          const proj = new Projectile(s, target);
          proj._isBlue = true;
          // Speed: 60% slower if bounce upgrade, otherwise 40% slower than normal projectile speed
          const bouncing = s._rogueBlueBounce || false;
          const spd = bouncing ? PROJECTILE_SPEED * 0.4 : PROJECTILE_SPEED * 0.8;
          const dx = target.x + target.size / 2 - proj.x;
          const dy = target.y + target.size / 2 - proj.y;
          const dist = Math.hypot(dx, dy) || 1;
          proj.vx = (dx / dist) * spd;
          proj.vy = (dy / dist) * spd;
          if (bouncing) {
            proj.isGreenBounce = true;
            proj.bounceTimer = 300;
            proj._rogueBlueBounce = true;
          }
          if (isHoming) {
            proj._blueHoming       = true;
            proj._blueHomingTarget = target;
            proj._blueHomingSpeed  = spd;
          }

          if (s._rogueBlueEmpoweredShot) {
            s._blueShootCount = (s._blueShootCount || 0) + 1;
            if (s._blueShootCount >= 3) {
              proj._isBluEmpowered = true;
              s._blueShootCount = 0;
            }
          }

          projectiles.push(proj);

          // ── Splinter Burst: every Nth shot fires 8 cross-shaped projectiles ──
          if (s._rogueBlueSplinterThreshold > 0) {
            s._rogueBlueSplinterCount = (s._rogueBlueSplinterCount || 0) + 1;
            if (s._rogueBlueSplinterCount >= s._rogueBlueSplinterThreshold) {
              s._rogueBlueSplinterCount = 0;
              const cx = s.x + s.size / 2;
              const cy = s.y + s.size / 2;
              const splinterSpd = PROJECTILE_SPEED * 1.2;
              // 8 directions: cardinal + diagonal
              const dirs = [
                [1, 0], [-1, 0], [0, 1], [0, -1],
                [1, 1], [1, -1], [-1, 1], [-1, -1],
              ];
              dirs.forEach(([dvx, dvy]) => {
                const len = Math.hypot(dvx, dvy);
                const sp = new Projectile(s, null);
                sp.x  = cx - 4;
                sp.y  = cy - 4;
                sp.vx = (dvx / len) * splinterSpd;
                sp.vy = (dvy / len) * splinterSpd;
                sp._isSplinter     = true;
                sp._splinterDamage = 2;
                projectiles.push(sp);
              });
              spawnSquareParticles(cx, cy, s.def.color, 12, 1, 3, 6);
            }
          }
        }
        s.blueBurstLeft--;
        s.blueShotGap = 35;
      }
      return;
    }

    // ── Condenser: each pick reduces the 300-frame (5s) cooldown by 30 frames (0.5s) ──
    const blueCD = Math.max(60, 300 - (s._rogueBlueCondenser || 0) * 30);
    s.blueShootCD++;
    if (s.blueShootCD >= blueCD) {
      s.blueShootCD   = 0;
      s.blueBurstLeft = s.projectileCount;
      s.blueShotGap   = 0;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// YELLOW — Speed increases with every wall bounce; hitting enemy raises cap
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("yellow", {
  initState(s) {
    s.yellowWallBoost = 1;
    s.yellowAccelGain = 0.08;
    s.yellowSpeedCap  = 3.0;
    s.yellowCapGrowth = 0.5;
    s._yellowPulseTimer = 0;   // frames since last speed pulse
  },
  getCollisionDamage(s) {
    let dmg = Math.max(1, Math.floor(s.currentSpeed));
    // High-speed clash damage bonus (+10 at >= 10 speed)
    if (s._rogueYellowSpeedClashDmg && s.currentSpeed >= 10) dmg += 10;
    return dmg;
  },
  onWallBounce(s) {
    s.currentSpeed += s.yellowWallBoost;
    // Speed pulse: fires on every bounce when speed >= 5
    if (s._rogueYellowSpeedPulse && s.currentSpeed >= 5) {
      const fp = new FollowingPulse(s, null, s.x + s.size / 2, s.y + s.size / 2, 0);
      fp.color        = s.def.color;
      fp.maxSize      = 350;
      fp.growth       = 10;
      fp.delay        = 0;
      fp.active       = true;
      fp._fixedDamage = 2;
      followingPulses.push(fp);
    }
    // Bounce shockwave counter
    if (s._rogueYellowBounceShockwaveThreshold > 0) {
      s._rogueYellowBounceCount = (s._rogueYellowBounceCount || 0) + 1;
      if (s._rogueYellowBounceCount >= s._rogueYellowBounceShockwaveThreshold) {
        s._rogueYellowBounceCount = 0;
        // Spawn orange-style shockwave
        const sw = new Pulse(s);
        sw.color     = s.def.color;
        sw.thickness = 25;
        // Orange pulse size (default Pulse: maxSize=2500, growth=12)
        sw._yellowSpeedDmg = Math.max(1, Math.floor(s.currentSpeed * 0.5));
        sw._isYellowShockwave = true;
        pulses.push(sw);
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 10, 1, 3, 6);
      }
    }
  },
  onHitEnemy(s) {
    const speedAtClash = s.currentSpeed;
    s.yellowWallBoost += s.yellowAccelGain;
    s.yellowSpeedCap  += s.yellowCapGrowth;
    // Speed retention: keep 20% of built-up speed above base instead of full reset
    if (s._rogueYellowSpeedRetain) {
      const baseSpd = s.baseSpeed + (s._rogueSpeedBonus || 0);
      const excess  = speedAtClash - baseSpd;
      s.currentSpeed = baseSpd + Math.max(0, excess * 0.2);
    } else {
      s.currentSpeed = s.baseSpeed;
    }
    s.normalizeVelocity();
    // Clash heal at 5+ speed (check pre-clash speed)
    if (s._rogueYellowClashHeal && speedAtClash >= 5) {
      s.hp = Math.min(s.maxHp, s.hp + 3);
      SFX.heal();
      floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y - 14, "+3", "#00ff44"));
    }
    // Reset bounce shockwave counter on clash with enemy
    if (s._rogueYellowBounceShockwaveThreshold > 0) {
      s._rogueYellowBounceCount = 0;
    }
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
          const actualViolet = (target.absorbDamage) ? target.absorbDamage(damage) : (target.hp -= damage, damage);
          if (target.onTakeDamage) target.onTakeDamage();
          if (!isClone && actualViolet > 0) SFX.takeDamage();
          floatingNumbers.push(new FloatingNumber(target.x + target.size / 2, target.y, actualViolet.toString(), s.def.color));
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
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 10, 1, 3, 5);
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
      ctx.strokeStyle = s.def.color;
      ctx.lineWidth   = 8;
      ctx.shadowBlur  = 15;
      ctx.shadowColor = s.def.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// ORANGE — Each wall bounce emits an expanding damage pulse
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("orange", {
  initState(s) {
    s._rogueOrangeRadiationTimer    = 0;
    s._rogueOrangeRadiationInterval = 0;
  },
  onWallBounce(s) {
    pulses.push(new Pulse(s));
  },
  updateSkill(s) {
    // ── Radiation: periodic following pulse toward enemy ──
    if (s._rogueOrangeRadiationInterval > 0) {
      s._rogueOrangeRadiationTimer = (s._rogueOrangeRadiationTimer || 0) + 1;
      if (s._rogueOrangeRadiationTimer >= s._rogueOrangeRadiationInterval) {
        s._rogueOrangeRadiationTimer = 0;
        const target = squares.find(t => t !== s);
        if (target) {
          const fp = new FollowingPulse(s, target, s.x + s.size / 2, s.y + s.size / 2, 0);
          fp.delay  = 0;
          fp.active = true;
          fp._fixedDamage = 1; // same as orange wall pulse (1 dmg)
          followingPulses.push(fp);
        }
      }
    }
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
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 10, 1, 3, 5);
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
// SCARLET — Every 7 clashes or wall bounces: Shoot a fast bullet that detonates
//           all stored delayed damage on hit. On Clash: Stores 4 delayed damage
//           on the enemy (shown as a health bar preview).
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("scarlet", {
  initState(s) {
    s.scarletCounter = 0; // counts clashes + bounces; shoots at 7
  },
  updateSkill(s) {
    // nothing to tick — shooting is event-driven
  },
  onHitEnemy(s) {
    // Count the clash, apply delayed damage, maybe shoot
    const enemy = squares.find(t => t !== s);
    if (enemy) enemy.addScarletDelayed(4);
    s.scarletCounter++;
    if (s.scarletCounter >= 7) {
      const target = squares.find(t => t !== s);
      if (target) {
        projectiles.push(new Projectile(s, target));
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 5, 1, 2, 4);
      }
      s.scarletCounter = 0;
    }
  },
  onWallBounce(s) {
    s.scarletCounter++;
    if (s.scarletCounter >= 7) {
      const target = squares.find(t => t !== s);
      if (target) {
        projectiles.push(new Projectile(s, target));
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, s.def.color, 5, 1, 2, 4);
      }
      s.scarletCounter = 0;
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// GRAY — +4 base Clash Damage; shoots a projectile every 4s dealing 4 damage.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("gray", {
  initState(s) {
    s.bonusDamage      = (s.bonusDamage || 0) + 4;  // permanent +4 clash damage
    s.grayProjTimer    = 0;
  },
  updateSkill(s) {
    s.grayProjTimer++;
    if (s.grayProjTimer >= 240) {  // 4s at 60fps
      s.grayProjTimer = 0;
      const enemy = squares.find(t => t !== s);
      if (enemy) {
        const p = new Projectile(s, enemy);
        p._grayProjDamage = 4;
        projectiles.push(p);
      }
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// JADE — Every 0.3s leaves a static clone (lasts 1.5s).
//        Enemy touching the clone is frozen for 3s. Frozen enemy hit = 10 dmg.
//        Slightly faster than others.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("jade", {
  initState(s) {
    s.baseSpeed       = BASE_SPEED + 0.6; // jade is slightly faster than base
    s.currentSpeed    = s.baseSpeed;
    s.grayCloneTimer  = 0;
  },
  updateSkill(s) {
    s.grayCloneTimer++;
    if (s.grayCloneTimer >= 18) {  // 0.3s at 60fps
      s.grayCloneTimer = 0;
      grayStaticClones.push(new GrayStaticClone(s));
    }
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// GOLD — On clashing with an enemy, drops 2 Gold Coins at the clash point in
//        random directions. Collecting a coin grants +50% speed for 2s and
//        fires a fast projectile dealing 4 damage.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("gold", {
  initState(s) {
    s.goldClashCoinCooldown = 0;  // prevents coin spam from rapid re-collisions
  },
  updateSkill(s) {
    if (s.goldClashCoinCooldown > 0) s.goldClashCoinCooldown--;
  },
  onHitEnemy(s) {
    if (s.goldClashCoinCooldown > 0) return;
    const enemy = squares.find(t => t !== s);
    if (!enemy) return;
    dropGoldCoinsOnClash(s, enemy);
    s.goldClashCoinCooldown = 30;  // 0.5s cooldown so one clash = one drop
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


// ─────────────────────────────────────────────────────────────────────────────
// SAPPHIRE — on taking damage gain +4 HP, +8px size,
//            +1 bonus damage. (Cooldown: 4s)
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("sapphire", {
  initState(s) {
    s.sapphirePassiveCD = 0;
  },
  updateSkill(s) {
    if (s.sapphirePassiveCD > 0) s.sapphirePassiveCD--;
  },
  onTakeDamage(s) {
    if (s.sapphirePassiveCD > 0) return;
    s.bonusDamage++;
    s.hp = Math.min(s.maxHp, s.hp + 4);
    SFX.heal();
    floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, "+4", "#00ff44"));
    s.size += 8;
    s.sapphirePassiveCD = COOLDOWN_FRAMES;
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// TOPAZ — Every 10s drops a static construct (max 3, oldest removed if over
//         cap). Constructs heal Topaz +5 HP when the enemy hits them.
//         Clash Damage permanently increased by +3 on spawn.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("topaz", {
  initState(s) {
    s.topazConstructTimer = 0;
    s.bonusDamage = (s.bonusDamage || 0) + 3;  // Topaz starts with +3 clash damage
  },
  updateSkill(s) {
    s.topazConstructTimer++;
    if (s.topazConstructTimer >= 600) {   // 600 frames = 10s
      s.topazConstructTimer = 0;
      const myConstructs = goldConstructs.filter(c => c.owner === s);
      if (myConstructs.length >= 3) {
        // Remove oldest construct
        const oldest = myConstructs[0];
        const idx    = goldConstructs.indexOf(oldest);
        if (idx !== -1) goldConstructs.splice(idx, 1);
      }
      const construct       = new GoldConstruct(s);
      construct.color       = "#fff200";  // Topaz yellow tint
      construct._isTopaz    = true;
      goldConstructs.push(construct);
    }
  },
});


// MAGENTA — Every 4.5s, fires a beam toward the enemy. On hit, tethers the
//           enemy for 4s. While tethered, deals 1 dmg/s to the enemy and
//           100% of any damage Magenta takes is reflected back to the enemy.
//           The link CANNOT be interrupted. Clash only pauses the CD (like violet).
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("magenta", {
  initState(s) {
    s.magentaBeamCD      = 270;    // frames until next shot (starts ready)
    s.magentaBeamActive  = false; // true while beam is in flight or tethered
    s.magentaLastHp      = s.hp;  // tracks hp each frame to compute damage delta
    s.magentaCDPause     = 0;     // frames to pause CD (clash penalty, like violet)
    s.magentaLinkDmgTick = 0;     // frames since last link damage tick
  },
  updateSkill(s) {
    s.magentaLastHp = s.hp;  // snapshot before any damage this frame

    // Clash CD pause: stop counting down while paused (don't reset)
    if (s.magentaCDPause > 0) {
      s.magentaCDPause--;
      return;
    }

    if (s.magentaBeamCD > 0) { s.magentaBeamCD--; return; }
    if (s.magentaBeamActive) {
      // Tick link damage: 1 dmg per second (60 frames) while tethered
      const beam = magentaBeams.find(mb => mb.owner === s && mb.tethered && mb.tetherTarget);
      if (beam) {
        s.magentaLinkDmgTick++;
        if (s.magentaLinkDmgTick >= 60) {
          s.magentaLinkDmgTick = 0;
          const target = beam.tetherTarget;
          const actualTether = (target.absorbDamage) ? target.absorbDamage(1) : (target.hp -= 1, 1);
          target.onTakeDamage();
          SFX.takeDamage();
          floatingNumbers.push(new FloatingNumber(target.x + target.size / 2, target.y - 10, actualTether === 0 ? "0" : "1", s.def.color));
          spawnSquareParticles(target.x + target.size / 2, target.y + target.size / 2, s.def.color, 4, 1, 2, 4);
        }
      }
      return;
    }

    // Fire the beam
    s.magentaLinkDmgTick = 0;
    magentaBeams.push(new MagentaBeam(s));
    s.magentaBeamActive = true;
  },
  onHitEnemy(s) {
    // Clash: pause CD but do NOT cancel the link or reset CD
    // The link itself cannot be interrupted
    if (!s.magentaBeamActive) {
      // Only pause the CD if we're not actively linked
      s.magentaCDPause = 90; // 1.5s pause
    }
  },
  onTakeDamage(s) {
    // Find active tethered beam belonging to this square
    const beam = magentaBeams.find(mb => mb.owner === s && mb.tethered && mb.tetherTarget);
    if (!beam) return;

    const damageTaken = s.magentaLastHp - s.hp;
    if (damageTaken <= 0) return;

    const reflected = damageTaken; // 100% reflection
    const target    = beam.tetherTarget;
    const actualReflect = (target.absorbDamage) ? target.absorbDamage(reflected) : (target.hp -= reflected, reflected);
    target.onTakeDamage();
    SFX.takeDamage();
    floatingNumbers.push(new FloatingNumber(target.x + target.size / 2, target.y - 10, actualReflect.toString(), s.def.color));
    spawnSquareParticles(target.x + target.size / 2, target.y + target.size / 2, s.def.color, 6, 1, 3, 5);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EMERALD — Every 6s, locks completely in place for 2s to fire a rapid-fire
//           barrage of 12 volleys toward the enemy (direction locked at start).
//           Each volley is a bullet that comes from a different lane spread
//           across Emerald's square width — all bullets travel in parallel.
//           Each bullet deals 2 damage.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("emerald", {
  initState(s) {
    s.emeraldCD           = 360; // 6s cooldown before first barrage
    s.emeraldBarraging    = false;
    s.emeraldBarrageTimer = 0;   // 120 frames = 2s
    s.emeraldShotsLeft    = 0;   // volleys remaining
    s.emeraldShotGap      = 0;
    // Locked direction (set once when barrage starts)
    s.emeraldVx           = 0;
    s.emeraldVy           = 0;
    // Perpendicular axis for spread
    s.emeraldPerpX        = 0;
    s.emeraldPerpY        = 0;
  },
  updateSkill(s) {
    if (s.emeraldBarraging) {
      s.stopTimer = 2; // lock in place

      s.emeraldBarrageTimer--;

      if (s.emeraldShotGap > 0) {
        s.emeraldShotGap--;
      } else if (s.emeraldShotsLeft > 0) {
        // Random position across Emerald's square width (perpendicular to fire dir)
        const t = (Math.random() - 0.5); // -0.5 to +0.5
        const offsetX = t * s.size * s.emeraldPerpX;
        const offsetY = t * s.size * s.emeraldPerpY;
        const cx = s.x + s.size / 2;
        const cy = s.y + s.size / 2;
        emeraldProjectiles.push(new EmeraldBullet(
          s,
          cx + offsetX,
          cy + offsetY,
          s.emeraldVx,
          s.emeraldVy
        ));
        s.emeraldShotsLeft--;
        s.emeraldShotGap = Math.floor(Math.random() * 4); // random gap 0–3 frames
      }

      if (s.emeraldBarrageTimer <= 0) {
        s.emeraldBarraging = false;
        s.emeraldCD        = 360;
      }
      return;
    }

    if (s.emeraldCD > 0) { s.emeraldCD--; return; }

    // Lock the fire direction toward the enemy right now
    const target = squares.find(t => t !== s);
    const tx = target ? target.x + target.size / 2 : s.x + 100;
    const ty = target ? target.y + target.size / 2 : s.y;
    const dx = tx - (s.x + s.size / 2);
    const dy = ty - (s.y + s.size / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 15;
    s.emeraldVx = (dx / dist) * speed;
    s.emeraldVy = (dy / dist) * speed;
    // Perpendicular axis (rotate 90°)
    s.emeraldPerpX = -dy / dist;
    s.emeraldPerpY =  dx / dist;

    s.emeraldBarraging    = true;
    s.emeraldBarrageTimer = 180;
    s.emeraldShotsLeft    = 70;
    s.emeraldShotGap      = 0;
  },
  onHitEnemy(s) {
    // CD and barrage cannot be interrupted
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// RUBY — Every 4s, shoots a projectile in a random direction. It bounces
//        exactly once off a wall (new random direction after bounce). A searing
//        laser line connects Ruby to the bounce point — crossing it deals 2 dmg.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("ruby", {
  initState(s) {
    s.rubyCD              = 240; // 4s before first shot
    s.rubyProjectileActive = false;
  },
  updateSkill(s) {
    if (s.rubyProjectileActive) return;
    if (s.rubyCD > 0) { s.rubyCD--; return; }

    rubyProjectiles.push(new RubyProjectile(s));
    s.rubyProjectileActive = true;
  },
  onHitEnemy(s) {
    // Clash cannot interrupt Ruby's ability or reset CD
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// CRIMSON — On Clash: Apply 4s Bleed to enemy AND heal self +1.
//           Both the bleed duration and the heal scale up by +1 per 10 HP lost
//           (i.e. floor((maxHp - currentHp) / 10) bonus stacks).
// ─────────────────────────────────────────────────────────────────────────────
// CRIMSON — On Clash: Apply bleed to enemy AND heal self +1 (5s cooldown on heal).
//           Bleed duration and heal both scale +1 per 10 HP lost.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("crimson", {
  initState(s) {
    s.crimsonHealCD    = 0;   // 5s heal cooldown (300 frames)
    s.crimsonDebounce  = 0;   // short debounce to avoid multi-trigger per clash
  },
  updateSkill(s) {
    if (s.crimsonHealCD   > 0) s.crimsonHealCD--;
    if (s.crimsonDebounce > 0) s.crimsonDebounce--;
  },
  onHitEnemy(s) {
    if (s.crimsonDebounce > 0) return;
    const enemy = squares.find(t => t !== s);
    if (!enemy) return;

    const hpLost = Math.max(0, s.maxHp - s.hp);
    const bonus  = Math.floor(hpLost / 10);
    const bleedS = 4 + bonus;   // bleed seconds
    const healAmt = 1 + bonus;  // HP to heal

    // Always apply bleed to enemy
    enemy.applyBleed(bleedS * 60, s.def.color);
    spawnSquareParticles(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, s.def.color, 6, 1, 2, 4);

    // Heal only if CD is ready
    if (s.crimsonHealCD <= 0) {
      s.hp = Math.min(s.maxHp, s.hp + healAmt);
      floatingNumbers.push(new FloatingNumber(
        s.x + s.size / 2, s.y - 10,
        `+${healAmt}`, "#00ff44"
      ));
      s.crimsonHealCD = 300; // 5s
    }

    s.crimsonDebounce = 20; // ~0.33s debounce
  },
});


// ─────────────────────────────────────────────────────────────────────────────
// SILVER — +3 base Clash Damage (4 total).
//          Every 4s, fires a SilverProjectile in a random direction.
//          The projectile bounces off walls; 0.8s after its first wall bounce
//          it converts into a SilverSquare pickup (owned by this Silver).
//          The projectile hits enemies for 4 dmg but does NOT drop a pickup on hit.
//          Will not fire if there are already 4 pickups in the arena.
// ─────────────────────────────────────────────────────────────────────────────
registerBehavior("silver", {
  initState(s) {
    s.bonusDamage       = (s.bonusDamage || 0) + 3; // +3 clash → 4 total
    s.silverSpawnTimer  = 0;
  },
  updateSkill(s) {
    s.silverSpawnTimer++;
    if (s.silverSpawnTimer >= SILVER_SPAWN_INTERVAL) { // 240 frames = 4s
      if (silverSquares.length < SILVER_MAX_COUNT) {
        s.silverSpawnTimer = 0; // only reset if actually fired
        silverProjectiles.push(new SilverProjectile(s));
      }
    }
  },
});
