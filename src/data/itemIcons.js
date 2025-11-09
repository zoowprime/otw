// src/data/itemIcons.js
const path = require("path");
const ICONS_DIR = path.join(process.cwd(), "src", "assets", "icones");
const INV_DIR   = path.join(process.cwd(), "src", "assets", "inventory");

function slug(s){
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_|_$/g,"");
}

function getIconAbs(nameOrId){
  const id = slug(nameOrId);
  return path.join(ICONS_DIR, `${id}.png`);
}

function getSacocheAbs(){
  return path.join(INV_DIR, "Sacoche.png");
}

module.exports = { slug, getIconAbs, getSacocheAbs };
