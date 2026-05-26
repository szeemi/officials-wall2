<script>
  /** @type {{ years: number[], currentIdx: number, playing: boolean, instant: boolean, onJump: (i: number) => void, el?: HTMLElement }} */
  let { years, currentIdx, playing = false, instant = false, onJump, el = $bindable() } = $props();

  let trackEl;

  const FLUID_MS = 1300;

  function pct(i) {
    return (i / (years.length - 1)) * 100;
  }

  function posFromEvent(e) {
    const rect = trackEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round((x / rect.width) * (years.length - 1));
  }

  let dragging = false;

  // Label: stays visible during transit; swaps year + re-animates on arrival
  let shownYear = $state(years[currentIdx]);
  let labelVisible = $state(true);
  let arrivalTimer = null;
  let prevIdx = currentIdx;

  $effect(() => {
    const idx = currentIdx;
    if (idx === prevIdx) return;
    prevIdx = idx;

    if (arrivalTimer) { clearTimeout(arrivalTimer); arrivalTimer = null; }

    if (playing) {
      // Keep old label showing during transit; swap + re-pop on arrival
      arrivalTimer = setTimeout(() => {
        shownYear = years[idx];
        labelVisible = false;
        requestAnimationFrame(() => { labelVisible = true; });
        arrivalTimer = null;
      }, FLUID_MS);
    } else {
      // Immediate update on manual jump
      shownYear = years[idx];
      labelVisible = false;
      requestAnimationFrame(() => { labelVisible = true; });
    }
  });

  function onTrackPointerDown(e) {
    dragging = true;
    onJump(posFromEvent(e));
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    onJump(posFromEvent(e));
  }

  function onPointerUp() { dragging = false; }
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} />

<div class="tl-wrap" bind:this={el}>
  <div class="track" bind:this={trackEl}
    onpointerdown={onTrackPointerDown}
    role="slider" aria-valuenow={currentIdx} aria-valuemin="0" aria-valuemax={years.length - 1}
    tabindex="0">
    <div class="line"></div>
    <div class="line-past" class:instant style="width:{pct(currentIdx)}%"></div>
    {#each years as _, i}
      <div class="dot" class:past={i < currentIdx} class:active={i === currentIdx}
        style="left:{pct(i)}%"></div>
    {/each}
    <div class="thumb" class:fluid={playing} class:instant style="left:{pct(currentIdx)}%"></div>
    <div class="year-label" class:label-in={labelVisible} class:fluid={playing} class:instant
      style="left:{pct(currentIdx)}%">{shownYear}</div>
  </div>
</div>

<style>
  .tl-wrap {
    width: 100%;
    padding: 0 3.815% 0 2.317%;
    box-sizing: border-box;
    position: relative;
    margin: 14px 0 12px;
  }

  .track {
    position: relative;
    width: 100%;
    height: 24px;
    cursor: pointer;
    user-select: none;
    touch-action: none;
    display: flex;
    align-items: center;
  }

  .line {
    position: absolute;
    left: 0; right: 0;
    height: 1.5px;
    background: #cccccc;
    border-radius: 1px;
  }

  .line-past {
    position: absolute;
    left: 0;
    height: 1.5px;
    background: var(--t1);
    border-radius: 1px;
    z-index: 1;
    transition: width 1.3s linear;
    pointer-events: none;
  }
  .line-past.instant { transition: none; }

  .dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cccccc;
    transform: translateX(-50%);
    z-index: 2;
  }
  .dot.past { background: var(--t1); }

  .thumb {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--t1);
    transform: translateX(-50%);
    z-index: 3;
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }
  .thumb.fluid  { transition: left 1.3s linear; }
  .thumb.instant { transition: none; }

  .year-label {
    position: absolute;
    top: 100%;
    margin-top: 4px;
    font-family: 'DM Mono', monospace;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -1px;
    line-height: 1;
    color: var(--t1);
    white-space: nowrap;
    pointer-events: none;
    transform-origin: center bottom;
    opacity: 0;
    transform: translateX(-50%) scale(0.7);
    transition: none;
  }
  .year-label.fluid { transition: left 1.3s linear; }
  .year-label.instant { transition: none; }

  @keyframes label-pop-in {
    0%   { opacity: 0; transform: translateX(-50%) scale(0.7); }
    60%  { opacity: 1; transform: translateX(-50%) scale(1.15); }
    100% { opacity: 1; transform: translateX(-50%) scale(1); }
  }

  .year-label.label-in {
    animation: label-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @media (max-width: 600px) {
    .year-label { font-size: 20px; }
  }
</style>
