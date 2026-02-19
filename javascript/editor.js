import { calcAdjacentAdjacency, calculateAdjacency, enemies } from "./platformer.js"
import { canvas, ctx, drawMap } from "./renderer.js"
import { input, key } from "./site.js"
import { state } from "./state.js"
const { editor } = state

export function zoomMap(zoomDirectionIsIn) {
  const currentZoom = editor.tileSize
  let newZoom = editor.tileSize
  const zooms = [16, 25, 32, 40, 60, 80, 100]
  const currentZoomIndex = zooms.indexOf(currentZoom)
  if (zoomDirectionIsIn) {
    if (currentZoomIndex !== 0) {
      newZoom = zooms[currentZoomIndex - 1]
    } else {
      newZoom = currentZoom
    }
  } else {
    if (currentZoomIndex < zooms.length - 1) {
      newZoom = zooms[currentZoomIndex + 1]
    } else {
      newZoom = currentZoom
    }
  }
  editor.tileSize = newZoom
}

export function toggleErase() {
  if (editor.selectedTile == 0) {
    editor.selectedTile = editor.lastSelectedTiles[1]
  } else {
    editor.selectedTile = 0
  }
}

export function changeSelectedTile(tileId) {
  if (editor.selectedTile !== editor.lastSelectedTiles[1] && editor.selectedTile != 0) {
    editor.lastSelectedTiles[1] = editor.selectedTile
  }
  if (tileId == "last") {
    editor.selectedTile = editor.lastSelectedTiles[0]
    editor.lastSelectedTiles.unshift(editor.lastSelectedTiles[1])
    editor.lastSelectedTiles.pop()
  } else {
    editor.lastSelectedTiles.shift()
    editor.lastSelectedTiles.push(tileId)
    editor.selectedTile = tileId
  }
}

export function scrollCategoryTiles(up) {
  let currentSelectedTiles = document.querySelectorAll(".tile-select-container")
  currentSelectedTiles = Array.from(currentSelectedTiles).filter(f => f.style.display !== "none")
  if (currentSelectedTiles.length !== 0) {
    // sorry
    editor.selectedTile = !up ? Number(currentSelectedTiles[(currentSelectedTiles.indexOf(currentSelectedTiles.find(f => f.dataset.tile == String(editor.selectedTile))) + 1) % currentSelectedTiles.length].dataset.tile) : Number(currentSelectedTiles[(currentSelectedTiles.indexOf(currentSelectedTiles.find(f => f.dataset.tile == String(editor.selectedTile))) - 1 + currentSelectedTiles.length) % currentSelectedTiles.length].dataset.tile)
  }
} export function initEditor() {
  enemies.forEach(enemy => enemies.pop())
  ctx.imageSmoothingEnabled = false
}

export let mouseDown = false;
export let rDown = false;
export let spaceDown = false;
export let lastIdx;

export function placeTile(tx, ty) {
  let tileLimitPlaced = false
  if (editor.limitedPlacedTiles.includes(editor.selectedTile)) {
    tileLimitPlaced = true
  }
  const idx = ty * editor.map.w + tx
  const selected = editor.selectedTile
  const tile = editor.tileset[selected]
  if (tile.mechanics) {
    if (tile.mechanics.includes("spawn") && !editor.limitedPlacedTiles.includes(selected)) {
      editor.playerSpawn = { x: tx, y: ty }
      console.log(editor.playerSpawn)
    }
    if (tile.mechanics.includes("end") && !editor.limitedPlacedTiles.includes(selected)) {
      editor.end = { x: tx, y: ty }
    }
    if (tile.mechanics.includes("onePerLevel") && !editor.limitedPlacedTiles.includes(selected)) {
      editor.limitedPlacedTiles.push(selected)
    }
  }

  if (editor.limitedPlacedTiles.includes(editor.map.tiles[idx] >> 4) && editor.map.tiles[idx] >> 4 !== selected) {
    editor.limitedPlacedTiles = editor.limitedPlacedTiles.filter(f => f !== editor.map.tiles[idx] >> 4)
  }

  if (tile.type == "adjacency" && !tileLimitPlaced) {
    calcAdjacentAdjacency(idx, editor.selectedTile)
  } else if (tile.type == "rotation" && !tileLimitPlaced) {
    editor.map.tiles[idx] = (editor.selectedTile * 16) + editor.currentRotation
  } else if (tile.type == "empty") {
    calcAdjacentAdjacency(idx, selected)
  } else if (!tileLimitPlaced) {
    calcAdjacentAdjacency(idx, selected)
  }
  lastIdx = idx
  editor.dirty = true
}

