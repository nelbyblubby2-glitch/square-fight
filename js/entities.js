// ── Projectile ────────────────────────────────────────────────────────────────
class Projectile {
  constructor(owner, target) {
    this.owner     = owner;
    this.mainOwner = owner.mainOwner || owner;
    this.x         = owner.x + owner.size / 2;
    this.y         = owner.y + owner.size / 2;
    this.isIndigo  = this.mainOwner.def.type === "indigo";
    this.isPink    = this.mainOwner.def.type === "pink";
    this.isScarlet = this.mainOwner.def.type === "scarlet";
    this.isGreenBounce = this.mainOwner.def.type === "green" && (this.mainOwner._rogueProjectileBounce > 0);

    let targetX, targetY;
    if (this.isPink) {
      targetX = arena.x + Math.random() * arena.w;
      targetY = arena.y + Math.random() * arena.h;
    } else {
      targetX = target ? target.x + target.size / 2 : this.x + 100;
      targetY = target ? target.y + target.size / 2 : this.y;
    }

    const dx   = targetX - this.x;
    const dy   = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const isGreen = this.mainOwner.def.type === "green";
    let speed;
    if (isGreen) {
      // Rogue: slow by default; Sharpened Shot restores normal speed
      speed = this.mainOwner._rogueFastProjectile ? 15 : (this.mainOwner._rogueSlowProjectile ? PROJECTILE_SPEED : 15);
    } else if (this.mainOwner.def.type === "scarlet") {
      speed = 15;
    } else {
      speed = PROJECTILE_SPEED;
    }

    this.vx          = (dx / dist) * speed;
    this.vy          = (dy / dist) * speed;
    this.bouncePower = 0;
    this.bouncing    = false;
    this.bounceTimer = 60;
  }

  update() {
    if (this.bouncing) {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x <= arena.x || this.x >= arena.x + arena.w) this.vx *= -1;
      if (this.y <= arena.y || this.y >= arena.y + arena.h) this.vy *= -1;
      this.bounceTimer--;
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.isPink) {
      let bounced = false;
      if (this.x <= arena.x)            { this.vx =  Math.abs(this.vx); bounced = true; }
      if (this.x >= arena.x + arena.w)  { this.vx = -Math.abs(this.vx); bounced = true; }
      if (this.y <= arena.y)            { this.vy =  Math.abs(this.vy); bounced = true; }
      if (this.y >= arena.y + arena.h)  { this.vy = -Math.abs(this.vy); bounced = true; }

      if (bounced) {
        this.bouncePower++;
        this.mainOwner.pinkBounceCount++;
      }

      if (Math.random() > 0.4) {
        const p  = new Particle(this.x, this.y, "#ff69b4", 4);
        p.vx     = p.vx * 0.15;
        p.vy     = p.vy * 0.15;
        p.decay  = 0.04;
        particles.push(p);
      }
    }

    if (this.mainOwner.def.type === "green") {
      // Rogue bounce: reflect off walls like pink (infinite) when upgrade active
      if (this.isGreenBounce) {
        if (this.x <= arena.x)           { this.vx =  Math.abs(this.vx); }
        if (this.x >= arena.x + arena.w) { this.vx = -Math.abs(this.vx); }
        if (this.y <= arena.y)           { this.vy =  Math.abs(this.vy); }
        if (this.y >= arena.y + arena.h) { this.vy = -Math.abs(this.vy); }
      }

      const density = 10;
      for (let i = 0; i < density; i++) {
        const t    = i / density;
        const p    = new Particle(this.x - 3 - this.vx * t, this.y - 3 - this.vy * t, "#00ff44", 6);
        p.vx       = 0;
        p.vy       = 0;
        p.decay    = 0.8;
        particles.push(p);
      }
    }
  }

  draw() {
    ctx.fillStyle = this.isPink
      ? "#ff69b4"
      : this.mainOwner.def.color;
    ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
  }
}

// ── White's companion ─────────────────────────────────────────────────────────
class CompanionSquare {
  constructor(owner) {
    this.owner          = owner;
    this.size           = 18;
    this.x              = 0;
    this.y              = 0;
    this.baseSpeed      = 6;
    this.speed          = this.baseSpeed;
    this.vx             = (Math.random() > 0.5 ? 1 : -1) * this.speed;
    this.vy             = (Math.random() > 0.5 ? 1 : -1) * this.speed;
    this.canDamage      = true;
    this.damage         = 3;
    this.speedBoostTimer = 0;
    this.bounceCooldown  = 0;
  }

