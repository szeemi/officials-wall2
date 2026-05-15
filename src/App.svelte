<script>
  import { gsap } from 'gsap';
  import { onMount } from 'svelte';
  import WallSVG from './components/WallSVG.svelte';
  import Timeline from './components/Timeline.svelte';
  import { YEARS, buildRoster } from './lib/data.js';

  const ROSTER = buildRoster();

  let wallSVG;
  let countHeaderEl;
  let currentIdx = $state(0);
  let displayCount = $state(33);
  let playing = $state(false);
  let showReplay = $state(false);
  let isTouch = $state(false);
  let timelineInstant = $state(false);

  /** @type {HTMLElement | null} */
  let timelineEl = null;

  onMount(() => {
    isTouch = 'ontouchstart' in window;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !playing && !showReplay && currentIdx === 0) {
          observer.disconnect();
          togglePlay();
        }
      },
      { threshold: 0.5 }
    );
    if (timelineEl) observer.observe(timelineEl);
    return () => observer.disconnect();
  });
  /** @type {ReturnType<typeof setTimeout> | null} */
  let playTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let transitionTimer = null;

  function animateCount(from, to) {
    const obj = { n: from };
    gsap.to(obj, {
      n: to, duration: 0.4, ease: 'power1.out',
      onUpdate() { displayCount = Math.round(obj.n); }
    });
  }

  function handleCountChange(n) {
    animateCount(displayCount, n);
  }

  const INITIAL_TOP_CY = 44.5; // cy of first brick row

  function handleEnter() {
    if (!countHeaderEl) return;
    gsap.killTweensOf(countHeaderEl);
    gsap.fromTo(countHeaderEl,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }
    );
  }

  function handleTopChange(newTopCy, scale) {
    if (!countHeaderEl) return;
    const targetY = (newTopCy - INITIAL_TOP_CY) * scale;
    gsap.to(countHeaderEl, { y: targetY, duration: 0.35, ease: 'power2.out' });
  }

  function stopPlay(syncWall = true) {
    playing = false;
    if (playTimer !== null) { clearTimeout(playTimer); playTimer = null; }
    if (transitionTimer !== null) { clearTimeout(transitionTimer); transitionTimer = null; }
    if (syncWall) {
      // Kill any running GSAP brick animations and snap wall to current state
      wallSVG?.killAnimations();
      wallSVG?.jumpTo(YEARS[currentIdx], ROSTER);
    }
  }

  function goPrev() {
    stopPlay();
    showReplay = false;
    wallSVG?.killAnimations();
    if (currentIdx > 0) {
      currentIdx--;
      wallSVG?.jumpTo(YEARS[currentIdx], ROSTER);
    } else {
      currentIdx = 0;
      wallSVG?.init();
    }
  }

  function goNext() {
    if (wallSVG?.isAnimating()) return;
    showReplay = false;
    if (currentIdx < YEARS.length - 1) {
      const prevYear = YEARS[currentIdx];
      currentIdx++;
      wallSVG?.transitionTo(YEARS[currentIdx], prevYear, ROSTER, null);
    } else if (playing) {
      stopPlay();
    }
  }

  function handlePlayKey(e) {
    if (e.key === 'Enter' || e.key === ' ') togglePlay();
  }

  function handleTouch() {
    if (playing) { stopPlay(); }
  }

  function replay() {
    showReplay = false;
    timelineInstant = true;
    currentIdx = 0;
    requestAnimationFrame(() => { timelineInstant = false; });
    wallSVG?.init();
    togglePlay();
  }

  function togglePlay() {
    if (playing) { stopPlay(); return; }
    showReplay = false;
    playing = true;
    if (currentIdx >= YEARS.length - 1) {
      currentIdx = 0;
      wallSVG?.init();
    }
    function step() {
      if (!playing) return;
      if (currentIdx < YEARS.length - 1) {
        const prevYear = YEARS[currentIdx];
        currentIdx++;
        const arrivedIdx = currentIdx;
        // Fire wall transition when dot physically arrives (1300ms)
        transitionTimer = setTimeout(() => {
          transitionTimer = null;
          if (playing) wallSVG?.transitionTo(YEARS[arrivedIdx], prevYear, ROSTER, null);
        }, 1300);
        playTimer = setTimeout(step, 1400);
      } else {
        stopPlay(false); // natural end — wall already in final state, don't overwrite
        showReplay = true;
      }
    }
    playTimer = setTimeout(step, 700);
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500;700&family=Fira+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window onkeydown={(e) => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlay(); } }} />

