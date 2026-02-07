import { calcAdjacentAdjacency, calculateAdjacency, enemies } from "./platformer.js"
import { canvas, ctx, drawMap } from "./renderer.js"
import { mode, input, key } from "./site.js"
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
}export function initEditor() {
  enemies.forEach(enemy => enemies.pop())
  ctx.imageSmoothingEnabled = false
}

export let mouseDown = false;
export let rDown = false;
export let spaceDown = false;
export let lastIdx;

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
        // set a limit on tiles with a mechanic of "onePerLevel"
        let tileLimitPlaced = false
        if (editor.limitedPlacedTiles.includes(editor.selectedTile)) {
          tileLimitPlaced = true
        }
        if (editor.tileset[editor.selectedTile].mechanics) {
          if (editor.tileset[editor.selectedTile].mechanics.includes("onePerLevel") && !editor.limitedPlacedTiles.includes(editor.selectedTile)) {
            editor.limitedPlacedTiles.push(editor.selectedTile)
          }
          if (tileset[editor.selectedTile].mechanics.includes("spawn")) {
            editor.playerSpawn = { x: tx, y: ty }
          }
          if (tileset[editor.selectedTile].mechanics.includes("end")) {
            editor.end = { x: tx, y: ty }
          }
        }
        if (tileset[editor.selectedTile].type == "adjacency" && !tileLimitPlaced) {
          calcAdjacentAdjacency(idx, editor.selectedTile)
        } else if (tileset[editor.selectedTile].type == 'rotation' && !tileLimitPlaced) {
          editor.map.tiles[idx] = (editor.selectedTile * 16) + editor.currentRotation
        } else if (tileset[editor.selectedTile].type == 'empty') {
          editor.limitedPlacedTiles = editor.limitedPlacedTiles.filter(f => f !== editor.map.tiles[idx] >> 4)
          calcAdjacentAdjacency(idx, editor.selectedTile)
        } else if (!tileLimitPlaced) {
          calcAdjacentAdjacency(idx, editor.selectedTile)
        }

      }
    }
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


