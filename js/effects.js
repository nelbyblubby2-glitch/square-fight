// ── Floating damage number ─────────────────────────────────────────────────────
// NOTE: FloatingNumber is for NUMBERS ONLY (damage, heal amounts, stat changes like "+4").
// Do NOT pass word strings (e.g. "FROZEN", "REELED!", "BLINK!") — use particles instead.
class FloatingNumber {
  // colorOrDef: pass a def object (with .color / .color2 / .color3) for gradient,
  // or a plain CSS color string for a solid number.
  constructor(x, y, text, colorOrDef) {
    this.x    = x;
    this.y    = y;
    this.text = String(text);
    this.def  = (colorOrDef && typeof colorOrDef === 'object') ? colorOrDef : null;
    this.color = this.def ? this.def.color : colorOrDef;
    this.life = 1.0;
    this.vx   = (Math.random() - 0.5) * 2;
    this.vy   = -2.5;

    // Pre-build gradient once at construction (avoids measureText + createLinearGradient every frame)
    this._style = null;
    if (this.def && this.def.color2) {
      // Use a fixed width estimate (bold 18px — avg char ~11px)
      const w = this.text.length * 11;
      const grad = ctx.createLinearGradient(this.x - w / 2, this.y, this.x + w / 2, this.y);
      grad.addColorStop(0, this.def.color);
      grad.addColorStop(this.def.color3 ? 0.5 : 1, this.def.color2);
      if (this.def.color3) grad.addColorStop(1, this.def.color3);
      this._style = grad;
    } else {
      this._style = this.color;
    }
  }

  update() {
    this.x    += this.vx;
    this.y    += this.vy;
    this.life -= 0.02;
  }

  draw() {
    ctx.globalAlpha = this.life;
    ctx.font        = "bold 18px 'Plus Jakarta Sans'";
    ctx.textAlign   = "center";
    ctx.fillStyle   = this._style;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

// ── Square particle ───────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color, size = 2) {
    this.x     = x;
    this.y     = y;
    this.vx    = (Math.random() - 0.5) * 8;
    this.vy    = (Math.random() - 0.5) * 8;
    this.life  = 1.0;
    this.decay = 0.04;
    this.color = color;
    this.size  = size;
  }

  update() {
    this.x    += this.vx;
    this.y    += this.vy;
    this.life -= this.decay;
  }

  // draw() is NOT called individually — particles are batched in drawParticlesBatched()
}

// Batched particle draw — particles are kept in color-sorted order via
// insertSortedByColor(), so no sort is needed here each frame.
function drawParticlesBatched(particleArr) {
  let lastColor = null;
  for (let i = 0; i < particleArr.length; i++) {
    const p = particleArr[i];
    if (p.color !== lastColor) {
      ctx.fillStyle = p.color;
      lastColor = p.color;
    }
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Pick a random color from a def's gradient palette, or return plain color string.
function _pickParticleColor(colorOrDef) {
  if (!colorOrDef || typeof colorOrDef === "string") return colorOrDef;
  const def = colorOrDef;
  const pool = [def.color];
  if (def.color2) pool.push(def.color2);
  if (def.color3) pool.push(def.color3);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Binary-insert a particle into the array in color-sorted order.
// Keeps the array sorted so drawParticlesBatched() never needs to sort.
function insertSortedByColor(arr, p) {
  const color = p.color;
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].color < color) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, p);
}

function spawnSquareParticles(x, y, colorOrDef, count = 6, sizeMin = 1, sizeMax = 3, speed = 6, decayMin = 0.03, decayMax = 0.05) {
  for (let i = 0; i < count; i++) {
    const size  = sizeMin + Math.random() * (sizeMax - sizeMin);
    const color = _pickParticleColor(colorOrDef);
    const p     = new Particle(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, color, size);
    const angle = Math.random() * Math.PI * 2;
    const mag   = speed * (0.4 + Math.random() * 0.55);
    p.vx    = Math.cos(angle) * mag;
    p.vy    = Math.sin(angle) * mag;
    p.decay = decayMin + Math.random() * (decayMax - decayMin);
    insertSortedByColor(particles, p);
  }
}

function triggerHitFreeze() {
  freezeTimer = Math.max(freezeTimer, FREEZE_DURATION);
}

