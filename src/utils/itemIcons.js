// src/utils/itemIcons.js
const path = require("path");
const fs = require("fs");

const ICONS_DIR = path.join(process.cwd(), "src", "assets", "icones");
const UI_DIR    = path.join(process.cwd(), "src", "assets", "inventory");

function slug(s){
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}

function iconAbs(nameOrId){ return path.join(ICONS_DIR, `${slug(nameOrId)}.png`); }
function iconExists(nameOrId){ return fs.existsSync(iconAbs(nameOrId)); }
function sacocheAbs(){ return path.join(UI_DIR, "Sacoche.png"); }

module.exports = { slug, iconAbs, iconExists, sacocheAbs };
