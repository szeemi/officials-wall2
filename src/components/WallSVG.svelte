<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { SVG_BRICKS, CAT_STYLE, SLOT_ORDER, BRICK_BOUNDS, buildRoster } from '../lib/data.js';
  import { buildBgPolygon } from '../lib/background.js';

  /** @type {{ onCountChange: (n: number) => void, onEnter?: () => void, onTopChange?: (cy: number, scale: number) => void, children?: import('svelte').Snippet }} */
  let { onCountChange, onEnter, onTopChange, children } = $props();

  const ROSTER = buildRoster();
  const NS = 'http://www.w3.org/2000/svg';

  let wallG, fallG, bgPath, svgDefs, svgEl;
  let brickEls = new Map();
  let animating = false;
  let activeTl = null;

  // ── Defs ────────────────────────────────────────────────────────────────────
  function buildDefs() {
    let html = `<filter id="bshadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
      <feOffset dx="1" dy="2" result="s"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
    for (const [cat, s] of Object.entries(CAT_STYLE)) {
      html += `<linearGradient id="g-${cat}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${s.g1}"/>
        <stop offset="100%" stop-color="${s.g2}"/>
      </linearGradient>`;
    }
    svgDefs.innerHTML = html;
  }

  // ── Brick node ───────────────────────────────────────────────────────────────
  function makeBrickNode(slotIdx, cat) {
    const bk = SVG_BRICKS[slotIdx];
    const s  = CAT_STYLE[cat];
    const g  = document.createElementNS(NS, 'g');
    g.setAttribute('filter', 'url(#bshadow)');
    g._slotIdx = slotIdx; g._cx = bk.cx; g._cy = bk.cy;

    const pBody = document.createElementNS(NS, 'path');
    pBody.setAttribute('d', bk.body);
    pBody.setAttribute('fill', `url(#g-${cat})`);
    pBody.setAttribute('opacity', String(s.bodyOp));

    const pDark = document.createElementNS(NS, 'path');
    pDark.setAttribute('d', bk.dark);
    pDark.setAttribute('fill', s.darkCol);
    pDark.setAttribute('opacity', '1.0');

    const pLite = document.createElementNS(NS, 'path');
    pLite.setAttribute('d', bk.lite);
    pLite.setAttribute('fill', s.liteCol);
    pLite.setAttribute('opacity', '1.0');

    g.appendChild(pBody); g.appendChild(pDark); g.appendChild(pLite);
    return g;
  }

  function recolourGone(g) {
    const ps = g.querySelectorAll('path');
    const s = CAT_STYLE.gone;
    if (ps[0]) { ps[0].setAttribute('fill', 'url(#g-gone)'); ps[0].setAttribute('opacity', '0.70'); }
    if (ps[1]) { ps[1].setAttribute('fill', s.darkCol); ps[1].setAttribute('opacity', '0.5'); }
    if (ps[2]) { ps[2].setAttribute('fill', s.liteCol); ps[2].setAttribute('opacity', '0.5'); }
  }

  // ── Background ───────────────────────────────────────────────────────────────
  function updateBackground() {
    if (!bgPath) return;
    const presentSlots = new Set();
    brickEls.forEach((_, id) => {
      if (SLOT_ORDER[id] !== undefined) presentSlots.add(SLOT_ORDER[id]);
    });
    bgPath.setAttribute('d', presentSlots.size === 0 ? '' : buildBgPolygon(presentSlots));
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  export function init() {
    if (activeTl) { activeTl.kill(); activeTl = null; }
    gsap.killTweensOf('*');
    animating = false;
    fallG.innerHTML = '';
    wallG.innerHTML = '';
    brickEls.clear();

    // Group bricks by row (cy value)
    const byRow = new Map();
    ROSTER.forEach((o, i) => {
      const g = makeBrickNode(SLOT_ORDER[i], o.cat);
      wallG.appendChild(g);
      brickEls.set(i, g);
      const cy = g._cy;
      if (!byRow.has(cy)) byRow.set(cy, []);
      byRow.get(cy).push(g);
    });

    bgPath.setAttribute('d', 'M12.7,7.8 L526.9,7.8 L526.9,495.5 Q526.9,503.5 518.9,503.5 L20.7,503.5 Q12.7,503.5 12.7,495.5 Z');
    bgPath.setAttribute('opacity', '1');
    onCountChange(33);

    // Animate bricks in from above, row by row
    const rows = [...byRow.keys()].sort((a, b) => a - b);
    activeTl = gsap.timeline();
    activeTl.add(() => onEnter?.(), 0);
    rows.forEach((cy, rowIdx) => {
      const bricks = byRow.get(cy);
      const delay = rowIdx * 0.07;
      bricks.forEach(g => {
        gsap.set(g, { y: -cy - 20 });
        activeTl.to(g, { y: 0, duration: 0.35, ease: 'power2.out' }, delay);
      });
    });
    activeTl.play();
  }

  export function jumpTo(year, roster) {
    if (activeTl) { activeTl.kill(); activeTl = null; }
    gsap.killTweensOf('*');
    animating = false;
    fallG.innerHTML = '';
    wallG.innerHTML = '';
    brickEls.clear();
    const presentIds = new Set(roster.map((o, i) => o.leaveAfter >= year ? i : -1).filter(x => x >= 0));
    roster.forEach((o, i) => {
      if (!presentIds.has(i)) return;
      const g = makeBrickNode(SLOT_ORDER[i], o.cat);
      wallG.appendChild(g);
      brickEls.set(i, g);
    });
    updateBackground();
    onCountChange(presentIds.size);
  }

  export function transitionTo(year, prevYear, roster, onDone) {
    if (animating) return;
    animating = true;

    const presentNow  = new Set(roster.map((o, i) => o.leaveAfter >= year ? i : -1).filter(x => x >= 0));
    const presentPrev = new Set(roster.map((o, i) => o.leaveAfter >= prevYear ? i : -1).filter(x => x >= 0));
    const leavers = [...presentPrev].filter(id => !presentNow.has(id));

    onCountChange(presentNow.size);

    activeTl = gsap.timeline({ onComplete: () => { animating = false; activeTl = null; onDone?.(); } });
    const tl = activeTl;

    leavers.sort((a, b) => {
      const ga = brickEls.get(a), gb = brickEls.get(b);
      const cya = ga?._cy || 0, cyb = gb?._cy || 0;
      return cya !== cyb ? cya - cyb : (ga?._cx || 0) - (gb?._cx || 0);
    });

    // Phase 1: grey out
    leavers.forEach(id => {
      const g = brickEls.get(id);
      if (g) tl.add(() => recolourGone(g), 0);
    });

    // Phase 2: update background
    tl.add(() => {
      const saved = new Map();
      leavers.forEach(id => {
        if (brickEls.has(id)) { saved.set(id, brickEls.get(id)); brickEls.delete(id); }
      });
      updateBackground();
      saved.forEach((g, id) => brickEls.set(id, g));
    }, 0);

    // Phase 3: bricks fall + row-tracking for header
    const leaverCys = new Set(leavers.map(id => brickEls.get(id)?._cy).filter(Boolean));
    // rows fully cleared: no remaining brick shares that cy
    const remainingCySet = new Set([...presentNow].map(id => brickEls.get(id)?._cy).filter(Boolean));
    const clearedRows = [...leaverCys].filter(cy => !remainingCySet.has(cy)).sort((a, b) => a - b);
    // index of last leaver per row
    const lastIdxByRow = new Map();
    leavers.forEach((id, i) => {
      const cy = brickEls.get(id)?._cy;
      if (cy !== undefined) lastIdxByRow.set(cy, i);
    });
    // remaining cy values to determine new topmost after each cleared row
    const remainingCys = [...remainingCySet].sort((a, b) => a - b);
    let clearedSoFar = new Set();

    clearedRows.forEach(rowCy => {
      const lastIdx = lastIdxByRow.get(rowCy);
      if (lastIdx === undefined) return;
      const finishTime = 0.1 + lastIdx * 0.09 + 0.50;
      tl.add(() => {
        clearedSoFar.add(rowCy);
        const newTop = remainingCys.find(cy => !clearedSoFar.has(cy)) ?? (remainingCys.length ? remainingCys[remainingCys.length - 1] : 560);
        if (onTopChange) {
          const scale = svgEl ? svgEl.getBoundingClientRect().height / 503.5 : 1;
          onTopChange(newTop, scale);
        }
      }, finishTime);
    });

    leavers.forEach((id, i) => {
      const g = brickEls.get(id);
      if (!g) return;
      const startCy = g._cy;
      const delay = 0.1 + i * 0.09;

      tl.add(() => { fallG.appendChild(g); }, delay - 0.01);
      tl.to(g, {
        y: 560 - startCy, ease: 'power2.in', duration: 0.50,
        onComplete: () => { g.remove(); brickEls.delete(id); }
      }, delay);
      tl.to(g, { opacity: 0, duration: 0.22, ease: 'none' }, delay + 0.28);
    });

    tl.play();
  }

  export function killAnimations() {
    if (activeTl) { activeTl.kill(); activeTl = null; }
    gsap.killTweensOf('*');
    animating = false;
  }

  export function isAnimating() { return animating; }

  onMount(() => {
    buildDefs();
    init();
  });
</script>

<svg id="main-svg" bind:this={svgEl} viewBox="0 0 547.8 503.5"
  style="display:block;width:100%;height:auto;overflow:visible;">
  <defs bind:this={svgDefs}></defs>
  <path bind:this={bgPath} id="wall-bg" fill="#aaaaaa" opacity="1"
    d="M12.7,7.8 L526.9,7.8 L526.9,495.5 Q526.9,503.5 518.9,503.5 L20.7,503.5 Q12.7,503.5 12.7,495.5 Z"/>
  <g bind:this={wallG}></g>
  <g bind:this={fallG}></g>
  {@render children?.()}
</svg>
