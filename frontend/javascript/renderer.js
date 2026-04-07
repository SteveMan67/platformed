import { splitStripImages } from "./file-utils.js";
import { loadTileset } from "./file-utils.js";
import { loadPlayerSprites } from "./file-utils.js";
import { enemies, mechanicsHas } from "./platformer.js";
import { inEditor, input, mode, key } from "./site.js";
import { state } from "./state.js";
import { addTileSelection, needsSmallerLevel } from "./ui.js";
const { player, editor } = state

function getThemeColor(colorName) {
  return getComputedStyle(document.documentElement).getPropertyValue(colorName).trim()
}

export function updateColorTheme() {
  // get all the colors in the theme and set them in the editor object so we don't have to do getThemeColor each frame
  const { colorTheme } = editor
  colorTheme.bgPrimary = getThemeColor('--bg-primary')
  colorTheme.bgAccent = getThemeColor('--bg-accent')
  colorTheme.bgLevel = getThemeColor('--bg-level')
  colorTheme.textOnPrimary = getThemeColor('--text-on-primary')
  colorTheme.textOnAccent = getThemeColor('--text-on-accent')
  colorTheme.action = getThemeColor('--action')
  colorTheme.textOnAction = getThemeColor('--text-on-action')
  colorTheme.border = getThemeColor('--border')
  colorTheme.selection = getThemeColor('--selection')
}

export function changeColorTheme(themeName) {
  const root = document.documentElement;

  root.dataset.theme = themeName

  updateColorTheme()
}

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
      if (tileDef) {
        ctx.fillStyle = tileDef.minimapColor ?? 'transparent'
      } else {
        ctx.fillStyle = 'transparent'
      }

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
      const selectedTile = editor.tileset[tileId]
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
      if (mechanicsHas(tileId, "dissipate") && mode === 'play') {
        const dissipation = player.dissipations.find(f => f.tileIdx === (y * editor.map.w) + x)

        if (
          dissipation &&
          dissipation.timer <= dissipation.timeToDissipate
          && dissipation.timer > 0
        ) {
          showTile = false
        }
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

  if (editor.selection.hasFloatingTiles && mode !== "play") {
    for (let y = 0; y < editor.map.h; y++) {
      for (let x = 0; x < editor.map.w; x++) {
        const raw = editor.selectionLayer[y * editor.map.w + x]
        if (raw === 0) continue

        const tileId = raw >> 4
        const renderX = x + editor.selection.offsetX
        const renderY = y + editor.selection.offsetY

        const scrX = Math.floor((renderX * tileSize) - cam.x)
        const scrY = Math.floor((renderY * tileSize) - cam.y)
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

  if (player.triggers && editor.showTriggerHighlights && mode !== "play") {
    for (let trigger of player.triggers) {
      if (trigger.execute.length !== 0) {
        let needsTriggerHighlight = false
        for (const step of trigger.execute) {
          if (step.type === "teleport") {
            const scrX = Math.floor((step.x * tileSize) - cam.x)
            const scrY = Math.floor((step.y * tileSize) - cam.y)
            if (trigger.color) {
              ctx.strokeStyle = trigger.color
            } else {
              const hue = Math.floor(Math.random() * 360)
              trigger.color = `hsl(${hue}, 100%, 50%)`
              ctx.strokeStyle = trigger.color
            }
            needsTriggerHighlight = true
            ctx.lineWidth = 2
            ctx.strokeRect(scrX, scrY, tileSize, tileSize)
          }
        }
        if (needsTriggerHighlight) {
          const scrX = Math.floor((trigger.x * tileSize) - cam.x)
          const scrY = Math.floor((trigger.y * tileSize) - cam.y)
          ctx.strokeRect(scrX, scrY, tileSize, tileSize)
        }
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

function sameItems(arr1, arr2) {
  if (!arr1 || !arr2) return false
  const set1 = new Set(arr1)
  const set2 = new Set(arr2)
  return arr1.length === arr2.length && [...set1].every(item => set2.has(item))
}

function indexOk(index, sortedTiles) {
  return index !== -1 && !sortedTiles.includes(index)
}

export async function updateTileset(path) {
  editor.tilesetPath = path
  const { tileset, characterImage } = await loadTileset(editor.tilesetPath)

  const oldTileset = editor.tileset
  let sortedTiles = []

  if (oldTileset && oldTileset.length) {
    const newTileset = splitStripImages(tileset)

    // make an array showing where each tile should go
    for (let i = 0; i < oldTileset.length; i++) {
      const oldTile = oldTileset[i]

      // default to the empty tile
      const emptyTile = newTileset.findIndex(f => f.type === "empty")
      let newTileIndex
      if (emptyTile !== -1) {
        newTileIndex = emptyTile
      } else {
        newTileIndex = 0
      }


      const indexOfSameName = newTileset.findIndex(f => f?.name && f?.name === oldTile?.name)
      const indexOfSameMechanics = newTileset.findIndex(f => sameItems(f?.mechanics, oldTile?.mechanics))
      const indexOfSameTypeAndCategory = newTileset.findIndex(f => f?.type && f?.type === oldTile?.type && f?.category === oldTile?.category)
      const sameIndex = newTileset.findIndex(f => f?.id && f?.id === oldTile?.id)


      // find tiles with the same name, then mechanics, then type and category, then index
      if (indexOk(indexOfSameName, sortedTiles)) {
        newTileIndex = indexOfSameName
      } else if (indexOk(indexOfSameMechanics, sortedTiles)) {
        newTileIndex = indexOfSameMechanics
      } else if (indexOk(indexOfSameTypeAndCategory, sortedTiles)) {
        newTileIndex = indexOfSameTypeAndCategory
      } else if (indexOk(sameIndex, sortedTiles)) {
        newTileIndex = sameIndex
      }

      sortedTiles[i] = newTileIndex
    }

    // sort all the tiles in the level according to the list

    const tiles = inEditor ? editor.map.tiles : player.tiles
    if (tiles) {
      for (let i = 0; i < tiles.length; i++) {
        const entry = tiles[i]
        const blockInfo = entry & 15
        const mappedIndex = sortedTiles[entry >> 4]
        tiles[i] = ((mappedIndex !== undefined ? mappedIndex : 0) << 4) + blockInfo
      }
    }

  } else {
  }

  editor.tileset = splitStripImages(tileset)
  loadPlayerSprites(characterImage)
  if (inEditor) {
    addTileSelection()
  }
}

export function getCameraCoords() {
  let x, y
  const cameraBoxLR = needsSmallerLevel() ? 0.15 : 0.25
  if (player.x > player.cam.x + (canvas.width * (0.5 + cameraBoxLR))) {
    // moving right
    x = player.x - (canvas.width * (0.5 + cameraBoxLR))
  } else if (player.x < player.cam.x + (canvas.width * (0.5 - cameraBoxLR))) {
    // moving left
    x = player.x - (canvas.width * (0.5 - cameraBoxLR))
  } else {
    x = player.cam.x
  }
  if (player.y > player.cam.y + (canvas.height * 0.5)) {
    // moving down
    y = player.y - (canvas.height * 0.5)
  } else if (player.y < player.cam.y + (canvas.height * cameraBoxLR)) {
    // moving up
    y = player.y - (canvas.height * cameraBoxLR)
  } else {
    y = player.cam.y
  }
  return { x: x, y: y }
}

export function drawMovingTiles() {
  player.movingBlocks.forEach(block => {
    ctx.drawImage(block.image, Math.round(block.x - player.cam.x), Math.round(block.y - player.cam.y), player.tileSize, player.tileSize)
  })
}

export function drawEnemies() {
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

