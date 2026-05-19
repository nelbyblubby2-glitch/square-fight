// ── Square color helpers (gradient support) ───────────────────────────────────
// Returns a canvas fillStyle: a gradient if def.color2 is set, else a solid color.
// x, y, w, h define the bounding box for the gradient.
// getSquareStyle: cache by (w,h) only — gradient runs (0,0)→(w,h) in local space.
// Always call this after translating the canvas to the shape's top-left corner, then
// draw at fillRect(0,0,w,h). Use fillGradRect() which does this automatically.
function getSquareStyle(def, w, h) {
  if (!def.color2) return def.color;
  const key = `${w},${h}`;
  if (def._gradCache && def._gradCache.key === key) return def._gradCache.grad;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, def.color);
  grad.addColorStop(def.color3 ? 0.5 : 1, def.color2);
  if (def.color3) grad.addColorStop(1, def.color3);
  def._gradCache = { key, grad };
  return grad;
}

// fillGradRect: translate to (x,y), fill gradient rect at (0,0,w,h), un-translate.
// This lets getSquareStyle cache the gradient by size alone — position is handled by the CTM.
// Does NOT save/restore, so callers can set globalAlpha etc. around this call freely.
function fillGradRect(def, x, y, w, h) {
  ctx.translate(x, y);
  ctx.fillStyle = getSquareStyle(def, w, h);
  ctx.fillRect(0, 0, w, h);
  ctx.translate(-x, -y);
}

// Returns a canvas gradient along a line from (x1,y1) to (x2,y2).
// Caches on def._lineGradCache keyed by 4-px-quantised endpoints — stationary lasers
// get a permanent cache hit; fast projectiles miss at most every ~1 frame.
function getLineGradient(x1, y1, x2, y2, def) {
  if (!def.color2) return def.color;
  const key = `${Math.round(x1/4)*4},${Math.round(y1/4)*4},${Math.round(x2/4)*4},${Math.round(y2/4)*4}`;
  if (def._lineGradCache && def._lineGradCache.key === key) return def._lineGradCache.grad;
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, def.color);
  grad.addColorStop(def.color3 ? 0.5 : 1, def.color2);
  if (def.color3) grad.addColorStop(1, def.color3);
  def._lineGradCache = { key, grad };
  return grad;
}

// Internal helper: returns a stroke gradient in *local* canvas space
// (gradient runs from (-size/2,-size/2) to (size/2,size/2)).
// Cached on def._strokeGradCache keyed by Math.round(size) — fixed-size entity
// borders are created once and reused forever; growing pulse rings miss once per
// frame but still skip the key-building on every other call.
function _getStrokeStyle(def, size) {
  if (!def.color2) return def.color;
  const key = `s${Math.round(size)}`;
  if (def._strokeGradCache && def._strokeGradCache.key === key) return def._strokeGradCache.grad;
  const half = size / 2;
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  grad.addColorStop(0, def.color);
  grad.addColorStop(def.color3 ? 0.5 : 1, def.color2);
  if (def.color3) grad.addColorStop(1, def.color3);
  def._strokeGradCache = { key, grad };
  return grad;
}

// strokeGradRect: translate to (cx,cy), apply cached local-space stroke gradient,
// draw strokeRect(-size/2,-size/2,size,size), un-translate.
// Does NOT save/restore — caller's lineWidth and globalAlpha are preserved.
function strokeGradRect(def, cx, cy, size) {
  ctx.strokeStyle = _getStrokeStyle(def, size);
  ctx.translate(cx, cy);
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.translate(-cx, -cy);
}

// Legacy: returns an absolute-coord stroke gradient. Kept for any callers not
// yet migrated to strokeGradRect.
function getRectStrokeGradient(cx, cy, size, def) {
  if (!def.color2) return def.color;
  return getLineGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, def);
}

// Returns a CSS gradient string for HTML elements (UI bars, previews, selector grid).
// Falls back to a plain color string if no gradient colors are defined.
function getSquareCSSGradient(def, direction = "135deg") {
  if (!def.color2) return def.color;
  if (def.color3) return `linear-gradient(${direction}, ${def.color}, ${def.color2}, ${def.color3})`;
  return `linear-gradient(${direction}, ${def.color}, ${def.color2})`;
}

// ── Line–line intersection ────────────────────────────────────────────────────
function lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// ── Line vs axis-aligned rect ─────────────────────────────────────────────────
function lineIntersectsRect(x1, y1, x2, y2, rect) {
  return (
    lineLine(x1, y1, x2, y2, rect.x,            rect.y,            rect.x + rect.size, rect.y           ) ||
    lineLine(x1, y1, x2, y2, rect.x,            rect.y,            rect.x,             rect.y + rect.size) ||
    lineLine(x1, y1, x2, y2, rect.x + rect.size, rect.y,           rect.x + rect.size, rect.y + rect.size) ||
    lineLine(x1, y1, x2, y2, rect.x,            rect.y + rect.size, rect.x + rect.size, rect.y + rect.size)
  );
}

// ── Project a ray from (sx,sy) toward (tx,ty) until it hits a canvas wall ────
function getBeamWallEnd(sx, sy, tx, ty) {
  const dx = tx - sx;
  const dy = ty - sy;
  const candidates = [];
  const margin = 50;

  if (dx !== 0) {
    const tLeft  = (-margin - sx) / dx;
    if (tLeft  > 0) candidates.push({ t: tLeft,  x: -margin, y: sy + dy * tLeft  });
    // Change canvas.width to VIRTUAL_WIDTH
    const tRight = (VIRTUAL_WIDTH + margin - sx) / dx; 
    if (tRight > 0) candidates.push({ t: tRight, x: VIRTUAL_WIDTH + margin, y: sy + dy * tRight });
  }
  if (dy !== 0) {
    const tTop    = (-margin - sy) / dy;
    if (tTop    > 0) candidates.push({ t: tTop,    x: sx + dx * tTop,    y: -margin });
    // Change canvas.height to VIRTUAL_HEIGHT
    const tBottom = (VIRTUAL_HEIGHT + margin - sy) / dy;
    if (tBottom > 0) candidates.push({ t: tBottom, x: sx + dx * tBottom, y: VIRTUAL_HEIGHT + margin });
  }

  if (!candidates.length) return { x: tx, y: ty };
  candidates.sort((a, b) => a.t - b.t);
  return { x: candidates[0].x, y: candidates[0].y };
}
