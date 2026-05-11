import { BRICK_BOUNDS } from './data.js';

const L = 12.7, R = 526.9, BOT = 503.5, R8 = 8, PAD = 5;

function rect(x1, y1, x2, y2) {
  return `M${x1},${y1} L${x2},${y1}` +
    ` L${x2},${y2-R8} Q${x2},${y2} ${x2-R8},${y2}` +
    ` L${x1+R8},${y2} Q${x1},${y2} ${x1},${y2-R8} Z`;
}

export function buildBgPolygon(presentSlots) {
  const rowMap = new Map();
  for (const si of presentSlots) {
    const b = BRICK_BOUNDS[si];
    if (!b) continue;
    if (!rowMap.has(b.cy)) rowMap.set(b.cy, {t: b.t, minL: b.l, maxR: b.r});
    else {
      const row = rowMap.get(b.cy);
      if (b.l < row.minL) row.minL = b.l;
      if (b.r > row.maxR) row.maxR = b.r;
    }
  }
  if (rowMap.size === 0) return '';

  const cys = [...rowMap.keys()].sort((a,b)=>a-b);
  const topRow    = rowMap.get(cys[0]);
  const secondRow = cys.length > 1 ? rowMap.get(cys[1]) : null;

  const topT  = topRow.t;
  const topL  = Math.max(L, topRow.minL - PAD);
  const topRi = Math.min(R, topRow.maxR + PAD);
  const topIsFullWidth = (topL <= L + 1) && (topRi >= R - 1);

  if (topIsFullWidth) return rect(L, topT, R, BOT);

  if (secondRow) {
    const secondT = secondRow.t;
    if (topL > L + 1) {
      return `M${L},${secondT} L${topL},${secondT} L${topL},${topT} L${R},${topT}` +
             ` L${R},${BOT-R8} Q${R},${BOT} ${R-R8},${BOT}` +
             ` L${L+R8},${BOT} Q${L},${BOT} ${L},${BOT-R8} Z`;
    } else {
      return `M${L},${topT} L${topRi},${topT} L${topRi},${secondT} L${R},${secondT}` +
             ` L${R},${BOT-R8} Q${R},${BOT} ${R-R8},${BOT}` +
             ` L${L+R8},${BOT} Q${L},${BOT} ${L},${BOT-R8} Z`;
    }
  }

  return rect(topL, topT, topRi < R - 1 ? topRi : R, BOT);
}
