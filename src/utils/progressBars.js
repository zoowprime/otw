// src/utils/progressBars.js
function clamp01(n){ return Math.max(0, Math.min(100, Math.round(n))); }
function bar(pct, width=20){
  const p = clamp01(pct);
  const filled = Math.round((p/100)*width);
  const empty  = width - filled;
  return `【${"█".repeat(filled)}${"░".repeat(empty)}】 ${p}%`;
}
module.exports = { bar };