export function levelEditorLoop(dt) {
  let timeScale = dt * 60
  const { map, cam, tileSize, tileset } = editor
  const speed = 10
  if (key("up") && cam.y >= 0) cam.y -= speed * timeScale
  if (key("down") && cam.y <= (map.h * tileSize) - canvas.height) cam.y += speed * timeScale
  if (key("left") && cam.x >= 0) cam.x -= speed * timeScale
  if (key("right") && cam.x <= (map.w * tileSize) - canvas.width) cam.x += speed * timeScale
  const worldX = input.x + cam.x
  const worldY = input.y + cam.y
  const tx = Math.floor(worldX / tileSize)
  const ty = Math.floor(worldY / tileSize)

  if (input.down) {
    const idx = ty * map.w + tx
    if (!mouseDown) {
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
        placeTile(tx, ty)
      }
      mouseDown = true
    }
    // so the user can drag
    if (lastIdx !== idx) {
      mouseDown = false
    }
  } else {
    mouseDown = false
  }

  if (input.keys['r']) {
    const idx = ty * map.w + tx
    if (!rDown) {
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
        if (tileset[editor.map.tiles[idx] >> 4].type == 'rotation') {
          const currentRotation = editor.map.tiles[idx] & 15
          const newRotation = (currentRotation + 1) % 4
          editor.map.tiles[idx] = (editor.map.tiles[idx] >> 4 << 4) + newRotation
          editor.currentRotation = newRotation
        } else if (editor.map.tiles[idx] >> 4 == 0) {
          const newRotation = (editor.currentRotation + 1) % 4
          editor.currentRotation = newRotation
        }
        editor.dirty = true
      }
      rDown = true
    }
  } else {
    rDown = false
  }

  if (input.keys[" "]) {
    if (!spaceDown) {
      changeSelectedTile("last")
      spaceDown = true
    }
  } else {
    spaceDown = false
  }

  ctx.fillStyle = '#C29A62'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawMap()

  const cursorScrX = (tx * tileSize) - cam.x
  const cursorScrY = (ty * tileSize) - cam.y
  let img
  const selectedTileOfTileset = tileset[editor.selectedTile]
  if (selectedTileOfTileset && selectedTileOfTileset.type == "adjacency") {
    img = selectedTileOfTileset.images[calculateAdjacency(ty * map.w + tx, editor.selectedTile) & 15]
  } else if (selectedTileOfTileset && selectedTileOfTileset.type == "rotation") {
    img = selectedTileOfTileset.images[editor.currentRotation]
  } else if (selectedTileOfTileset) {
    img = selectedTileOfTileset.image
  }

  if (img) {
    ctx.save()
    ctx.imageSmoothingEnabled = false
    canvas.style.imageRendering = 'pixelated'
    ctx.globalAlpha = 0.5
    ctx.drawImage(img, cursorScrX, cursorScrY, tileSize, tileSize)
    ctx.restore()
  } else {
    ctx.strokeStyle = 'black'
    ctx.strokeRect(cursorScrX, cursorScrY, tileSize, tileSize)
  }
  ctx.globalAlpha = 1
}
export function updateLevelSize(width, height) {
  // need to update the array with new values or slice old ones 
  // and also update editor object
  // note: add new columns on the right of the map
  // note: and new rows on top and same for removing
  let tiles = Array.from(editor.map.tiles)
  if (editor.width > width) {
    const diff = width - editor.width
    for (let h = 0; h < editor.height; h++) {
      // delete the end of the rows
      tiles.splice((h * width) + width, editor.width - width)
    }
  } else if (editor.width < width) {
    // !!Working!!
    const diff = Math.abs(width - editor.width)
    for (let h = 0; h < editor.height; h++) {
      tiles.splice(((h * width) + width - diff), 0, ...Array(diff).fill(0))
    }
  }
  if (editor.height > height) {
    // !!Working!!
    tiles.splice(0, (editor.height - height) * width)
  } else if (editor.height < height) {
    // !!Working!!
    Array((height - editor.height) * width).fill(0)
    tiles.unshift(...Array((height - editor.height) * width).fill(0))
  }

  editor.map.tiles = new Uint16Array(tiles)
  editor.width = width
  editor.height = height
  editor.map.w = width
  editor.map.h = height
  editor.dirty = true
}