<div id="spacer"></div>

<div id="wrap" ontouchstart={handleTouch}>
  <div id="main-col">
    <div id="count-header" bind:this={countHeaderEl}>
      <div id="count-num">{displayCount}</div>
      <div id="count-label">senior officials still in office</div>
    </div>

    <WallSVG bind:this={wallSVG} onCountChange={handleCountChange} onEnter={handleEnter} onTopChange={handleTopChange}>
      {#if !showReplay && !(playing && isTouch)}
        <g id="play-btn-g" class:playing style="cursor:pointer" onclick={togglePlay} onkeydown={handlePlayKey} tabindex="0" role="button" aria-label="Play/pause">
          <rect x="229.9" y="211.75" width="80" height="80" rx="12" fill="#000000" fill-opacity="0.35"/>
          <text x="269.9" y="251.75" text-anchor="middle" dominant-baseline="middle" font-size="34" fill="#ffffff">
            {playing ? '⏸' : '▶'}
          </text>
        </g>
      {/if}
      {#if showReplay}
        <g id="replay-btn-g" style="cursor:pointer" onclick={replay} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') replay(); }} tabindex="0" role="button" aria-label="Replay">
          <rect x="229.9" y="211.75" width="80" height="80" rx="12" fill="#000000" fill-opacity="0.35"/>
          <text x="269.9" y="255" text-anchor="middle" dominant-baseline="middle" font-size="28" fill="#ffffff">↺</text>
        </g>
      {/if}
    </WallSVG>

    <Timeline bind:el={timelineEl} years={YEARS} currentIdx={currentIdx} playing={playing} instant={timelineInstant} onJump={(i) => {
      stopPlay();
      showReplay = false;
      wallSVG?.killAnimations();
      currentIdx = i;
      wallSVG?.jumpTo(YEARS[i], ROSTER);
    }} />
  </div>
</div>

<style>
  #spacer { width: 100%; height: 200px; }

  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(:root) {
    --bg: #ffffff; --t1: #000000; --t2: #000000;
    --border: rgba(0,0,0,0.12); --surface: #f5f3ed;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg: #1a1a18; --t1: #ffffff; --t2: #ffffff;
      --border: rgba(255,255,255,0.11); --surface: #252523;
    }
  }
  :global(html) { width: 100%; }
  :global(body) {
    width: 100%;
    padding: 20px 12px 30px;
    min-height: 100vh;
    background: var(--bg);
    color: var(--t1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  :global(#app) {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #wrap {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  #main-col { width: 100%; display: flex; flex-direction: column; }

  :global(#main-svg) { display: block; width: 100%; position: relative; z-index: 1; }

  #wall-wrap {
    position: relative;
    width: 100%;
  }

  #count-header {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding-bottom: 4px;
  }
  #count-num {
    font-family: 'DM Mono', monospace;
    font-size: 80px;
    font-weight: 500;
    letter-spacing: -3px;
    line-height: 1;
    color: var(--t1);
  }

  #count-label {
    font-size: 18px;
    color: var(--t2);
    font-weight: 400;
    font-family: 'Fira Sans', sans-serif;
    text-align: center;
    width: 100%;
    padding: 0 8px 4px;
  }

  #year-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    margin-top: 10px;
  }
  #year-display {
    font-family: 'DM Mono', monospace;
    font-size: 80px;
    font-weight: 500;
    line-height: 1;
    color: var(--t1);
    letter-spacing: -3px;
    text-align: center;
  }
  #btn-prev, #btn-next {
    height: auto;
    padding: 0 16px;
    flex-shrink: 0;
    background: none;
    border: none;
    color: #aaaaaa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #btn-prev svg, #btn-next svg {
    width: 60px;
    height: 80px;
    display: block;
  }

  :global(#play-btn-g) { opacity: 1; transition: opacity 0.3s ease; }
  :global(#play-btn-g.playing) { opacity: 0.1; }
  :global(#play-btn-g.playing:hover) { opacity: 1; }
  :global(#replay-btn-g) { opacity: 1; }

  @media (max-width: 600px) {
    :global(#play-btn-g.playing) { opacity: 0; pointer-events: none; }
  }

  @media (max-width: 600px) {
    :global(body) { padding: 12px 8px 20px; }
    #count-num    { font-size: 56px; }
    #count-label  { font-size: 14px; }
    #year-display { font-size: 56px; }
    #btn-prev svg, #btn-next svg { width: 44px; height: 56px; }
  }
</style>