  update() {
    this.speed = this.speedBoostTimer > 0 ? this.baseSpeed * 1.6 : this.baseSpeed;
    if (this.speedBoostTimer > 0) this.speedBoostTimer--;
    if (this.bounceCooldown  > 0) this.bounceCooldown--;

    const len = Math.hypot(this.vx, this.vy) || 1;
    this.vx = (this.vx / len) * this.speed;
    this.vy = (this.vy / len) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= arena.x)                      { this.vx =  Math.abs(this.vx); this.x = arena.x; }
    if (this.x + this.size >= arena.x + arena.w) { this.vx = -Math.abs(this.vx); this.x = arena.x + arena.w - this.size; }
    if (this.y <= arena.y)                       { this.vy =  Math.abs(this.vy); this.y = arena.y; }
    if (this.y + this.size >= arena.y + arena.h)  { this.vy = -Math.abs(this.vy); this.y = arena.y + arena.h - this.size; }
  }

  draw() {
    ctx.fillStyle = this.canDamage ? "#ffffff" : "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(this.x, this.y, this.size, this.size);
    if (this.canDamage) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.strokeRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
    }
  }
}

// ── Indigo clone ──────────────────────────────────────────────────────────────
// ── Unified Clone class (used by both Indigo and Sky) ────────────────────────
class Clone {
  constructor(type, x, y, mainOwner, options = {}) {
    this.cloneType   = type;          // "indigo" | "sky"
    this.mainOwner   = mainOwner;
    this.owner       = mainOwner;     // alias for sky compatibility
    this.size        = SIZE;
    this.x           = x;
    this.y           = y;
    this.hp          = 1;
    this.hitImmunity = 0;

    if (type === "indigo") {
      this.def          = squareDefs[10];
      this.currentSpeed = BASE_SPEED;
      this.vx           = (Math.random() - 0.5) * 10;
      this.vy           = (Math.random() - 0.5) * 10;
      this.normalizeVelocity();
      this.indigoShootTimer = 120;
      this.damage           = 1;
    } else {
      this.def          = squareDefs[13];
      this.currentSpeed = BASE_SPEED;
      const angle = Math.random() * Math.PI * 2;
      this.vx     = Math.cos(angle) * this.currentSpeed;
      this.vy     = Math.sin(angle) * this.currentSpeed;
      this.damage = options.damage || 1;
    }
  }

  normalizeVelocity() {
    const len = Math.hypot(this.vx, this.vy) || 1;
    this.vx = (this.vx / len) * this.currentSpeed;
    this.vy = (this.vy / len) * this.currentSpeed;
  }

  update() {
    if (this.hitImmunity > 0) this.hitImmunity--;

    this.x += this.vx;
    this.y += this.vy;

    let bounced = false;
    if (this.x <= arena.x)                       { this.vx =  Math.abs(this.vx); this.x = arena.x;                      bounced = true; }
    if (this.x + this.size >= arena.x + arena.w)  { this.vx = -Math.abs(this.vx); this.x = arena.x + arena.w - this.size; bounced = true; }
    if (this.y <= arena.y)                        { this.vy =  Math.abs(this.vy); this.y = arena.y;                      bounced = true; }
    if (this.y + this.size >= arena.y + arena.h)   { this.vy = -Math.abs(this.vy); this.y = arena.y + arena.h - this.size; bounced = true; }
    if (bounced) this.normalizeVelocity();

    // Indigo clones shoot projectiles
    if (this.cloneType === "indigo") {
      if (this.indigoShootTimer > 0) {
        this.indigoShootTimer--;
      } else {
        const target = squares.find((s) => s !== this.mainOwner);
        if (target) projectiles.push(new Projectile(this, target));
        this.indigoShootTimer = 120;
      }
    }
  }

