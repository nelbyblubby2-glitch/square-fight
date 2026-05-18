// ── HUD update ────────────────────────────────────────────────────────────────

// Returns { pct, color, ready } for the charge/CD bar,
// or { segments, filled, color } for a segmented bar, or null.
function getChargeBar(s) {
  switch (s.def.type) {
    case "red":
      // If rogue no-cooldown upgrade active, hide the passive CD bar entirely
      if (s._rogueNoPassiveCD) return null;
      return {
        pct:
          s.redAbilityCD > 0
            ? Math.min(100, (1 - s.redAbilityCD / 120) * 100)
            : 100,
        color: s.def.color,
        ready: s.redAbilityCD <= 0,
      };
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
    case "blue": {
      const blueMaxCD = Math.max(60, 300 - (s._rogueBlueCondenser || 0) * 30);
      return {
        pct: Math.min(100, (s.blueShootCD / blueMaxCD) * 100),
        color: s.def.color,
        ready: s.blueShootCD >= blueMaxCD,
      };
    }
    case "cyan":
      return {
        pct: Math.min(100, (1 - s.cyanSkillTimer / 390) * 100),
        color: s.def.color,
        ready: s.cyanSkillTimer <= 0,
      };
    case "scarlet":
      return {
        segments: 7,
        filled:   s.scarletCounter || 0,
        color:    s.def.color,
        ready:    (s.scarletCounter || 0) >= 7,
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
    case "ruby":
      return {
        pct:   s.rubyCD > 0 ? Math.min(100, (1 - s.rubyCD / 240) * 100) : 100,
        color: s.def.color,
        ready: s.rubyCD <= 0 && !s.rubyProjectileActive,
      };
    case "green": {
      // Dynamic hit counter segments based on threshold reduction
      const threshold = Math.max(
        1,
        3 - (s._roguePassiveThresholdReduction || 0),
      );
      // At threshold 1 (max reduction = 2 picks), no bar needed
      if (threshold === 1) return null;
      return {
        segments: threshold,
        filled:
          s.greenFlashTimer > 0
            ? threshold
            : Math.min(s.greenHitCounter ?? 0, threshold),
        color: s.def.color,
      };
    }
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
    case "silver":
      return {
        pct:   Math.min(100, (s.silverSpawnTimer / SILVER_SPAWN_INTERVAL) * 100),
        color: SILVER_COLOR,
        ready: s.silverSpawnTimer >= SILVER_SPAWN_INTERVAL ||
               silverSquares.length >= SILVER_MAX_COUNT,
      };
    case "gold":
      return null;  // Gold has no charge bar — coins drop on clash, no cooldown UI
    case "magenta":
      // While beam is active (flying or tethering), show full bar; otherwise show CD fill
      if (s.magentaBeamActive) return { pct: 100, color: s.def.color, ready: true };
      return {
        pct:   s.magentaBeamCD > 0 ? Math.min(100, (1 - s.magentaBeamCD / 270) * 100) : 100,
        color: s.def.color,
        ready: s.magentaBeamCD <= 0 && !s.magentaBeamActive,
      };
    case "emerald":
      // During barrage: pulse full bar; during CD: fill toward ready
      if (s.emeraldBarraging) return { pct: 100, color: s.def.color, ready: true };
      return {
        pct:   s.emeraldCD > 0 ? Math.min(100, (1 - s.emeraldCD / 360) * 100) : 100,
        color: s.def.color,
        ready: s.emeraldCD <= 0 && !s.emeraldBarraging,
      };
    case "topaz":
      return {
        pct: Math.min(100, (s.topazConstructTimer / 600) * 100),
        color: s.def.color,
        ready: s.topazConstructTimer >= 600,
      };
    case "mist":
      // Segmented: 3 segments showing hit counter toward teleport
      return {
        segments: 3,
        filled: s.mistFlashTimer > 0 ? 3 : (s.mistHitCounter ?? 0),
        color: s.def.color,
      };
    case "sapphire":
      return {
        pct:
          s.sapphirePassiveCD > 0
            ? Math.min(100, (1 - s.sapphirePassiveCD / COOLDOWN_FRAMES) * 100)
            : 100,
        color: s.def.color,
        ready: !(s.sapphirePassiveCD > 0),
      };
    case "crimson":
      return {
        pct:   Math.min(100, (1 - (s.crimsonHealCD || 0) / 300) * 100),
        color: s.def.color,
        ready: !(s.crimsonHealCD > 0),
      };
    case "gray":
      return {
        pct:   Math.min(100, (s.grayProjTimer / 240) * 100),
        color: s.def.color,
        ready: s.grayProjTimer >= 240,
      };
    default:
      return null;
  }
}

// Returns secondary charge bar info (segments for Red counter-chase, CD for green), or null.
function getChargeBar2(s) {
  switch (s.def.type) {
    case "red":
      if (!s._rogueHitTriggersChase) return null;
      return {
        segments: 2,
        filled: s._hitChaseCharge || 0,
        color: s.def.color,
      };
    case "yellow": {
      const threshold = s._rogueYellowBounceShockwaveThreshold || 0;
      if (!threshold) return null;
      return {
        segments: threshold,
        filled: s._rogueYellowBounceCount || 0,
        color: s.def.color,
      };
    }
    case "blue": {
      if (!s._rogueBlueSplinterThreshold) return null;
      return {
        segments: s._rogueBlueSplinterThreshold,
        filled: Math.min(s._rogueBlueSplinterThreshold, s._rogueBlueSplinterCount || 0),
        color: s.def.color,
      };
    }
    case "green": {
      const shootCooldown = Math.max(
        60,
        180 - (s._rogueShootCooldownReduction || 0) * 60,
      );
      return {
        pct:
          s.cooldownTimer > 0
            ? Math.min(100, (1 - s.cooldownTimer / shootCooldown) * 100)
            : 100,
        color: s.def.color,
        ready: s.cooldownTimer <= 0 && s.burstShotsLeft === 0,
      };
    }
    default:
      return null;
  }
}

// Returns tertiary charge bar info, or null.
function getChargeBar3(s) {
  switch (s.def.type) {
    case "red":
      if (!s._rogueBounceEmpowerThreshold) return null;
      return {
        segments: s._rogueBounceEmpowerThreshold,
        filled: s._rogueBounceEmpowered
          ? s._rogueBounceEmpowerThreshold
          : s._rogueBounceCount || 0,
        color: s.def.color,
        alwaysFull: s._rogueBounceEmpowered, // pulsing full while empower is active
      };
    case "green": {
      const mThreshold = s._rogueMilestoneShotThreshold || 0;
      if (!mThreshold) return null;
      const mFilled = (s._rogueTotalHitCount || 0) % mThreshold;
      return {
        segments: mThreshold,
        filled: mFilled,
        color: s.def.color,
      };
    }
    case "blue": {
      if (!s._rogueBlueEmpoweredShot) return null;
      return {
        segments: 2,
        filled: Math.min(2, s._blueShootCount || 0),
        color: s.def.color,
      };
    }
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
    case "blue":
      return { value: `${(s.blueHits ?? 0) + 1}`, label: "DMG" };
    case "sapphire":
      return { value: `${s.bonusDamage + 1}`, label: "DMG" };
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
    const maxHp = s.maxHp || 100;
    const previewHp = Math.min(
      currentHp,
      s.poisonPreviewHp !== null ? s.poisonPreviewHp : currentHp,
      s.bleedPreviewHp !== null ? s.bleedPreviewHp : currentHp,
    );

    nameEl.innerText = s.def.name;
    nameEl.style.color = s.def.color;
    valEl.innerText = `${Math.max(0, Math.ceil(s.hp))}/${maxHp}`;

    fill.style.width = `${(previewHp / maxHp) * 100}%`;
    fill.style.backgroundColor = s.def.color;
    fill.style.boxShadow = `0 0 12px ${s.def.color}`;

    poisonFill.style.width = `${(currentHp / maxHp) * 100}%`;
    poisonFill.style.backgroundColor = s.def.color;
    poisonFill.style.opacity = s.poisonTimer > 0 ? "0.45" : "0";

    if (bleedFill) {
      bleedFill.style.width = `${(currentHp / maxHp) * 100}%`;
      bleedFill.style.backgroundColor = s.def.color;
      bleedFill.style.opacity = (s.bleedTimer > 0 || s.scarletDelayed > 0) ? "0.45" : "0";
    }

    cdFill.style.width = `${(s.actionCooldown / ACTION_COOLDOWN) * 100}%`;

    cdFill.style.backgroundColor = s.def.color; 
    cdFill.style.boxShadow = `0 0 8px ${s.def.color}`; 
    cdFill.style.opacity = "1"; 

    // -- Primary charge bar (opacity-toggled, never removed from DOM) ----------
    const chargeWrap = document.getElementById(`charge-bar-${side}-wrap`);
    const chargeInfo = getChargeBar(s);

    if (chargeInfo && chargeInfo.segments) {
      if (chargeWrap.dataset.mode !== "seg" + chargeInfo.segments) {
        chargeWrap.innerHTML = "";
        chargeWrap.dataset.mode = "seg" + chargeInfo.segments;
        chargeWrap.dataset.flashTimer = "0";
        chargeWrap.style.overflow = "visible";
        chargeWrap.style.flexDirection = "column";
        chargeWrap.style.justifyContent = "center";
        chargeWrap.style.alignItems = "center";
        chargeWrap.style.gap = "4px";
        chargeWrap.style.background = "none";
        chargeWrap.style.borderRadius = "5px";
        chargeWrap.style.padding = "2px"; 
        chargeWrap.style.boxSizing = "border-box";
        
        for (let i = 0; i < chargeInfo.segments; i++) {
          const seg = document.createElement("div");
          seg.style.cssText =
            "width:10px; flex:1; min-height:0; background:rgba(255,255,255,0.12); transition:none; flex-shrink:0;";

          if (i === 0) {
            seg.style.borderTopLeftRadius = "5px";
            seg.style.borderTopRightRadius = "5px";
          }
          if (i === chargeInfo.segments - 1) {
            seg.style.borderBottomLeftRadius = "5px";
            seg.style.borderBottomRightRadius = "5px";
          }
          chargeWrap.appendChild(seg);
        }
      }
      const segs = chargeWrap.children;
      const isFull = chargeInfo.filled >= chargeInfo.segments;

      if (isFull) {
        chargeWrap.dataset.flashTimer = "1";
      }
      const flashTimer = parseInt(chargeWrap.dataset.flashTimer || "0", 10);
      const showFull = isFull || flashTimer > 0;
      if (!isFull && flashTimer > 0) {
        chargeWrap.dataset.flashTimer = String(flashTimer - 1);
      }

      for (let i = 0; i < chargeInfo.segments; i++) {
        const filled = showFull ? true : i < chargeInfo.filled;
        segs[chargeInfo.segments - 1 - i].style.backgroundColor = filled
          ? chargeInfo.color
          : "rgba(255, 255, 255, 0.67)";
        segs[chargeInfo.segments - 1 - i].style.boxShadow = "none";
        segs[chargeInfo.segments - 1 - i].style.opacity = showFull
          ? "1"
          : filled
            ? "0.4"
            : "0.15";
      }
      chargeWrap.style.opacity = "1";
      chargeWrap.style.display = "flex";
    } else if (chargeInfo) {
      if (chargeWrap.dataset.mode !== "fill") {
        chargeWrap.innerHTML = "";
        chargeWrap.dataset.mode = "fill";
        chargeWrap.style.overflow = "hidden";
        chargeWrap.style.background = "rgba(255,255,255,0.1)";
        chargeWrap.style.flexDirection = "column-reverse";
        chargeWrap.style.justifyContent = "";
        chargeWrap.style.alignItems = "";
        chargeWrap.style.gap = "";
        chargeWrap.style.borderRadius = "";
        chargeWrap.style.padding = "";
        chargeWrap.style.boxSizing = "";
        const fb = document.createElement("div");
        fb.className = "charge-fill";
        chargeWrap.appendChild(fb);
      }
      const fillBar = chargeWrap.firstChild;
      fillBar.style.height = `${chargeInfo.pct}%`;
      fillBar.style.backgroundColor = chargeInfo.color;
      fillBar.style.opacity = "1"; 
      fillBar.style.boxShadow = `0 0 10px ${chargeInfo.color}`; 
      chargeWrap.style.opacity = "1";
      chargeWrap.style.display = "flex";
    } else {
      chargeWrap.style.opacity = "0";
      chargeWrap.style.display = "none";
      chargeWrap.dataset.mode = "";
    }

    // -- Secondary charge bar — supports both segments and fill modes ----------
    const charge2Wrap = document.getElementById(`charge-bar2-${side}-wrap`);
    const chargeInfo2 = getChargeBar2(s);
    if (charge2Wrap) {
      if (chargeInfo2 && chargeInfo2.segments) {
        if (charge2Wrap.dataset.mode !== "seg2_" + chargeInfo2.segments) {
          charge2Wrap.innerHTML = "";
          charge2Wrap.dataset.mode = "seg2_" + chargeInfo2.segments;
          charge2Wrap.dataset.flashTimer = "0";
          charge2Wrap.style.overflow = "visible";
          charge2Wrap.style.flexDirection = "column";
          charge2Wrap.style.justifyContent = "center";
          charge2Wrap.style.alignItems = "center";
          charge2Wrap.style.gap = "4px";
          charge2Wrap.style.background = "none";
          charge2Wrap.style.borderRadius = "5px";
          charge2Wrap.style.padding = "2px";
          charge2Wrap.style.boxSizing = "border-box";
          
          for (let i = 0; i < chargeInfo2.segments; i++) {
            const seg = document.createElement("div");
            seg.style.cssText =
              "width:10px; flex:1; min-height:0; background:rgba(255,255,255,0.12); transition:none; flex-shrink:0;";

            if (i === 0) {
              seg.style.borderTopLeftRadius = "5px";
              seg.style.borderTopRightRadius = "5px";
            }
            if (i === chargeInfo2.segments - 1) {
              seg.style.borderBottomLeftRadius = "5px";
              seg.style.borderBottomRightRadius = "5px";
            }
            charge2Wrap.appendChild(seg);
          }
        }
        const segs2 = charge2Wrap.children;
        const isFull2 = chargeInfo2.filled >= chargeInfo2.segments;

        if (isFull2) {
          charge2Wrap.dataset.flashTimer = "1";
        }
        const flashTimer2 = parseInt(charge2Wrap.dataset.flashTimer || "0", 10);
        const showFull2 = isFull2 || flashTimer2 > 0;
        if (!isFull2 && flashTimer2 > 0) {
          charge2Wrap.dataset.flashTimer = String(flashTimer2 - 1);
        }

        for (let i = 0; i < chargeInfo2.segments; i++) {
          const filled = showFull2 ? true : i < chargeInfo2.filled;
          segs2[chargeInfo2.segments - 1 - i].style.backgroundColor = filled
            ? chargeInfo2.color
            : "rgba(255, 255, 255, 0.67)";
          segs2[chargeInfo2.segments - 1 - i].style.boxShadow = "none";
          segs2[chargeInfo2.segments - 1 - i].style.opacity = showFull2
            ? "1"
            : filled
              ? "0.4"
              : "0.15";
        }
        charge2Wrap.style.opacity = "1";
        charge2Wrap.style.display = "flex";
      } else if (chargeInfo2) {
        if (charge2Wrap.dataset.mode !== "fill2") {
          charge2Wrap.innerHTML = "";
          charge2Wrap.dataset.mode = "fill2";
          charge2Wrap.style.overflow = "hidden";
          charge2Wrap.style.flexDirection = "column-reverse";
          charge2Wrap.style.justifyContent = "";
          charge2Wrap.style.alignItems = "";
          charge2Wrap.style.gap = "";
          charge2Wrap.style.background = "rgba(255,255,255,0.1)";
          charge2Wrap.style.borderRadius = "";
          charge2Wrap.style.padding = "";
          charge2Wrap.style.boxSizing = "";
          const fb2 = document.createElement("div");
          fb2.className = "charge-fill";
          charge2Wrap.appendChild(fb2);
        }
        const fillBar2 = charge2Wrap.firstChild;
        fillBar2.style.height = `${chargeInfo2.pct}%`;
        fillBar2.style.backgroundColor = chargeInfo2.color;
        fillBar2.style.opacity = chargeInfo2.ready ? "1" : "0.6";
        fillBar2.style.boxShadow = chargeInfo2.ready
          ? `0 0 8px ${chargeInfo2.color}`
          : `0 0 4px ${chargeInfo2.color}`;
        charge2Wrap.style.opacity = "1";
        charge2Wrap.style.display = "flex";
      } else {
        charge2Wrap.style.opacity = "0";
        charge2Wrap.style.display = "none";
        charge2Wrap.dataset.mode = "";
      }
    }

    // -- Tertiary charge bar (charge-bar3) ------------------------------------
    const charge3Wrap = document.getElementById(`charge-bar3-${side}-wrap`);
    if (charge3Wrap) {
      const chargeInfo3 = getChargeBar3(s);
      if (chargeInfo3 && chargeInfo3.segments) {
        if (charge3Wrap.dataset.mode !== "seg3_" + chargeInfo3.segments) {
          charge3Wrap.innerHTML = "";
          charge3Wrap.dataset.mode = "seg3_" + chargeInfo3.segments;
          charge3Wrap.dataset.flashTimer = "0";
          charge3Wrap.style.overflow = "visible";
          charge3Wrap.style.flexDirection = "column";
          charge3Wrap.style.justifyContent = "center";
          charge3Wrap.style.alignItems = "center";
          charge3Wrap.style.gap = "4px";
          charge3Wrap.style.background = "none";
          charge3Wrap.style.borderRadius = "5px";
          charge3Wrap.style.padding = "2px";
          charge3Wrap.style.boxSizing = "border-box";
          
          for (let i = 0; i < chargeInfo3.segments; i++) {
            const seg = document.createElement("div");
            seg.style.cssText =
              "width:10px; flex:1; min-height:0; background:rgba(255,255,255,0.12); transition:none; flex-shrink:0;";

            if (i === 0) {
              seg.style.borderTopLeftRadius = "5px";
              seg.style.borderTopRightRadius = "5px";
            }
            if (i === chargeInfo3.segments - 1) {
              seg.style.borderBottomLeftRadius = "5px";
              seg.style.borderBottomRightRadius = "5px";
          }
            charge3Wrap.appendChild(seg);
          }
        }
        const segs3 = charge3Wrap.children;
        const isFull3 = chargeInfo3.filled >= chargeInfo3.segments;

        if (chargeInfo3.alwaysFull || isFull3) {
          charge3Wrap.dataset.flashTimer = "1";
        }
        const flashTimer3 = parseInt(charge3Wrap.dataset.flashTimer || "0", 10);
        const showFull3 = chargeInfo3.alwaysFull || isFull3 || flashTimer3 > 0;
        if (!chargeInfo3.alwaysFull && !isFull3 && flashTimer3 > 0) {
          charge3Wrap.dataset.flashTimer = String(flashTimer3 - 1);
        }

        for (let i = 0; i < chargeInfo3.segments; i++) {
          const filled = showFull3 ? true : i < chargeInfo3.filled;
          segs3[chargeInfo3.segments - 1 - i].style.backgroundColor = filled
            ? chargeInfo3.color
            : "rgba(255, 255, 255, 0.67)";
          segs3[chargeInfo3.segments - 1 - i].style.boxShadow = "none";
          segs3[chargeInfo3.segments - 1 - i].style.opacity = showFull3
            ? "1"
            : filled
              ? "0.4"
              : "0.15";
        }
        charge3Wrap.style.opacity = "1";
        charge3Wrap.style.display = "flex";
      } else {
        charge3Wrap.style.opacity = "0";
        charge3Wrap.style.display = "none";
        charge3Wrap.dataset.mode = "";
      }
    }

    // -- Scale badge — always in DOM, opacity toggled -------------------------
    const scaleWrap = document.getElementById(`scale-badge-${side}`);
    const scaleVal = document.getElementById(`scale-val-${side}`);
    const scaleLbl = document.getElementById(`scale-lbl-${side}`);
    const scaleInfo = getScalingNum(s);

    if (scaleWrap) {
      if (scaleInfo) {
        scaleWrap.style.opacity = "1";
        scaleWrap.style.display = "flex";
        if (scaleVal) {
          scaleVal.innerText = scaleInfo.value;
          scaleVal.style.color = s.def.color;
        }
        if (scaleLbl) scaleLbl.innerText = scaleInfo.label;
      } else {
        scaleWrap.style.opacity = "0";
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
          SFX.uiClick();
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

function openSquareFightSelect() {
  currentScreen = "select";
  showScreen("select-screen");
  activeMode = "squarefight-select"; // must come AFTER showScreen(), which overwrites activeMode
}