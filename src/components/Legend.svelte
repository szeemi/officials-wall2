<script>
  import { LEGEND } from '../lib/data.js';
</script>

<div class="legend-row">
  {#each LEGEND as item}
    <div class="leg-item">
      <div class="leg-dot" style="background:{item.color}"></div>
      <span>{item.label}</span>
    </div>
  {/each}
</div>

<style>
  .legend-row {
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
    padding: 8px 2.317% 0 2.317%;
    box-sizing: border-box;
  }
  .leg-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 16px;
    font-weight: 400;
    font-family: 'Fira Sans', sans-serif;
    color: var(--t2);
    white-space: nowrap;
  }
  .leg-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  @media (max-width: 600px) {
    .leg-item { font-size: 12px; }
  }
</style>