  draw() {
    if (this.hp <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.cloneType === "indigo" ? 0.2 : 0.55;
    ctx.fillStyle   = this.def.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  onTakeDamage() {}
  onHitEnemy()   {}
}


// ── Cyan's giant square ───────────────────────────────────────────────────────
class GiantSquare {
  constructor(owner, target) {
    this.owner   = owner;
    this.size    = 120;
    this.hitList = [];
    this.life    = 400;

    const targetX = target ? target.x + target.size / 2 : arena.x + arena.w / 2;
    const targetY = target ? target.y + target.size / 2 : arena.y + arena.h / 2;

    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: this.x = arena.x - this.size - 100; this.y = targetY - this.size / 2; break;
      case 1: this.x = arena.x + arena.w + 100;   this.y = targetY - this.size / 2; break;
      case 2: this.x = targetX - this.size / 2;   this.y = arena.y - this.size - 100; break;
      case 3: this.x = targetX - this.size / 2;   this.y = arena.y + arena.h + 100;   break;
    }

    const dx   = targetX - (this.x + this.size / 2);
    const dy   = targetY - (this.y + this.size / 2);
    const dist = Math.hypot(dx, dy) || 1;
    this.vx = (dx / dist) * 7;
    this.vy = (dy / dist) * 7;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    ctx.fillStyle   = "rgba(0, 255, 255, 0.3)";
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth   = 3;
    ctx.strokeRect(this.x, this.y, this.size, this.size);
  }
}

// ── Brown's wall spike ────────────────────────────────────────────────────────
class BrownSpike {
  constructor(owner, wallSide, bx, by) {
    this.owner    = owner;
    this.wallSide = wallSide;
    this.hitCooldown = 0; // per-spike hit cooldown timer

    const ARM = 26, BASE = 14; // bigger spike
    if (wallSide === "left") {
      this.pts = [
        { x: arena.x + ARM, y: by },
        { x: arena.x,       y: by - BASE },
        { x: arena.x,       y: by + BASE },
      ];
      this.hitBox = { x: arena.x, y: by - BASE, w: ARM, h: BASE * 2 };
    } else if (wallSide === "right") {
      this.pts = [
        { x: arena.x + arena.w - ARM, y: by },
        { x: arena.x + arena.w,       y: by - BASE },
        { x: arena.x + arena.w,       y: by + BASE },
      ];
      this.hitBox = { x: arena.x + arena.w - ARM, y: by - BASE, w: ARM, h: BASE * 2 };
    } else if (wallSide === "top") {
      this.pts = [
        { x: bx,        y: arena.y + ARM },
        { x: bx - BASE, y: arena.y },
        { x: bx + BASE, y: arena.y },
      ];
      this.hitBox = { x: bx - BASE, y: arena.y, w: BASE * 2, h: ARM };
    } else {
      this.pts = [
        { x: bx,        y: arena.y + arena.h - ARM },
        { x: bx - BASE, y: arena.y + arena.h },
        { x: bx + BASE, y: arena.y + arena.h },
      ];
      this.hitBox = { x: bx - BASE, y: arena.y + arena.h - ARM, w: BASE * 2, h: ARM };
    }
  }

  update() {
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.hitCooldown > 0) return;

    const hb = this.hitBox;

    // Hit main squares (enemy only)
    squares.forEach((s) => {
      if (s === this.owner) return;
      if (s.x < hb.x + hb.w && s.x + s.size > hb.x &&
          s.y < hb.y + hb.h && s.y + s.size > hb.y) {
        s.hp -= 1;
        s.onTakeDamage();
        SFX.takeDamage();
        this.hitCooldown = 40;
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, "1", "#c07840"));
        spawnSquareParticles(s.x + s.size / 2, s.y + s.size / 2, "#c07840", 5, 1, 3, 4);
      }
    });

    // Hit clones that belong to the enemy
    for (let i = clones.length - 1; i >= 0; i--) {
      const c = clones[i];
      if (c.mainOwner === this.owner) continue;
      if (c.x < hb.x + hb.w && c.x + c.size > hb.x &&
          c.y < hb.y + hb.h && c.y + c.size > hb.y) {
        c.hp = 0;
        this.hitCooldown = 40;
        spawnSquareParticles(c.x + c.size / 2, c.y + c.size / 2, c.def.color, 6, 1, 3, 4);
      }
    }
  }

  draw() {
    ctx.save();
    // Spike body — flat fill, no glow
    ctx.beginPath();
    ctx.moveTo(this.pts[0].x, this.pts[0].y);
    ctx.lineTo(this.pts[1].x, this.pts[1].y);
    ctx.lineTo(this.pts[2].x, this.pts[2].y);
    ctx.closePath();
    ctx.fillStyle = "#c07840";
    ctx.fill();
    ctx.restore();
  }
}

