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
