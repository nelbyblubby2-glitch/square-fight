// ── Square vs Square ──────────────────────────────────────────────────────────
function resolveCollision(s1, s2) {
  const dx      = s1.x + s1.size / 2 - (s2.x + s2.size / 2);
  const dy      = s1.y + s1.size / 2 - (s2.y + s2.size / 2);
  const minDist = (s1.size + s2.size) / 2;
  const dist    = Math.hypot(dx, dy) || 1;

  if (dist >= minDist) return;

  const overlapLeft   = Math.max(s1.x, s2.x);
  const overlapRight  = Math.min(s1.x + s1.size, s2.x + s2.size);
  const overlapTop    = Math.max(s1.y, s2.y);
  const overlapBottom = Math.min(s1.y + s1.size, s2.y + s2.size);
  const hitX          = (overlapLeft  + overlapRight)  / 2;
  const hitY          = (overlapTop   + overlapBottom) / 2;

  const push = (minDist - dist) / 2;
  const nx   = dx / dist;
  const ny   = dy / dist;
  s1.x += nx * push;  s1.y += ny * push;
  s2.x -= nx * push;  s2.y -= ny * push;
  // Swap directions (each square takes the other's direction) but keeps its own speed.
  const s1len = Math.hypot(s1.vx, s1.vy) || 1;
  const s2len = Math.hypot(s2.vx, s2.vy) || 1;
  const s1dx = s1.vx / s1len, s1dy = s1.vy / s1len;
  const s2dx = s2.vx / s2len, s2dy = s2.vy / s2len;
  s1.vx = s2dx * s1.currentSpeed;
  s1.vy = s2dy * s1.currentSpeed;
  s2.vx = s1dx * s2.currentSpeed;
  s2.vy = s1dy * s2.currentSpeed;

  // Small independent random angle nudge on each square to break up repetitive head-on bounces.
  const maxAngle = Math.PI / 18; // ±10 degrees
  const rotateV = (s, angle) => {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rvx = s.vx * cos - s.vy * sin;
    const rvy = s.vx * sin + s.vy * cos;
    s.vx = rvx; s.vy = rvy;
    s.normalizeVelocity();
  };
  rotateV(s1, (Math.random() - 0.5) * 2 * maxAngle);
  rotateV(s2, (Math.random() - 0.5) * 2 * maxAngle);

  // Brown knockback: if charged, blast enemy away using the knockback system.
  // Enemy re-hitting Brown while still in knockback gets knockback cancelled and Brown is unaffected.
  const brownApply = (brown, enemy) => {
    if (brown.brownCharged) {
      const srcX = brown.x + brown.size / 2;
      const srcY = brown.y + brown.size / 2;
      enemy.applyKnockbackFrom(srcX, srcY, brown.brownKnockbackVal);
    }
  };
  if (s1.def.type === "brown") brownApply(s1, s2);
  if (s2.def.type === "brown") brownApply(s2, s1);

  // Knockback dampens by 50% on each enemy hit (does not cancel — square keeps moving)
  if (Math.hypot(s1.knockbackVx, s1.knockbackVy) > 0.3) {
    s1.knockbackVx *= 0.5;
    s1.knockbackVy *= 0.5;
  }
  if (Math.hypot(s2.knockbackVx, s2.knockbackVy) > 0.3) {
    s2.knockbackVx *= 0.5;
    s2.knockbackVy *= 0.5;
  }

  if (s1.hitImmunityTimer > 0 || s2.hitImmunityTimer > 0) return;

  if (s1.def.type === "purple") { s2.applyPoison(60 + s1.poisonDurationBonus, s1.def.color); }
  if (s2.def.type === "purple") { s1.applyPoison(60 + s2.poisonDurationBonus, s2.def.color); }

  // Scarlet delayed damage is applied via onHitEnemy (characters.js)

  const d1 = s2.getCollisionDamage();
  // Apply Red's bounce empower as a one-time +10 to this clash's damage only
  let empowerBonus1 = 0;
  let empowerBonus2 = 0;
  if (s1._rogueBounceEmpowered) {
    empowerBonus1 = 10;
    s1._rogueBounceEmpowered = false;
  }
  if (s2._rogueBounceEmpowered) {
    empowerBonus2 = 10;
    s2._rogueBounceEmpowered = false;
  }
  const d2 = s1.getCollisionDamage();
  // Jade gets +6 bonus dmg when hitting a jadebound enemy
  // actual_d2 = damage s1 deals to s2, actual_d1 = damage s2 deals to s1
  let actual_d2 = d2 + empowerBonus2 + (s2.jadeboundTimer > 0 && s1.def.type === "jade" ? 6 : 0);
  let actual_d1 = d1 + empowerBonus1 + (s1.jadeboundTimer > 0 && s2.def.type === "jade" ? 6 : 0);
  if (s1.jadeboundTimer > 0) s1.jadeboundTimer = 0;
  if (s2.jadeboundTimer > 0) s2.jadeboundTimer = 0;
  // Gold body deals 2 dmg on direct collision
  if (s2.def.type === "gold") actual_d1 = Math.max(actual_d1, 2);
  if (s1.def.type === "gold") actual_d2 = Math.max(actual_d2, 2);
  const shown_d1 = s1.absorbDamage(actual_d1);
  const shown_d2 = s2.absorbDamage(actual_d2);
  s1.onTakeDamage();  s2.onTakeDamage();
  s1.onHitEnemy();    s2.onHitEnemy();
  SFX.takeDamage();
  floatingNumbers.push(new FloatingNumber(s1.x + s1.size / 2, s1.y, shown_d1, s2.def.color));
  floatingNumbers.push(new FloatingNumber(s2.x + s2.size / 2, s2.y, shown_d2, s1.def.color));
  spawnHitEffect(hitX, hitY, "#ffffff");

  s1.hitImmunityTimer = HIT_IMMUNITY;
  s2.hitImmunityTimer = HIT_IMMUNITY;
  for (let i = 0; i < 2; i++) particles.push(new Particle(hitX, hitY, "#fff", 1.25));

  // If this clash involved Lime on last chain, end the pull immediately so they separate
  const checkEndPull = (lime, enemy) => {
    if (lime.def.type !== "lime") return;
    const lp = limeProjectiles.find(lp2 => lp2.owner === lime && lp2.hooked && lp2.chain.length === 1 && lp2.pullTarget === enemy);
    if (!lp) return;
    lp._endPull();
    // Give enemy a velocity away from Lime so they separate cleanly
    const dx = enemy.x + enemy.size / 2 - (lime.x + lime.size / 2);
    const dy = enemy.y + enemy.size / 2 - (lime.y + lime.size / 2);
    const dist = Math.hypot(dx, dy) || 1;
    enemy.vx = (dx / dist) * enemy.currentSpeed;
    enemy.vy = (dy / dist) * enemy.currentSpeed;
  };
  checkEndPull(s1, s2);
  checkEndPull(s2, s1);
}