// ── Sky's wall clone ──────────────────────────────────────────────────────────
// ── Lime's tether projectile ──────────────────────────────────────────────────
// The hook point moves; when it reaches a wall it deals damage to the hooked enemy.
// The enemy follows the hook point. Pierces sky/indigo clones while flying.
class LimeProjectile {
  constructor(owner) {
    this.owner  = owner;
    this.x      = owner.x + owner.size / 2;
    this.y      = owner.y + owner.size / 2;
    this.speed  = 2.5;
    this.active = true;
    this.hooked = false;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // Chain: [0] = Lime center (live), rest = wall bounce points during flight, last = embed point
    this.chain = [{ x: this.x, y: this.y }];

    this.pullTarget        = null;
    this.pullWallBounces   = 0;
    this.wallHitCD         = 0;
    this.targetOriginalSize = 0; // saved size before shrink
  }

  update() {
    this.chain[0] = { x: this.owner.x + this.owner.size / 2, y: this.owner.y + this.owner.size / 2 };
    if (this.active)      this._updateFlight();
    else if (this.hooked) this._updatePull();
  }

  _updateFlight() {
    this.x += this.vx;
    this.y += this.vy;

    let bx = this.x, by = this.y, bounced = false;
    if (this.x <= arena.x)           { this.vx =  Math.abs(this.vx); this.x = arena.x;           bx = arena.x;           bounced = true; }
    if (this.x >= arena.x + arena.w) { this.vx = -Math.abs(this.vx); this.x = arena.x + arena.w; bx = arena.x + arena.w; bounced = true; }
    if (this.y <= arena.y)           { this.vy =  Math.abs(this.vy); this.y = arena.y;           by = arena.y;           bounced = true; }
    if (this.y >= arena.y + arena.h) { this.vy = -Math.abs(this.vy); this.y = arena.y + arena.h; by = arena.y + arena.h; bounced = true; }
    if (bounced) this.chain.push({ x: bx, y: by, isWall: true });

    // Hits only main enemy — pierces clones
    const target = squares.find((s) => s !== this.owner);
    if (target &&
        this.x > target.x && this.x < target.x + target.size &&
        this.y > target.y && this.y < target.y + target.size) {
      this.active     = false;
      this.hooked     = true;
      this.pullTarget = target;
      this.chain.push({ x: this.x, y: this.y, isEmbed: true });

      // Shrink enemy to a point so it can travel along the chain precisely
      this.targetOriginalSize = target.size;
      target.size = 2;
      // Re-center enemy on the hook point
      target.x = this.x - 1;
      target.y = this.y - 1;

      spawnSquareParticles(this.x, this.y, "#aaff00", 8, 1, 3, 5);
    }
  }

