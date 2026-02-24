import { splitStripImages } from "./file-utils.js";
import { loadTileset } from "./file-utils.js";
import { loadPlayerSprites } from "./file-utils.js";
import { enemies } from "./platformer.js";
import { inEditor, input, mode, key } from "./site.js";
import { state } from "./state.js";
import { addTileSelection } from "./ui.js";
const { player, editor } = state

export function drawMinimap() {
  const canvas = document.querySelector(".minimap-canvas")
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const tiles = editor.map.tiles
  ctx.imageSmoothingEnabled = false
  const w = editor.width
  const h = editor.height
  const tileSize = 3
  canvas.width = w * tileSize
  canvas.height = h * tileSize

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const raw = tiles[y * w + x]
      const tileId = raw >> 4
      const tileDef = editor.tileset[tileId]
      ctx.fillStyle = tileDef.minimapColor || 'transparent'
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,1)'
  const gameCanvas = document.querySelector(".canvas")
  const startX = Math.floor(editor.cam.x / editor.tileSize * tileSize)
  const startY = Math.floor(editor.cam.y / editor.tileSize * tileSize)
  const width = Math.floor(gameCanvas.width / editor.tileSize * tileSize)
  const height = Math.floor(gameCanvas.height / editor.tileSize * tileSize)
  ctx.strokeRect(startX, startY, width, height)
}

export function drawMap(tileSize = editor.tileSize, cam = editor.cam) {

  const startX = Math.floor(cam.x / tileSize);
  const endX = startX + (canvas.width / tileSize) + 1;
  const startY = Math.floor(cam.y / tileSize);
  const endY = startY + (canvas.height / tileSize) + 1;
  const tiles = mode == "play" ? player.tiles : editor.map.tiles
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (x < 0 || x >= editor.map.w || y < 0 || y >= editor.map.h) continue;
      const raw = tiles[y * editor.map.w + x];
      const tileId = raw >> 4;
      const scrX = Math.floor((x * tileSize) - cam.x);
      const scrY = Math.floor((y * tileSize) - cam.y);
      const selectedTile = editor.tileset[tileId];
      let showTile = true;
      if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("hidden") && mode == 'play') {
        showTile = false;
      }
      if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("swapTrigger1") && player.toggledTile && mode == 'play') {
        showTile = false
      }
      if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("swapTrigger2") && !player.toggledTile && mode == 'play') {
        showTile = false
      }
      if (player.collectedCoinList.includes(y * editor.map.w + x) && mode === 'play') {
        showTile = false;
      }
      if (selectedTile && selectedTile.type == 'enemy' && mode == 'play') {
        showTile = false;
      }
      if (selectedTile && selectedTile.type == 'adjacency' && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize);
      } else if (selectedTile && selectedTile.type == "rotation" && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize);
      } else if (selectedTile && selectedTile.type == 'standalone' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize);
      } else if (selectedTile && selectedTile.type == 'enemy' && showTile) {
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


export function drawPlayer(dt) {
  player.AnimationFrameCounter += dt
  if (player.AnimationFrameCounter > 5) {
    player.AnimationFrame = player.AnimationFrame == 0 ? 1 : 0
    player.AnimationFrameCounter = 0
  }
  if (!player.sprites) return
  let selectedFrame = 0
  if (key("left") && key("right")) {
    // pressing both keys, don't rapidly switch between frames
  } else if (!player.facingLeft && key("left")) {
    player.facingLeft = 1
  } else if (player.facingLeft && key("right")) {
    player.facingLeft = 0
  }
  if (player.grounded) {
    // has to be one of the first 6
    if (key("left") && key("right")) {
      // pressing both keys, don't rapidly switch between frames
    } else if (key("left") || key("right")) {
      // we're moving, calculate the animation frame of the movement
      selectedFrame = (player.AnimationFrame << 1) + player.facingLeft + 2
    } else {
      // on the ground and not moving
      selectedFrame = player.facingLeft
    }
  } else {
    if (player.vy < 0) {
      // jumping
      selectedFrame = 6 + player.facingLeft
    } else {
      selectedFrame = 8 + player.facingLeft
    }
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(player.sprites[selectedFrame], Math.floor(player.x - player.cam.x), Math.floor(player.y - player.cam.y), player.w, player.h)
}
export async function updateTileset(path) {
  editor.tilesetPath = path
  const { tileset, characterImage } = await loadTileset(editor.tilesetPath)
  editor.tileset = splitStripImages(tileset)
  loadPlayerSprites(characterImage)
  if (inEditor) {
    addTileSelection()
  }
}
export function getCameraCoords() {
  let x, y
  if (player.x > player.cam.x + (canvas.width * 0.75)) {
    // moving right
    x = player.x - (canvas.width * 0.75)
  } else if (player.x < player.cam.x + (canvas.width * 0.25)) {
    // moving left
    x = player.x - (canvas.width * 0.25)
  } else {
    x = player.cam.x
  }
  if (player.y > player.cam.y + (canvas.height * 0.5)) {
    // moving down
    y = player.y - (canvas.height * 0.5)
  } else if (player.y < player.cam.y + (canvas.height * 0.25)) {
    // moving up
    y = player.y - (canvas.height * 0.25)
  } else {
    y = player.cam.y
  }
  return { x: x, y: y }
}
export function drawEnemies(dt) {
  enemies.forEach(enemy => {
    ctx.drawImage(editor.tileset[enemy.tileId].image, enemy.x - player.cam.x, enemy.y - player.cam.y, player.tileSize, player.tileSize)
  })
}

export function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  ctx.imageSmoothingEnabled = false
  canvas.style.imageRendering = 'pixelated'
}

