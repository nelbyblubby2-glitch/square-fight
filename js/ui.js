// ── HUD update ────────────────────────────────────────────────────────────────

// Returns { pct, color, ready } for the charge/CD bar,
// or { segments, filled, color } for a segmented bar, or null.
function getChargeBar(s) {
  switch (s.def.type) {
    case "brown":
      return {
        pct: s.brownCharged
          ? 100
          : Math.min(100, (s.brownChargeTimer / 360) * 100),
        color: "#c07840",
        ready: s.brownCharged,
      };
    case "violet":
      if (s.violetChargePause > 0)
        return {
          pct: Math.min(100, (s.violetChargeTimer / 600) * 100),
          color: "rgba(138,43,226,0.45)",
          ready: false,
        };
      if (s.violetAimTimer > 0)
        return { pct: 100, color: "#8a2be2", ready: true };
      return {
        pct: s.violetCharged
          ? 100
          : Math.min(100, (s.violetChargeTimer / 600) * 100),
        color: "#8a2be2",
        ready: s.violetCharged,
      };
    case "blue":
      return {
        pct:
          s.blueGlobalCD > 0
            ? Math.min(100, (1 - s.blueGlobalCD / 240) * 100)
            : 100,
        color: s.def.color,
        ready: s.blueGlobalCD <= 0,
      };
    case "cyan":
      return {
        pct: Math.min(100, (1 - s.cyanSkillTimer / 390) * 100),
        color: s.def.color,
        ready: s.cyanSkillTimer <= 0,
      };
    case "scarlet":
      return {
        pct: Math.min(100, (1 - s.scarletShootTimer / 300) * 100),
        color: s.def.color,
        ready: s.scarletShootTimer <= 0,
      };
    case "indigo":
      return {
        pct: Math.min(100, (1 - s.indigoShootTimer / 180) * 100),
        color: s.def.color,
        ready: s.indigoShootTimer <= 0,
      };
    case "sky":
      return {
        pct:
          s.skyCloneCooldown > 0
            ? Math.min(100, (1 - s.skyCloneCooldown / 180) * 100)
            : 100,
        color: s.def.color,
        ready: s.skyCloneCooldown <= 0,
      };
    case "lime":
      return {
        pct:
          s.limeCooldown > 0
            ? Math.min(100, (1 - s.limeCooldown / 300) * 100)
            : 100,
        color: s.def.color,
        ready: s.limeCooldown <= 0 && !s.limeProjectileActive,
      };
    case "green":
      return {
        pct:
          s.cooldownTimer > 0
            ? Math.min(100, (1 - s.cooldownTimer / 180) * 100)
            : 100,
        color: s.def.color,
        ready: s.cooldownTimer <= 0,
      };
    case "pink":
      return {
        pct: s.pinkProjectileActive
          ? 0
          : s.pinkSkillTimer > 0
            ? Math.min(100, (1 - s.pinkSkillTimer / 480) * 100)
            : 100,
        color: s.def.color,
        ready: !s.pinkProjectileActive && s.pinkSkillTimer <= 0,
      };
    case "purple":
      return {
        segments: 4,
        filled: s.purpleChargeSegments ?? 0,
        color: s.def.color,
      };
    default:
      return null;
  }
}

// Returns { value, label } for a scaling stat, or null.
function getScalingNum(s) {
  switch (s.def.type) {
    case "red":
      return { value: `${s.bonusDamage + 1}`, label: "DMG" };
    case "green":
      return { value: `${s.projectileCount}`, label: "SHOT" };
    case "yellow":
      return { value: `${s.yellowSpeedCap.toFixed(1)}`, label: "SPD" };
    case "purple":
      return { value: `${s.toxicLevel}`, label: "POISON" };
    case "pink":
      return { value: `${s.pinkBounceCount + 1}`, label: "DMG" };
    case "sky": {
      return { value: `${s.skyCloneDmg ?? 1}`, label: "DMG" };
    }
    case "white": {
      const comp = companions.find((c) => c.owner === s);
      return { value: `${comp ? comp.damage : 1}`, label: "DMG" };
    }
    default:
      return null;
  }
}