  _updatePull() {
    const target = this.pullTarget;
    if (!target || target.hp <= 0) { this._endPull(); return; }
    if (this.wallHitCD > 0) this.wallHitCD--;

    // Destination: last chain node. When length===1, that IS Lime (chain[0]).
    const dest = this.chain[this.chain.length - 1];
    const tx   = target.x + target.size / 2;
    const ty   = target.y + target.size / 2;
    const dx   = dest.x - tx;
    const dy   = dest.y - ty;
    const dist = Math.hypot(dx, dy) || 1;

    const pullSpeed = 8;

    if (dist <= pullSpeed + 1) {
      target.x = dest.x - target.size / 2;
      target.y = dest.y - target.size / 2;

      // Reached Lime itself — end
      if (this.chain.length === 1) {
        this._endPull();
        return;
      }

      // Deal damage for wall nodes
      if (dest.isWall && this.wallHitCD <= 0) {
        this.pullWallBounces++;
        const dmg = this.pullWallBounces;
        target.hp -= dmg;
        target.onTakeDamage();
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(target.x + this.targetOriginalSize / 2, target.y, dmg.toString(), "#aaff00"));
        spawnSquareParticles(target.x + target.size / 2, target.y + target.size / 2, "#aaff00", 6, 1, 3, 5);
        triggerHitFreeze();
        this.wallHitCD = 15;
      }

      this.chain.pop();
      // Reset wallHitCD on node transition so next wall node always registers a hit
      this.wallHitCD = 0;

      // If only Lime remains (chain[0]), restore enemy hitbox to normal for the final pull
      if (this.chain.length === 1 && this.targetOriginalSize > 0 && this.pullTarget && this.pullTarget.size !== this.targetOriginalSize) {
        const cx = this.pullTarget.x + this.pullTarget.size / 2;
        const cy = this.pullTarget.y + this.pullTarget.size / 2;
        this.pullTarget.size = this.targetOriginalSize;
        this.pullTarget.x = cx - this.pullTarget.size / 2;
        this.pullTarget.y = cy - this.pullTarget.size / 2;
      }
    } else {
      target.x += (dx / dist) * pullSpeed;
      target.y += (dy / dist) * pullSpeed;
    }
  }

  _endPull() {
    const target = this.pullTarget;
    // Restore enemy size, re-center on current position
    if (target && this.targetOriginalSize > 0) {
      const cx = target.x + target.size / 2;
      const cy = target.y + target.size / 2;
      target.size = this.targetOriginalSize;
      target.x = cx - target.size / 2;
      target.y = cy - target.size / 2;
      // Clamp inside arena
      target.x = Math.max(arena.x, Math.min(arena.x + arena.w - target.size, target.x));
      target.y = Math.max(arena.y, Math.min(arena.y + arena.h - target.size, target.y));
    }

    this.hooked = false;
    this.owner.limeProjectileActive = false;
    this.owner.limeCooldown         = 300;
    spawnSquareParticles(
      this.owner.x + this.owner.size / 2,
      this.owner.y + this.owner.size / 2,
      "#aaff00", 10, 1, 4, 6
    );
    triggerHitFreeze();
  }

  draw() {
    ctx.save();
    ctx.strokeStyle = "#aaff00";
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    ctx.beginPath();

    if (this.active) {
      // Flying: Lime → wall nodes → live tip
      ctx.moveTo(this.chain[0].x, this.chain[0].y);
      for (let i = 1; i < this.chain.length; i++) ctx.lineTo(this.chain[i].x, this.chain[i].y);
      ctx.lineTo(this.x, this.y);
    } else if (this.hooked && this.pullTarget) {
      // Pulling: draw the full remaining chain from Lime → remaining nodes → enemy
      ctx.moveTo(this.chain[0].x, this.chain[0].y);
      for (let i = 1; i < this.chain.length; i++) ctx.lineTo(this.chain[i].x, this.chain[i].y);
      ctx.lineTo(this.pullTarget.x + this.pullTarget.size / 2, this.pullTarget.y + this.pullTarget.size / 2);
    }
    ctx.stroke();
    ctx.restore();

    // Plain dot at tip while flying
    if (this.active) {
      ctx.save();
      ctx.fillStyle = "#aaff00";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}


// ── Gray's static trap clone ──────────────────────────────────────────────────
class GrayStaticClone {
  constructor(owner) {
    this.owner       = owner;
    this.mainOwner   = owner;
    this.x           = owner.x;
    this.y           = owner.y;
    this.size        = owner.size;
    this.life        = 90;          // 1.5s at 60fps
    this.hitCooldown = 0;
    this.color       = "#acacac";
  }

  update() {
    this.life--;
    if (this.hitCooldown > 0) this.hitCooldown--;

    // Check if enemy square walks into this clone
    if (this.hitCooldown > 0) return;
    squares.forEach((s) => {
      if (s === this.owner) return;
      if (s.x < this.x + this.size && s.x + s.size > this.x &&
          s.y < this.y + this.size && s.y + s.size > this.y) {
        // Freeze the enemy in place for 3s
        s.grayFreezeTimer = 180;
        this.life = 0;  // consume the clone on contact
        spawnSquareParticles(this.x + this.size / 2, this.y + this.size / 2, "#acacac", 8, 1, 3, 5);
      }
    });
  }

  draw() {
    if (this.life <= 0) return;
    const alpha = Math.min(1, this.life / 10);  // fade out in last 10 frames
    ctx.save();
    ctx.globalAlpha = 0.45 * alpha;
    ctx.fillStyle   = "#acacac";
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}


// ── Gold's static construct ───────────────────────────────────────────────────
class GoldConstruct {
  constructor(owner) {
    this.owner       = owner;
    this.x           = owner.x;
    this.y           = owner.y;
    this.size        = owner.size;
    this.life        = 90;        // 1s "morphing" phase before fully formed
    this.formed      = false;
    this.hitCooldown = 0;
    this.color       = "#FFD700";
  }

  update() {
    if (!this.formed) {
      this.life--;
      if (this.life <= 0) { this.formed = true; this.life = Infinity; }
      return;
    }
    if (this.hitCooldown > 0) this.hitCooldown--;
  }

  draw() {
    ctx.save();
    // Solid gold fill always - brighter during formation phase
    const formAlpha = this.formed ? 0.55 : (0.2 + 0.35 * (1 - this.life / 90));
    ctx.globalAlpha = formAlpha;
    ctx.fillStyle   = "#FFD700";
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
    // Solid border
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth   = 3;
    ctx.strokeRect(this.x, this.y, this.size, this.size);
    // Inner diamond marker when fully formed
    if (this.formed) {
      const cx = this.x + this.size / 2;
      const cy = this.y + this.size / 2;
      const r  = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fillStyle = "#FFD700";
      ctx.globalAlpha = 1;
      ctx.fill();
    }
    ctx.restore();
  }
}


// ── Mist's arc projectile ──────────────────────────────────────────────────────
class MistProjectile {
  constructor(owner, angle) {
    this.owner  = owner;
    this.x      = owner.x + owner.size / 2;
    this.y      = owner.y + owner.size / 2;
    const speed = PROJECTILE_SPEED;
    this.vx     = Math.cos(angle) * speed;
    this.vy     = Math.sin(angle) * speed;
    this.alive  = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Removed if out of arena
    if (this.x < arena.x || this.x > arena.x + arena.w ||
        this.y < arena.y || this.y > arena.y + arena.h) {
      this.alive = false;
      return;
    }
    // Hit enemy square
    squares.forEach((s) => {
      if (!this.alive || s === this.owner) return;
      if (this.x > s.x && this.x < s.x + s.size &&
          this.y > s.y && this.y < s.y + s.size) {
        s.hp -= 1;
        s.onTakeDamage();
        SFX.takeDamage();
        floatingNumbers.push(new FloatingNumber(s.x + s.size / 2, s.y, "1", "#ffffff"));
        spawnSquareParticles(this.x, this.y, "#ddefff", 5, 1, 2, 4);
        triggerHitFreeze();
        this.alive = false;
        // Register hit for Mist teleport counter
        this.owner.mistHitCounter = (this.owner.mistHitCounter || 0) + 1;
        if (this.owner.mistHitCounter >= 3) {
          // Flash 0.1s before teleporting and resetting
          this.owner.mistFlashTimer = 6;
        }
      }
    });
  }

  draw() {
    if (!this.alive) return;
    ctx.fillStyle = "#ddefff";
    ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
  }
}

// Teleport helper for Mist
function _mistTeleport(mist) {
  const margin  = mist.size + 10;
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    const tx = arena.x + margin + Math.random() * (arena.w - margin * 2);
    const ty = arena.y + margin + Math.random() * (arena.h - margin * 2);

    // Check not occupied by enemy square
    const blocked = squares.some((s) => {
      if (s === mist) return false;
      return tx < s.x + s.size + 10 && tx + mist.size > s.x - 10 &&
             ty < s.y + s.size + 10 && ty + mist.size > s.y - 10;
    }) || goldConstructs.some((c) => {
      if (!c.formed) return false;
      return tx < c.x + c.size + 5 && tx + mist.size > c.x - 5 &&
             ty < c.y + c.size + 5 && ty + mist.size > c.y - 5;
    });

    if (!blocked) {
      // Spawn teleport particles at old position
      spawnSquareParticles(mist.x + mist.size / 2, mist.y + mist.size / 2, "#ddefff", 15, 1, 4, 7);
      mist.x = tx;
      mist.y = ty;
      // Spawn arrival particles
      spawnSquareParticles(mist.x + mist.size / 2, mist.y + mist.size / 2, "#ddefff", 15, 1, 4, 7);
      return;
    }
  }
}