function spawnHitEffect(x, y, colorOrDef) {
  spawnSquareParticles(x, y, colorOrDef, 6 + Math.floor(Math.random() * 3), 1, 3, 5);
  triggerHitFreeze();
}

// ── Orange expanding pulse ────────────────────────────────────────────────────
class Pulse {
  constructor(owner) {
    this.owner     = owner;
    this.x         = owner.x + owner.size / 2;
    this.y         = owner.y + owner.size / 2;
    this.size      = 0;
    this.growth    = 12;
    this.maxSize   = 2500;
    this.hitList   = [];
    this.color     = owner.def.color;
    this.def       = owner.def;
    this.thickness = 25;
  }

  update() {
    this.size += this.growth;
    const sizeLimit = this.maxSize || arena.w * 2.5;
    if (this.size > sizeLimit) return;

    const halfSize = this.size / 2;

    [...squares, ...clones].forEach((target) => {
      if (target === this.owner || this.hitList.includes(target)) return;

      const cx    = target.x + target.size / 2;
      const cy    = target.y + target.size / 2;
      const distX = Math.abs(cx - this.x);
      const distY = Math.abs(cy - this.y);

      const onVertical   = distX >= halfSize - this.thickness && distX <= halfSize && distY <= halfSize;
      const onHorizontal = distY >= halfSize - this.thickness && distY <= halfSize && distX <= halfSize;

      if (onVertical || onHorizontal) {
        const inArena = target.x >= arena.x && target.x + target.size <= arena.x + arena.w &&
                        target.y >= arena.y && target.y + target.size <= arena.y + arena.h;
        if (!inArena) return;

        const isClone = target instanceof Clone;
        const damage  = isClone ? 1 : (this._fixedDamage !== undefined ? this._fixedDamage : (this._isYellowShockwave ? this._yellowSpeedDmg : 2));
        const actualPulseDmg = (target.absorbDamage) ? target.absorbDamage(damage) : (target.hp -= damage, damage);
        this.hitList.push(target);
        if (target.onTakeDamage) target.onTakeDamage();
        if (!isClone && actualPulseDmg > 0) SFX.takeDamage();
        if (actualPulseDmg > 0) {
          floatingNumbers.push(new FloatingNumber(cx, target.y, actualPulseDmg.toString(), this.def));
          spawnSquareParticles(cx, cy, this.def, 8, 1, 3, 5);
        }
      }
    });
  }

  draw() {
    ctx.lineWidth    = 4;
    const sizeLimit  = this.maxSize || 2500;
    ctx.globalAlpha  = Math.max(0, 0.7 - this.size / sizeLimit);
    if (this.def) {
      strokeGradRect(this.def, this.x, this.y, this.size);
    } else {
      ctx.strokeStyle = this.color;
      ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.globalAlpha  = 1.0;
  }
}

// ── Blue pulse — small expanding pulse, damage+size scales with hit count ─────
class BluePulse {
  constructor(owner, x, y, level, projHitTargets) {
    this.owner          = owner;
    this.x              = x;
    this.y              = y;
    this.level          = level;           // blueHits at time of fire
    this.damage         = 1 + level; // base 1 dmg + 1 per hit (blueHits already includes passive bonus)
    this.size           = 0;
    this.maxSize        = 150 + level * 16; // base small, grows with level
    this.growth         = 8;
    this.thickness      = 20;
    // Pre-populate hitList with any targets already hit by the projectile
    // so they receive damage from only one source (projectile OR pulse, not both)
    this.hitList        = projHitTargets ? [...projHitTargets] : [];
    this.color          = owner.def.color;
    this.def            = owner.def;
  }

  applyEmpowered() {
    this.damage  *= 2;
    this.maxSize *= 2;
    this.thickness = 30;
  }