function updateHUD() {
  squares.forEach((s, i) => {
    if (i > 1) return;
    const side = i === 0 ? "left" : "right";
    const nameEl = document.getElementById(`name-${side}`);
    const valEl = document.getElementById(`val-${side}`);
    const fill = document.getElementById(`fill-${side}`);
    const poisonFill = document.getElementById(`poison-${side}`);
    const bleedFill = document.getElementById(`bleed-${side}`);
    const cdFill = document.getElementById(`cd-${side}`);

    const currentHp = Math.max(0, s.hp);
    const previewHp =
      s.poisonPreviewHp !== null
        ? s.poisonPreviewHp
        : s.bleedPreviewHp !== null
          ? s.bleedPreviewHp
          : currentHp;

    nameEl.innerText = s.def.name;
    nameEl.style.color = s.def.color;
    valEl.innerText = `${Math.max(0, Math.ceil(s.hp))}/100`;

    fill.style.width = `${previewHp}%`;
    fill.style.backgroundColor = s.def.color;
    fill.style.boxShadow = `0 0 12px ${s.def.color}`;

    poisonFill.style.width = `${currentHp}%`;
    poisonFill.style.backgroundColor = s.def.color;
    poisonFill.style.opacity = s.poisonTimer > 0 ? "0.45" : "0";

    if (bleedFill) {
      bleedFill.style.width = `${currentHp}%`;
      bleedFill.style.backgroundColor = s.def.color;
      bleedFill.style.opacity = s.bleedTimer > 0 ? "0.45" : "0";
    }

    cdFill.style.width = `${(s.actionCooldown / ACTION_COOLDOWN) * 100}%`;

    // ── Charge / CD bar ───────────────────────────────────────────────────────
    const chargeWrap = document.getElementById(`charge-bar-${side}-wrap`);
    const chargeBar = document.getElementById(`charge-bar-${side}`);
    const chargeLbl = document.getElementById(`charge-lbl-${side}`);
    const chargeInfo = getChargeBar(s);

    if (chargeLbl) chargeLbl.style.display = "none"; // labels always hidden

    if (chargeInfo && chargeInfo.segments) {
      // ── Segmented bar (purple) ──────────────────────────────────────────────
      chargeWrap.style.display = "flex";
      chargeWrap.style.flexDirection = "column";
      chargeWrap.style.gap = "2px";
      chargeWrap.style.overflow = "visible";
      chargeWrap.style.background = "none";
      // Rebuild segments if needed
      if (chargeWrap.children.length !== chargeInfo.segments) {
        chargeWrap.innerHTML = "";
        for (let i = 0; i < chargeInfo.segments; i++) {
          const seg = document.createElement("div");
          seg.style.cssText =
            "width:10px;height:12px;border-radius:3px;background:rgba(255,255,255,0.1);transition:none;";
          chargeWrap.appendChild(seg);
        }
      }
      // Fill segments bottom-up
      const segs = chargeWrap.children;
      for (let i = 0; i < chargeInfo.segments; i++) {
        const filled = i < chargeInfo.filled;
        segs[chargeInfo.segments - 1 - i].style.backgroundColor = filled
          ? chargeInfo.color
          : "rgba(255,255,255,0.1)";
        segs[chargeInfo.segments - 1 - i].style.boxShadow = filled
          ? `0 0 6px ${chargeInfo.color}`
          : "none";
        segs[chargeInfo.segments - 1 - i].style.opacity = filled ? "1" : "0.4";
      }
    } else if (chargeInfo) {
      // ── Normal fill bar ─────────────────────────────────────────────────────
      // Restore default wrap style if it was previously a segmented bar
      chargeWrap.style.flexDirection = "column-reverse";
      chargeWrap.style.gap = "";
      chargeWrap.style.overflow = "hidden";
      chargeWrap.style.background = "rgba(255,255,255,0.1)";
      if (
        chargeWrap.children.length !== 1 ||
        chargeWrap.children[0] !== chargeBar
      ) {
        chargeWrap.innerHTML = "";
        chargeWrap.appendChild(chargeBar);
      }
      chargeWrap.style.display = "flex";
      chargeBar.style.height = `${chargeInfo.pct}%`;
      chargeBar.style.backgroundColor = chargeInfo.color;
      chargeBar.style.opacity = chargeInfo.ready ? "1" : "0.6";
      chargeBar.style.boxShadow = chargeInfo.ready
        ? `0 0 8px ${chargeInfo.color}`
        : "none";
    } else {
      chargeWrap.style.display = "none";
    }

    // ── Scaling number badge ──────────────────────────────────────────────────
    const scaleWrap = document.getElementById(`scale-badge-${side}`);
    const scaleVal = document.getElementById(`scale-val-${side}`);
    const scaleLbl = document.getElementById(`scale-lbl-${side}`);
    const scaleInfo = getScalingNum(s);

    if (scaleWrap) {
      if (scaleInfo) {
        scaleWrap.style.display = "flex";
        if (scaleVal) {
          scaleVal.innerText = scaleInfo.value;
          scaleVal.style.color = s.def.color;
        }
        if (scaleLbl) scaleLbl.innerText = scaleInfo.label;
      } else {
        scaleWrap.style.display = "none";
      }
    }
  });
}

// ── Character select UI ───────────────────────────────────────────────────────
function renderSelectUI() {
  selectedIds.forEach((id, idx) => {
    const pNum = idx + 1;
    const square = squareDefs[id];
    const prev = document.getElementById(`prev-p${pNum}`);
    const skillBox = document.getElementById(`skill-p${pNum}`);
    const grid = document.getElementById(`grid-p${pNum}`);
    const nameLabel = document.getElementById(`name-label-p${pNum}`);

    prev.style.backgroundColor = square.color;
    nameLabel.innerText = square.name;
    nameLabel.style.color = square.color;
    skillBox.querySelector(".skill-desc").innerText = square.desc;
    skillBox.querySelector(".skill-desc").style.color = square.color;

    if (grid.innerHTML === "") {
      Object.keys(squareDefs).forEach((sqId) => {
        const item = document.createElement("div");
        item.className = "grid-item";
        item.style.backgroundColor = squareDefs[sqId].color;
        item.onclick = (e) => {
          e.stopPropagation();
          selectedIds[idx] = Number(sqId);
          document
            .getElementById(`side-p${idx + 1}`)
            .classList.remove("selecting");
        };
        grid.appendChild(item);
      });
    }

    Array.from(grid.children).forEach((child, i) =>
      child.classList.toggle(
        "active",
        Number(Object.keys(squareDefs)[i]) === id,
      ),
    );
  });
}

function enterGrid(idx) {
  document.getElementById(`side-p${idx + 1}`).classList.add("selecting");
}