// ── Companion vs Square (or clone) ───────────────────────────────────────────
function resolveCompanionCollision(c, s) {
  const dx      = c.x + c.size / 2 - (s.x + s.size / 2);
  const dy      = c.y + c.size / 2 - (s.y + s.size / 2);
  const minDist = (c.size + s.size) / 2;
  const dist    = Math.hypot(dx, dy);

  if (dist < minDist && c.bounceCooldown <= 0) {
    const nx  = dx / dist;
    const ny  = dy / dist;
    const dot = c.vx * nx + c.vy * ny;
    c.vx -= 2 * dot * nx;
    c.vy -= 2 * dot * ny;
    c.x  += nx * (minDist - dist + 1);
    c.y  += ny * (minDist - dist + 1);
    c.bounceCooldown = 5;

    if (s === c.owner) {
      c.damage++;
      c.speedBoostTimer = 120;
      c.canDamage = true;
      spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, c.def ? c.def.color : "#ffffff", 5, 1, 3, 5);
    } else if (c.canDamage) {
      const actualCompDmg = (s.absorbDamage) ? s.absorbDamage(c.damage) : (s.hp -= c.damage, c.damage);
      s.onTakeDamage();
      if (actualCompDmg > 0) {
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualCompDmg, c.owner ? c.owner.def.color : (c.def ? c.def.color : "#ffffff")));
      }
      spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, c.def ? c.def.color : "#ffffff", 5, 1, 3, 5);
      triggerHitFreeze();
      c.canDamage = false;
    }
  }

  // Companion vs all clones (indigo + sky)
  if (!c.canDamage) return;
  for (const cloneList of [clones]) {
    for (let ci = cloneList.length - 1; ci >= 0; ci--) {
      const clone = cloneList[ci];
      if (clone.mainOwner === c.owner) continue;

      const cdx   = c.x + c.size / 2 - (clone.x + clone.size / 2);
      const cdy   = c.y + c.size / 2 - (clone.y + clone.size / 2);
      const cDist = Math.hypot(cdx, cdy);
      if (cDist >= (c.size + clone.size) / 2) continue;

      clone.hp = 0;
      spawnSquareParticles(clone.x + clone.size / 2, clone.y + clone.size / 2, clone.def ? clone.def.color : "#ffffff", 8, 1, 4, 6);

      const cnx  = cdx / (cDist || 1);
      const cny  = cdy / (cDist || 1);
      const cdot = c.vx * cnx + c.vy * cny;
      c.vx -= 2 * cdot * cnx;
      c.vy -= 2 * cdot * cny;
      break;
    }
  }
}

