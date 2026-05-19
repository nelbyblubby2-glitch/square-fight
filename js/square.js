// ── Main playable square ───────────────────────────────────────────────────────
// All character-specific logic lives in characters.js.
// To add a new character: add an entry to squareDefs (constants.js) and
// call registerBehavior() in characters.js. Nothing here needs changing.
// ─────────────────────────────────────────────────────────────────────────────
class Square {
  constructor(id, side) {
    this.id   = id;
    this.def  = squareDefs[id];
    this.hp    = 100;
    this.maxHp = 100;
    this.size = SIZE;
    this.x    = side === "left" ? arena.x + 80 : arena.x + arena.w - SIZE - 80;
    this.y    = arena.y + arena.h / 2 - SIZE / 2;

    this.baseSpeed       = BASE_SPEED; // natural speed for this square — external effects modify this
    // Knockback: separate velocity vector added on top of normal movement, immune to speed drains.
    // Decays only on wall bounce (×0.6) and enemy hit (×0.5) — not per frame.
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.currentSpeed    = BASE_SPEED;
    this.speedModifiers  = [];         // [{ value, duration }] — negative = drain, positive = boost
    this.vx              = (side === "left" ? 1 : -1) * this.currentSpeed;
    this.vy              = (Math.random() - 0.5) * 5;

    // Shared stats (available to all behaviors)
    this.bonusDamage     = 0;
    this.projectileCount = 1;
    this.hitImmunityTimer = 0;

    // Silver pickup: number of shield charges (each absorbs one damage instance)
    this.silverImmunity  = 0;

    // Shared cooldown / player-action timers
    this.cooldownTimer   = 0;
    this.burstShotsLeft  = 0;
    this.shotGapTimer    = 0;
    this.actionCooldown  = 0;
    this.speedBoostTimer = 0;
    this.speedBoostAdd   = 0;
    this.stopTimer       = 0;
    this.aimNext         = false;

    // Poison (used by Purple + collision.js)
    this.poisonTimer         = 0;
    this.poisonDmgTimer      = 0;
    this.poisonPreviewHp     = null;
    this.poisonDurationBonus = 0;

    // Gray freeze (any square can be frozen by Gray's clone trap)
    this.jadeboundTimer = 0;
    // Jade persistent chase (re-aims every bounce for a duration)
    this.jadeChaseTimer  = 0;

    // Bleed (used by Crimson and other characters)
    this.bleedTimer     = 0;
    this.bleedDmgTimer  = 0;
    this.bleedPreviewHp = null;
    this.bleedColor     = "#cc1a1a"; // color of whoever applied bleed

    // Poison (used by Purple and others)
    this.poisonColor    = "#b33eff"; // color of whoever applied poison

    // Scarlet delayed damage (stored on the enemy; detonated when Scarlet bullet hits)
    this.scarletDelayed    = 0;   // pending damage amount

    // Let the behavior initialize any extra state it needs
    const b = BehaviorRegistry[this.def.type];
    if (b?.initState) b.initState(this);
    if (b?.onSpawn)   b.onSpawn(this, side);

    // Re-normalize velocity in case initState changed currentSpeed (e.g. Gray)
    this.normalizeVelocity();
  }

  // ── Shared helpers ────────────────────────────────────────────────────────────

  applyPoison(extraFrames, color) {
    this.poisonTimer += extraFrames;
    if (color) this.poisonColor = color;
    const totalPoisonDamage = Math.ceil(this.poisonTimer / 60) * 2;
    this.poisonPreviewHp = Math.max(0, this.hp - totalPoisonDamage);
  }

  applyBleed(frames, color) {
    this.bleedTimer += frames;  // stacks additively
    if (color) this.bleedColor = color;
    const totalBleedDamage = Math.ceil(this.bleedTimer / 60);
    this.bleedPreviewHp = Math.max(0, this.hp - totalBleedDamage);
  }

  // Add scarlet delayed damage (shown as health bar preview)
  addScarletDelayed(dmg) {
    this.scarletDelayed += dmg;
    this._updateScarletPreview();
  }

  _updateScarletPreview() {
    // Use bleedPreviewHp to show scarlet pending damage on the health bar
    const totalPending = this.scarletDelayed + Math.ceil(this.bleedTimer / 60);
    this.bleedPreviewHp = totalPending > 0 ? Math.max(0, this.hp - totalPending) : null;
  }

  // Detonate all stored Scarlet delayed damage — called when Scarlet bullet hits
  burstScarletDelayed() {
    const dmg = this.scarletDelayed;
    this.scarletDelayed = 0;
    this._updateScarletPreview();
    return dmg;
  }

  // Instantly burst all remaining bleed damage (kept for compatibility)
  burstBleed() {
    if (this.bleedTimer <= 0) return 0;
    const dmg = Math.ceil(this.bleedTimer / 60);
    this.bleedTimer    = 0;
    this.bleedDmgTimer = 0;
    this.bleedPreviewHp = null;
    return dmg;
  }

