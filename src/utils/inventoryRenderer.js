// src/utils/inventoryRenderer.js
const { createCanvas, loadImage } = require("canvas");
const { iconAbs, sacocheAbs } = require("./itemIcons");
const catalog = require("../data/itemCatalog");

// Grille 5x5 sur fond 1024×1024
const OUT = 1024;
const COLS = 5, ROWS = 5;
const MARGIN = Math.round(OUT * 0.06);    // ~61
const USABLE = OUT - MARGIN * 2;          // ~902
const SLOT = Math.floor(USABLE / COLS);   // ~180

// Icônes 96x120 (centrées dans la case)
const ICON_W = 96;
const ICON_H = 120;

function layoutForIndex(i){
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  const x = MARGIN + c*SLOT + Math.floor((SLOT - ICON_W)/2);
  const y = MARGIN + r*SLOT + Math.floor((SLOT - ICON_H)/2);
  return { x, y, r, c };
}

function drawTextBottom(ctx, x, y, text){
  const pad = 6;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "16px serif";
  ctx.fillStyle = "#ddd";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const cx = x + ICON_W/2;
  const cy = y + ICON_H - pad;
  ctx.strokeText(text, cx, cy);
  ctx.fillText(text, cx, cy);
}

function drawTinyTop(ctx, x, y, text, align="left"){
  const pad = 6;
  ctx.textAlign   = align==="left" ? "left" : "right";
  ctx.textBaseline= "top";
  ctx.font = "12px serif";
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const tx = align==="left" ? x+pad : x+ICON_W-pad;
  const ty = y+pad;
  ctx.strokeText(text, tx, ty);
  ctx.fillText(text, tx, ty);
}

async function renderInventoryGrid(items /* [{name, quantity}] */){
  const canvas = createCanvas(OUT, OUT);
  const ctx = canvas.getContext("2d");

  const bg = await loadImage(sacocheAbs());
  ctx.drawImage(bg, 0, 0, OUT, OUT);

  for (let i=0; i<Math.min(items.length, COLS*ROWS); i++){
    const it = items[i];
    const meta = catalog[it.name] || { label: it.name, weight: it.weight || 0, stackable: true };
    const { x, y } = layoutForIndex(i);

    try {
      const img = await loadImage(iconAbs(it.name));
      ctx.drawImage(img, x, y, ICON_W, ICON_H);
    } catch {
      ctx.fillStyle = "#222"; ctx.fillRect(x, y, ICON_W, ICON_H);
    }

    const q = it.quantity ?? 1;
    if ((meta.stackable ?? true) && q > 1) drawTinyTop(ctx, x, y, `x${q}`, "left");
    const w = (meta.weight ?? it.weight ?? 0);
    drawTinyTop(ctx, x, y, `${w}kg`, "right");
    drawTextBottom(ctx, x, y, meta.label || it.name);
  }

  return canvas.toBuffer("image/png");
}

module.exports = { renderInventoryGrid };
