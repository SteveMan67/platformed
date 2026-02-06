import { mode, state } from "./site.js";
const { player, editor } = state

export function drawMap(tileSize = editor.tileSize, cam = editor.cam) {

  const startX = Math.floor(cam.x / tileSize);
  const endX = startX + (canvas.width / tileSize) + 1;
  const startY = Math.floor(cam.y / tileSize);
  const endY = startY + (canvas.width / tileSize) + 1;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (x < 0 || x >= editor.map.w || y < 0 || y >= editor.map.h) continue;
      const raw = editor.map.tiles[y * editor.map.w + x];
      const tileId = raw >> 4;
      const scrX = Math.floor((x * tileSize) - cam.x);
      const scrY = Math.floor((y * tileSize) - cam.y);
      const selectedTile = editor.tileset[tileId];
      let showTile = true;
      if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("hidden") && mode == 'play') {
        showTile = false;
      }
      if (player.collectedCoinList.includes(y * editor.map.w + x) && mode === 'play') {
        showTile = false;
      }
      if (selectedTile.type == 'enemy' && mode == 'play') {
        showTile = false;
      }
      if (selectedTile.type == 'adjacency' && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize);
      } else if (selectedTile.type == "rotation" && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize);
      } else if (selectedTile.type == 'standalone' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize);
      } else if (selectedTile.type == 'enemy' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize);
      }
    }
  }
}

export const canvas = document.querySelector("canvas");
const dpr = window.devicePixelRatio
export const ctx = canvas.getContext('2d')
const rect = canvas.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.imageSmoothingEnabled = false
canvas.style.imageRendering = 'pixelated'