  getCollisionDamage() {
    const b = BehaviorRegistry[this.def.type];
    if (b?.getCollisionDamage) return b.getCollisionDamage(this);
    return 1 + this.bonusDamage;
  }

  // ── Silver shield absorption ──────────────────────────────────────────────
  // If silverImmunity > 0, consumes one charge and blocks the hit entirely.
  // Returns the actual damage applied (0 if blocked).
  absorbDamage(dmg) {
    if (this.silverImmunity > 0) {
      this.silverImmunity--;
      this._silverShieldFlash = 20;
      spawnSquareParticles(
        this.x + this.size / 2, this.y + this.size / 2,
        "#e2e8f0", 10, 1, 3, 6
      );
      return 0; // blocked
    }
    this.hp -= dmg;
    return dmg;
  }

  normalizeVelocity() {
    const len = Math.hypot(this.vx, this.vy) || 1;
    this.vx = (this.vx / len) * this.currentSpeed;
    this.vy = (this.vy / len) * this.currentSpeed;
  }


  // ── Knockback API ────────────────────────────────────────────────────────────
  // Push this square in a direction. vx/vy are the impulse (e.g. 12 = strong push).
  // Stacks additively with existing knockback. Immune to speed modifiers/drains.
  applyKnockback(vx, vy) {
    this.knockbackVx += vx;
    this.knockbackVy += vy;
  }

  // Convenience: push away from a source position at a given force
  applyKnockbackFrom(srcX, srcY, force) {
    const dx   = this.x + this.size / 2 - srcX;
    const dy   = this.y + this.size / 2 - srcY;
    const dist = Math.hypot(dx, dy) || 1;
    this.applyKnockback((dx / dist) * force, (dy / dist) * force);
  }

  // ── Speed modifier API ────────────────────────────────────────────────────────
  // Add a speed modifier for a given duration (frames). Use negative value to drain.
  // Pass Infinity for a permanent modifier (cleared manually via clearSpeedModifier).
  // tag: optional string key to identify/replace this modifier later.
  addSpeedModifier(value, duration, tag = null) {
    if (tag) this.removeSpeedModifier(tag);
    this.speedModifiers.push({ value, duration: duration ?? Infinity, tag });
  }

  removeSpeedModifier(tag) {
    this.speedModifiers = this.speedModifiers.filter(m => m.tag !== tag);
  }

  clearSpeedModifiers() {
    this.speedModifiers = [];
  }

  // ── Reaction hooks — delegate to behavior ────────────────────────────────────

  onTakeDamage() {
    const b = BehaviorRegistry[this.def.type];
    if (b?.onTakeDamage) b.onTakeDamage(this);
  }

  onHitEnemy() {
    const b = BehaviorRegistry[this.def.type];
    if (b?.onHitEnemy) b.onHitEnemy(this);
    triggerHitFreeze();
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  update() {
    if (this.actionCooldown > 0) this.actionCooldown--;

    this._updatePoison();
    this._updateBleed();
    this._updateMovement();
    this._updateWallBounce();

    // Character-specific skill tick
    const b = BehaviorRegistry[this.def.type];
    if (b?.updateSkill) b.updateSkill(this);

    if (this.hitImmunityTimer > 0) this.hitImmunityTimer--;
  }

  _updatePoison() {
    if (this.poisonTimer > 0) {
      this.poisonTimer--;
      this.poisonDmgTimer++;
      if (this.poisonDmgTimer >= 60) {
        const actualPoison = this.absorbDamage(2);
        if (actualPoison > 0) floatingNumbers.push(new FloatingNumber(this.x + this.size / 2, this.y, actualPoison, this.poisonColor || "#b33eff"));
        this.poisonDmgTimer = 0;
        this.onTakeDamage();
      }
    } else {
      this.poisonDmgTimer  = 0;
      this.poisonPreviewHp = null;
    }
  }

  _updateBleed() {
    if (this.bleedTimer <= 0) {
      this.bleedDmgTimer = 0;
      if (this.scarletDelayed <= 0) this.bleedPreviewHp = null;
      return;
    }
    this.bleedTimer--;
    this.bleedDmgTimer++;
    if (this.bleedDmgTimer >= 60) {
      const actualBleed = this.absorbDamage(1);
      if (actualBleed > 0) floatingNumbers.push(new FloatingNumber(this.x + this.size / 2, this.y, actualBleed, this.bleedColor || "#cc1a1a"));
      this.bleedDmgTimer = 0;
      this.onTakeDamage();
    }
    this._updateScarletPreview();
  }

  _updateMovement() {
    if (this.stopTimer > 0) { this.stopTimer--; return; }

    // Jadebound: enemy is frozen in place
    if (this.jadeboundTimer > 0) { this.jadeboundTimer--; return; }

    // Jade chase timer counts down per frame (set to 108 = 1.8s at 60fps)
    if (this.jadeChaseTimer > 0) this.jadeChaseTimer--;

    // Tick speed modifiers (drains/boosts from external abilities)
    if (this.speedModifiers.length > 0) {
      this.speedModifiers = this.speedModifiers.filter(m => {
        if (m.duration !== Infinity) m.duration--;
        return m.duration > 0;
      });
      const totalMod = this.speedModifiers.reduce((sum, m) => sum + m.value, 0);
      // Apply modifier to baseSpeed, floor at 0.5 so squares never fully stop
      this.currentSpeed = Math.max(0.5, this.baseSpeed + (this._rogueSpeedBonus || 0) + totalMod);
    }

    let activeSpeed = this.currentSpeed;
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      // Additive boost: add speedBoostAdd to current speed rather than replacing it
      activeSpeed = this.currentSpeed + (this.speedBoostAdd || 2);
      if (this.speedBoostTimer === 0) this.speedBoostAdd = 0; // clear after boost ends
    }

    this.x += (this.vx / this.currentSpeed) * activeSpeed;
    this.y += (this.vy / this.currentSpeed) * activeSpeed;

    // Knockback: added on top of normal movement. Slows only on wall/enemy hit, not per frame.
    this.x += this.knockbackVx;
    this.y += this.knockbackVy;
  }

