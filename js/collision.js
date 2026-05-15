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
  [s1.vx, s2.vx] = [s2.vx, s1.vx];
  [s1.vy, s2.vy] = [s2.vy, s1.vy];

  // Brown knockback: if charged, blast enemy at fixed high speed. It decays per wall bounce.
  // If enemy hits Brown at high knockback speed, reset enemy speed to base; Brown is unaffected.
  const brownApply = (brown, enemy) => {
    if (enemy.brownKnockbackDecaying && enemy.currentSpeed > BASE_SPEED) {
      // Enemy bounced off Brown while still flying fast — reset enemy to base, Brown unaffected
      enemy.currentSpeed = BASE_SPEED;
      enemy.brownKnockbackDecaying = false;
      enemy.normalizeVelocity();
      // Restore Brown's velocity (un-swap)
      [brown.vx, enemy.vx] = [enemy.vx, brown.vx];
      [brown.vy, enemy.vy] = [enemy.vy, brown.vy];
      brown.normalizeVelocity();
      return;
    }
    if (brown.brownCharged) {
      enemy.currentSpeed       = brown.brownKnockbackVal;
      enemy.brownKnockbackDecaying = true;
      enemy.normalizeVelocity();
    }
  };
  if (s1.def.type === "brown") brownApply(s1, s2);
  if (s2.def.type === "brown") brownApply(s2, s1);

  if (s1.hitImmunityTimer > 0 || s2.hitImmunityTimer > 0) return;

  if (s1.def.type === "purple") { s2.applyPoison(60 + s1.poisonDurationBonus); }
  if (s2.def.type === "purple") { s1.applyPoison(60 + s2.poisonDurationBonus); }

  if (s1.def.type === "scarlet") s2.applyBleed(300);
  if (s2.def.type === "scarlet") s1.applyBleed(300);

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
  // Frozen bonus: hitting a Gray-frozen enemy deals 10 dmg and breaks the freeze
  let actual_d1 = s1.grayFreezeTimer > 0 ? 10 : d1 + empowerBonus1;
  let actual_d2 = s2.grayFreezeTimer > 0 ? 10 : d2 + empowerBonus2;
  if (s1.grayFreezeTimer > 0) s1.grayFreezeTimer = 0;
  if (s2.grayFreezeTimer > 0) s2.grayFreezeTimer = 0;
  // Gold body deals 2 dmg on direct collision
  if (s2.def.type === "gold") actual_d1 = Math.max(actual_d1, 2);
  if (s1.def.type === "gold") actual_d2 = Math.max(actual_d2, 2);
  s1.hp -= actual_d1;  s2.hp -= actual_d2;
  s1.onTakeDamage();  s2.onTakeDamage();
  s1.onHitEnemy();    s2.onHitEnemy();
  SFX.takeDamage();
  floatingNumbers.push(new FloatingNumber(s1.x + s1.size / 2, s1.y, actual_d1, "#ffffff"));
  floatingNumbers.push(new FloatingNumber(s2.x + s2.size / 2, s2.y, actual_d2, "#ffffff"));
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
      spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, "#ffffff", 5, 1, 3, 5);
    } else if (c.canDamage) {
      s.hp -= c.damage;
      s.onTakeDamage();
      SFX.takeDamage();
      floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, c.damage, "#ffffff"));
      spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#ffffff", 5, 1, 3, 5);
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
      const cloneColor = (clone instanceof Clone) ? "#87ceeb" : "#6C5CE7";
      spawnSquareParticles(clone.x + clone.size / 2, clone.y + clone.size / 2, cloneColor, 8, 1, 4, 6);

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
  s.hp -= dmg;
  c.hp  = 0;
  if (s.onTakeDamage) s.onTakeDamage();
  SFX.takeDamage();
  floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, dmg, "#ffffff"));
  spawnSquareParticles((c.x + s.x) / 2, (c.y + s.y) / 2, c.def.color, 8, 1, 3, 5);
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

  // Heal gold owner (with construct's own cooldown)
  if (construct.hitCooldown <= 0) {
    construct.owner.hp = Math.min(100, construct.owner.hp + 3);
    SFX.heal();
    floatingNumbers.push(new FloatingNumber(
      construct.owner.x + construct.owner.size / 2,
      construct.owner.y - 10, "+3", "#00ff44"
    ));
    spawnSquareParticles(construct.x + construct.size / 2, construct.y + construct.size / 2, "#FFD700", 6, 1, 3, 4);
    construct.hitCooldown = 40;
  }
}
