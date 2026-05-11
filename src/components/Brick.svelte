<script>
  /** @type {{ bk: import('../lib/data.js').SVG_BRICKS[number], cat: string, gone?: boolean }} */
  let { bk, cat, gone = false } = $props();

  const bodyFill  = $derived(gone ? 'url(#g-gone)' : `url(#g-${cat})`);
  const bodyOp    = $derived(gone ? 0.70 : bk.bodyOp);
  const darkFill  = $derived(gone ? '#786858' : bk.darkCol);
  const darkOp    = $derived(gone ? 0.5 : 1.0);
  const liteFill  = $derived(gone ? '#E0D8C8' : bk.liteCol);
  const liteOp    = $derived(gone ? 0.5 : 1.0);
</script>

<path d={bk.body} fill={bodyFill} opacity={bodyOp} />
<path d={bk.dark} fill={darkFill} opacity={darkOp} />
<path d={bk.lite} fill={liteFill} opacity={liteOp} />
