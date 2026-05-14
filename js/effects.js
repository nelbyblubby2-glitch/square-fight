// ── Floating damage number ─────────────────────────────────────────────────────
// NOTE: FloatingText is for NUMBERS ONLY (damage, heal amounts, stat changes like "+4").
// Do NOT pass word strings (e.g. "FROZEN", "REELED!", "BLINK!") — use particles instead.
class FloatingText {
  constructor(x, y, text, color) {
    this.x     = x;
    this.y     = y;
    this.text  = String(text);
    this.color = color;
    this.life  = 1.0;
    this.vx    = (Math.random() - 0.5) * 2;
    this.vy    = -2.5;
  }

  update() {
    this.x    += this.vx;
    this.y    += this.vy;
    this.life -= 0.02;
  }

  draw() {
    ctx.globalAlpha = this.life;
    ctx.fillStyle   = this.color;
    ctx.font        = "bold 18px 'Plus Jakarta Sans'";
    ctx.textAlign   = "center";
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

  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function spawnSquareParticles(x, y, color, count = 6, sizeMin = 1, sizeMax = 3, speed = 6, decayMin = 0.03, decayMax = 0.05) {
  for (let i = 0; i < count; i++) {
    const size  = sizeMin + Math.random() * (sizeMax - sizeMin);
    const p     = new Particle(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, color, size);
    const angle = Math.random() * Math.PI * 2;
    const mag   = speed * (0.4 + Math.random() * 0.55);
    p.vx    = Math.cos(angle) * mag;
    p.vy    = Math.sin(angle) * mag;
    p.decay = decayMin + Math.random() * (decayMax - decayMin);
    particles.push(p);
  }
}

function triggerHitFreeze() {
  freezeTimer = Math.max(freezeTimer, FREEZE_DURATION);
}

function spawnHitEffect(x, y, color) {
  spawnSquareParticles(x, y, color, 6 + Math.floor(Math.random() * 3), 1, 3, 5);
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
    this.color     = "#ffa500";
    this.thickness = 25;
  }

  update() {
    this.size += this.growth;
    if (this.size > arena.w * 2.5) return;

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
        const damage  = isClone ? 1 : 2;
        target.hp -= damage;
        this.hitList.push(target);
        if (target.onTakeDamage) target.onTakeDamage();
        floatingTexts.push(new FloatingText(cx, target.y, damage.toString(), "#ffffff"));
        spawnSquareParticles(cx, cy, this.color, 8, 1, 3, 5);
      }
    });
  }

  draw() {
    ctx.strokeStyle  = this.color;
    ctx.lineWidth    = 4;
    ctx.globalAlpha  = Math.max(0, 0.7 - this.size / this.maxSize);
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha  = 1.0;
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
    this.color     = "#ff69b4";
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
        const damage  = isClone ? 1 : 1 + Math.floor(this.power);
        victim.hp -= damage;
        this.hitList.push(victim);
        if (victim.onTakeDamage) victim.onTakeDamage();
        floatingTexts.push(new FloatingText(vx, victim.y, damage.toString(), "#ffffff"));
        spawnSquareParticles(vx, vy, this.color, 8, 1, 3, 5);
      }
    });
  }

  draw() {
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 4;

    if (!this.active) {
      ctx.globalAlpha = 0.4;
      const padding   = 4;
      const boxSize   = this.target.size + padding;
      ctx.strokeRect(this.x - boxSize / 2, this.y - boxSize / 2, boxSize, boxSize);
    } else {
      ctx.globalAlpha = Math.max(0, 0.8 - this.size / this.maxSize);
      ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.globalAlpha = 1.0;
  }
}
