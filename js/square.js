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

    this.currentSpeed    = BASE_SPEED;
    this.vx              = (side === "left" ? 1 : -1) * this.currentSpeed;
    this.vy              = (Math.random() - 0.5) * 5;

    // Shared stats (available to all behaviors)
    this.bonusDamage     = 0;
    this.projectileCount = 1;
    this.hitImmunityTimer = 0;

    // Shared cooldown / player-action timers
    this.cooldownTimer   = 0;
    this.burstShotsLeft  = 0;
    this.shotGapTimer    = 0;
    this.actionCooldown  = 0;
    this.speedBoostTimer = 0;
    this.stopTimer       = 0;
    this.aimNext         = false;

    // Poison (used by Purple + collision.js)
    this.poisonTimer         = 0;
    this.poisonDmgTimer      = 0;
    this.poisonPreviewHp     = null;
    this.poisonDurationBonus = 0;

    // Gray freeze (any square can be frozen by Gray's clone trap)
    this.grayFreezeTimer = 0;

    // Bleed (used by Scarlet)
    this.bleedTimer     = 0;
    this.bleedDmgTimer  = 0;
    this.bleedPreviewHp = null;

    // Let the behavior initialize any extra state it needs
    const b = BehaviorRegistry[this.def.type];
    if (b?.initState) b.initState(this);
    if (b?.onSpawn)   b.onSpawn(this, side);

    // Re-normalize velocity in case initState changed currentSpeed (e.g. Gray)
    this.normalizeVelocity();
  }

  // ── Shared helpers ────────────────────────────────────────────────────────────

  applyPoison(extraFrames) {
    this.poisonTimer += extraFrames;
    const totalPoisonDamage = Math.ceil(this.poisonTimer / 60) * 2;
    this.poisonPreviewHp = Math.max(0, this.hp - totalPoisonDamage);
  }

  applyBleed(frames) {
    this.bleedTimer += frames;  // stacks additively
    const totalBleedDamage = Math.ceil(this.bleedTimer / 60);
    this.bleedPreviewHp = Math.max(0, this.hp - totalBleedDamage);
  }

  // Instantly burst all remaining bleed damage (called by Scarlet bullet on hit)
  burstBleed() {
    if (this.bleedTimer <= 0) return 0;
    const dmg = Math.ceil(this.bleedTimer / 60);
    this.bleedTimer    = 0;
    this.bleedDmgTimer = 0;
    return dmg;
  }

  getCollisionDamage() {
    const b = BehaviorRegistry[this.def.type];
    if (b?.getCollisionDamage) return b.getCollisionDamage(this);
    return 1 + this.bonusDamage;
  }

  normalizeVelocity() {
    const len = Math.hypot(this.vx, this.vy) || 1;
    this.vx = (this.vx / len) * this.currentSpeed;
    this.vy = (this.vy / len) * this.currentSpeed;
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
        this.hp -= 2;
        floatingTexts.push(new FloatingText(this.x + this.size / 2, this.y, "2", "#b33eff"));
        this.poisonDmgTimer = 0;
        this.onTakeDamage();
      }
    } else {
      this.poisonDmgTimer  = 0;
      this.poisonPreviewHp = null;
    }
  }

  _updateBleed() {
    if (this.bleedTimer <= 0) { this.bleedDmgTimer = 0; this.bleedPreviewHp = null; return; }
    this.bleedTimer--;
    this.bleedDmgTimer++;
    if (this.bleedDmgTimer >= 60) {
      this.hp -= 1;
      floatingTexts.push(new FloatingText(this.x + this.size / 2, this.y, "1", "#cc1a1a"));
      this.bleedDmgTimer = 0;
      this.onTakeDamage();
    }
  }

  _updateMovement() {
    if (this.stopTimer > 0) { this.stopTimer--; return; }

    // Gray freeze: enemy is frozen in place
    if (this.grayFreezeTimer > 0) { this.grayFreezeTimer--; return; }

    let activeSpeed = this.currentSpeed;
    if (this.speedBoostTimer > 0) { this.speedBoostTimer--; activeSpeed = BOOST_SPEED; }

    this.x += (this.vx / this.currentSpeed) * activeSpeed;
    this.y += (this.vy / this.currentSpeed) * activeSpeed;
  }

  _updateWallBounce() {
    if (this.stopTimer > 0) return;

    let bounced = false;
    if (this.x <= arena.x)                       { this.vx =  Math.abs(this.vx); this.x = arena.x;                     bounced = true; }
    if (this.x + this.size >= arena.x + arena.w)  { this.vx = -Math.abs(this.vx); this.x = arena.x + arena.w - this.size; bounced = true; }
    if (this.y <= arena.y)                        { this.vy =  Math.abs(this.vy); this.y = arena.y;                     bounced = true; }
    if (this.y + this.size >= arena.y + arena.h)   { this.vy = -Math.abs(this.vy); this.y = arena.y + arena.h - this.size; bounced = true; }

    if (!bounced) return;

    // Decay brown knockback speed toward base (respects rogue speed upgrades)
    const _floorSpeed = BASE_SPEED + (this._rogueSpeedBonus || 0);
    if (this.brownKnockbackDecaying && this.currentSpeed > _floorSpeed) {
      this.currentSpeed = Math.max(_floorSpeed, this.currentSpeed - 2.5);
      if (this.currentSpeed <= _floorSpeed) this.brownKnockbackDecaying = false;
    }

    // Notify behavior of wall bounce
    const b = BehaviorRegistry[this.def.type];
    if (b?.onWallBounce) b.onWallBounce(this);

    if (this.aimNext) {
      const target = squares.find((s) => s !== this);
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
      ctx.fillStyle = this.def.color;
      ctx.fillRect(cx - vs / 2, cy - vs / 2, vs, vs);
    } else {
      ctx.fillStyle = this.def.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }

    // Gray freeze visual: icy pulsing border
    if (this.grayFreezeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(235, 235, 235, 0.7)`;
      ctx.lineWidth   = 3;
      ctx.strokeRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
      ctx.restore();
    }
  }
}