  _updateWallBounce() {
    if (this.stopTimer > 0) return;

    let bounced = false;
    if (this.x <= arena.x)                       { this.vx =  Math.abs(this.vx); this.x = arena.x;                     bounced = true; }
    if (this.x + this.size >= arena.x + arena.w)  { this.vx = -Math.abs(this.vx); this.x = arena.x + arena.w - this.size; bounced = true; }
    if (this.y <= arena.y)                        { this.vy =  Math.abs(this.vy); this.y = arena.y;                     bounced = true; }
    if (this.y + this.size >= arena.y + arena.h)   { this.vy = -Math.abs(this.vy); this.y = arena.y + arena.h - this.size; bounced = true; }

    if (!bounced) return;

    // Knockback: reflect off wall and reduce by 40%
    if (this.x <= arena.x || this.x + this.size >= arena.x + arena.w)
      this.knockbackVx *= -0.6;
    if (this.y <= arena.y || this.y + this.size >= arena.y + arena.h)
      this.knockbackVy *= -0.6;
    // Clear knockback if it becomes negligible
    if (Math.hypot(this.knockbackVx, this.knockbackVy) < 0.3) {
      this.knockbackVx = 0; this.knockbackVy = 0;
    }

    // Notify behavior of wall bounce
    const b = BehaviorRegistry[this.def.type];
    if (b?.onWallBounce) b.onWallBounce(this);

    // Chase: re-aim on each wall bounce only while jadeChaseTimer active AND enemy is jadebound
    const chaseTarget = this.jadeChaseTimer > 0
      ? squares.find((s) => s !== this && s.jadeboundTimer > 0)
      : null;

    if (this.aimNext || chaseTarget) {
      const target = chaseTarget || squares.find((s) => s !== this);
      if (target) {
        const dx   = target.x + target.size / 2 - (this.x + this.size / 2);
        const dy   = target.y + target.size / 2 - (this.y + this.size / 2);
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * this.currentSpeed;
        this.vy = (dy / dist) * this.currentSpeed;
      }
      this.aimNext = false;
    } else {
      this.normalizeVelocity();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  draw() {
    if (this.hp <= 0) return;

    const b = BehaviorRegistry[this.def.type];
    if (b?.draw) b.draw(this);

    // If hitbox is shrunken by lime hook, draw at original visual size centered on the shrunken position
    const limeHook = limeProjectiles.find(lp => lp.hooked && lp.pullTarget === this);
    if (limeHook && limeHook.targetOriginalSize > 0) {
      const vs = limeHook.targetOriginalSize;
      const cx = this.x + this.size / 2;
      const cy = this.y + this.size / 2;
      fillGradRect(this.def, cx - vs / 2, cy - vs / 2, vs, vs);
    } else {
      fillGradRect(this.def, this.x, this.y, this.size, this.size);
    }

    // Jade freeze visual: colored pulsing border
    if (this.jadeboundTimer > 0) {
      const freezeColor = this.jadeboundColor || "#00a86b";
      ctx.save();
      ctx.strokeStyle = freezeColor;
      ctx.lineWidth   = 3;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 100);
      ctx.strokeRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
      ctx.restore();
    }

    // Silver shield visual: solid silver border when immune (like jadebound, no glow/twinkle)
    if (this.silverImmunity > 0) {
      ctx.save();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth   = 3;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
      // Show stack count if > 1
      if (this.silverImmunity > 1) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#e2e8f0";
        ctx.font = `bold 14px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`×${this.silverImmunity}`, this.x + this.size / 2, this.y - 12);
      }
      ctx.restore();
    }

    // Silver shield flash (on block)
    if (this._silverShieldFlash > 0) {
      this._silverShieldFlash--;
      ctx.save();
      ctx.fillStyle = "#e2e8f0";
      ctx.globalAlpha = (this._silverShieldFlash / 20) * 0.5;
      ctx.fillRect(this.x - 6, this.y - 6, this.size + 12, this.size + 12);
      ctx.restore();
    }
  }
}