// ── Indigo clone vs Square ────────────────────────────────────────────────────
function resolveCloneCollision(c, s) {
  const dx      = c.x + c.size / 2 - (s.x + s.size / 2);
  const dy      = c.y + c.size / 2 - (s.y + s.size / 2);
  const minDist = (c.size + s.size) / 2;
  const dist    = Math.hypot(dx, dy) || 1;

  if (dist >= minDist) return;

  const dmg = c.damage || 1;
  const actualCloneDmg = (s.absorbDamage) ? s.absorbDamage(dmg) : (s.hp -= dmg, dmg);
  c.hp  = 0;
  if (s.onTakeDamage) s.onTakeDamage();
  if (actualCloneDmg > 0) {
    SFX.takeDamage();
    floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, actualCloneDmg, c.def ? c.def.color : "#ffffff"));
  }
  spawnSquareParticles((c.x + s.x) / 2, (c.y + s.y) / 2, c.def ? c.def.color : "#ffffff", 8, 1, 3, 5);
}

// ── Gold construct vs Square ──────────────────────────────────────────────────
function resolveConstructCollision(construct, s) {
  if (!construct.formed) return;

  const dx      = s.x + s.size / 2 - (construct.x + construct.size / 2);
  const dy      = s.y + s.size / 2 - (construct.y + construct.size / 2);
  const minDist = (s.size + construct.size) / 2;
  const dist    = Math.hypot(dx, dy) || 1;

  if (dist >= minDist) return;

  // Push the square out (construct is immovable)
  const push = minDist - dist;
  const nx   = dx / dist;
  const ny   = dy / dist;
  s.x += nx * push;
  s.y += ny * push;

  // Reflect velocity off the construct face
  const dot = s.vx * nx + s.vy * ny;
  if (dot < 0) {
    s.vx -= 2 * dot * nx;
    s.vy -= 2 * dot * ny;
    s.normalizeVelocity();
  }

  // Heal the construct owner when the enemy hits it (amount varies by owner type)
  if (construct.hitCooldown <= 0) {
    const healAmt  = construct._isTopaz ? 3 : 3;
    const glowColor = construct.owner.def.color;
    construct.owner.hp = Math.min(100, construct.owner.hp + healAmt);
    SFX.heal();
    floatingNumbers.push(new FloatingNumber(
      construct.owner.x + construct.owner.size / 2,
      construct.owner.y - 10, `+${healAmt}`, "#00ff44"
    ));
    spawnSquareParticles(construct.x + construct.size / 2, construct.y + construct.size / 2, glowColor, 6, 1, 3, 4);
    construct.hitCooldown = 40;
  }
}