  update() {
    this.size += this.growth;
    if (this.size > this.maxSize) return;
    if (typeof gameOver !== 'undefined' && gameOver) return;

    const halfSize = this.size / 2;

    [...squares, ...clones].forEach((target) => {
      if (target === this.owner || this.hitList.includes(target)) return;
      if (target.hp <= 0) return;

      const cx    = target.x + target.size / 2;
      const cy    = target.y + target.size / 2;
      const distX = Math.abs(cx - this.x);
      const distY = Math.abs(cy - this.y);

      const onVertical   = distX >= halfSize - this.thickness && distX <= halfSize && distY <= halfSize;
      const onHorizontal = distY >= halfSize - this.thickness && distY <= halfSize && distX <= halfSize;

      if (onVertical || onHorizontal) {
        const isClone = target instanceof Clone;
        const dmg     = isClone ? 1 : this.damage;
        const actualBluePulse = (target.absorbDamage) ? target.absorbDamage(dmg) : (target.hp -= dmg, dmg);
        this.hitList.push(target);
        if (target.onTakeDamage) target.onTakeDamage();
        if (!isClone && actualBluePulse > 0) {
          SFX.takeDamage();
          // Pulse hits also increment blueHits by 2 (same as projectile hits)
          if (this.owner && this.owner.blueHits !== undefined) {
            this.owner.blueHits += 2;
          }
        }
        if (actualBluePulse > 0) {
          floatingNumbers.push(new FloatingNumber(cx, target.y, actualBluePulse.toString(), this.def));
          spawnSquareParticles(cx, cy, this.def, 8, 1, 3, 5);
        }
      }
    });
  }

  draw() {
    ctx.lineWidth   = 3;
    ctx.globalAlpha = Math.max(0, 0.8 - this.size / this.maxSize);
    if (this.def) {
      strokeGradRect(this.def, this.x, this.y, this.size);
    } else {
      ctx.strokeStyle = this.color;
      ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.globalAlpha = 1.0;
  }
}


// ── Pink delayed pulse (locks on then expands) ────────────────────────────────
class FollowingPulse {
  constructor(owner, target, x, y, power) {
    this.owner     = owner;
    this.target    = target;
    this.x         = x;
    this.y         = y;
    this.size      = 0;
    this.maxSize   = 350;
    this.growth    = 10;
    this.delay     = 120;
    this.active    = false;
    this.hitList   = [];
    this.color     = owner.def.color;
    this.def       = owner.def;
    this.power     = power;
    this.thickness = 25;
  }

  update() {
    // Track the target during lock-on phase
    if (this.target && this.target.hp > 0 && !this.active) {
      this.x = this.target.x + this.target.size / 2;
      this.y = this.target.y + this.target.size / 2;
    }

    if (this.delay > 0) {
      this.delay--;
      if (this.delay === 0) {
        this.active = true;
        if (this.owner && this.owner.pinkBounceCount !== undefined) {
          this.owner.pinkBounceCount = 0;
        }
      }
      return;
    }

    this.size += this.growth;

    const halfSize = this.size / 2;

    [...squares, ...clones].forEach((victim) => {
      if (victim === this.owner || this.hitList.includes(victim)) return;

      const vx    = victim.x + victim.size / 2;
      const vy    = victim.y + victim.size / 2;
      const distX = Math.abs(vx - this.x);
      const distY = Math.abs(vy - this.y);

      const onVertical   = distX >= halfSize - this.thickness && distX <= halfSize && distY <= halfSize;
      const onHorizontal = distY >= halfSize - this.thickness && distY <= halfSize && distX <= halfSize;

      if (onVertical || onHorizontal) {
        const isClone = victim instanceof Clone;
        const damage  = isClone ? 1 : (this._fixedDamage !== undefined ? this._fixedDamage : 1 + Math.floor(this.power));
        const actualFollowDmg = (victim.absorbDamage) ? victim.absorbDamage(damage) : (victim.hp -= damage, damage);
        this.hitList.push(victim);
        if (victim.onTakeDamage) victim.onTakeDamage();
        if (!isClone && actualFollowDmg > 0) SFX.takeDamage();
        if (actualFollowDmg > 0) {
          floatingNumbers.push(new FloatingNumber(vx, victim.y, actualFollowDmg.toString(), this.def));
          spawnSquareParticles(vx, vy, this.def, 8, 1, 3, 5);
        }
      }
    });
  }

  draw() {
    ctx.lineWidth   = 4;

    if (!this.active) {
      ctx.globalAlpha = 0.4;
      const padding   = 4;
      const boxSize   = this.target.size + padding;
      if (this.def) {
        strokeGradRect(this.def, this.x, this.y, boxSize);
      } else {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x - boxSize / 2, this.y - boxSize / 2, boxSize, boxSize);
      }
    } else {
      ctx.globalAlpha = Math.max(0, 0.8 - this.size / this.maxSize);
      if (this.def) {
        strokeGradRect(this.def, this.x, this.y, this.size);
      } else {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      }
    }
    ctx.globalAlpha = 1.0;
  }
}
