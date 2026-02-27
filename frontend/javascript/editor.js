import { calcAdjacentAdjacency, calculateAdjacency, enemies } from "./platformer.js"
import { canvas, ctx, drawMap, drawMinimap } from "./renderer.js"
import { input, key } from "./site.js"
import { state } from "./state.js"
import { toggleTriggerDialog } from "./ui.js"
const { editor, player } = state

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
}

export function initEditor() {
  enemies.forEach(enemy => enemies.pop())
  ctx.imageSmoothingEnabled = false
}

export let mouseDown = false;
let differentTile = false
export let rightClick = false
export let rDown = false;
export let spaceDown = false;
export let lastIdx;
let handledBySelection

function addTrigger(tx, ty) {
  player.triggers.push({
    x: tx,
    y: ty,
    execute: [
      {
        type: "toggleBlocks"
      }
    ]
  })
}

export function placeTile(tx, ty) {
  let tileLimitPlaced = false
  if (editor.limitedPlacedTiles.includes(editor.selectedTile)) {
    tileLimitPlaced = true
  }
  const idx = ty * editor.map.w + tx
  const selected = editor.selectedTile
  const tile = editor.tileset[selected]

  const underCursor = editor.map.tiles[idx] >> 4

  if (editor.tileset[underCursor] && editor.tileset[underCursor].mechanics && editor.tileset[underCursor].mechanics.includes("trigger")) {
    const trigger = player.triggers.findIndex(f => f.x == tx && f.y == ty)
    if (trigger !== -1) {
      player.triggers.slice(trigger, 1)
    }
  }

  if (tile && tile.mechanics) {
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
    if (tile.mechanics.includes("trigger")) {
      addTrigger(tx, ty)
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
  drawMinimap()
}

const selectedTileEl = document.querySelector(".selected-tile")
const tileIdEl = document.querySelector(".selected-tile-id")
const xEl = document.querySelector(".x")
const yEl = document.querySelector(".y")

function updateBottomBar(tx, ty) {
  if (editor.tileset[editor.selectedTile] && selectedTileEl.innerText !== editor.tileset[editor.selectedTile].name) {
    selectedTileEl.innerText = editor.tileset[editor.selectedTile].name
  }
  if (tileIdEl.innerText !== String(editor.selectedTile)) {
    tileIdEl.innerText = String(editor.selectedTile)
  }
  if (xEl.innerText !== String(tx)) {
    xEl.innerText = String(tx)
  }
  if (yEl.innerText !== String(ty)) {
    yEl.innerText = String(ty)
  }
}

export function undo() {
  console.log(editor.history)
  const latestChange = editor.history[editor.history.length - 1]
  if (!latestChange) return
  if (latestChange.type == "replaceBlocks") {
    if (!latestChange.replacedBlocks) return
    for (const change of latestChange.replacedBlocks) {
      if (change.after == undefined || change.before == undefined || change.idx == undefined) continue
      const rotation = change.rotation ? change.rotation : 0
      editor.map.tiles[change.idx] = (change.before << 4) + rotation
      calcAdjacentAdjacency(change.idx, change.before)
    }
    editor.future.push(editor.history.pop())
  } else {
    editor.future.push(editor.history.pop())
  }
}

export function redo() {
  const latest = editor.future[editor.future.length - 1]
  if (!latest) return
  if (latest.type == "replaceBlocks") {
    if (!latest.replacedBlocks) return
    for (const change of latest.replacedBlocks) {
      if (change.after == undefined || change.before == undefined || change.idx == undefined) continue
      editor.map.tiles[change.idx] = change.after << 4
      calcAdjacentAdjacency(change.idx, change.after)
    }
    editor.history.push(editor.future.pop())
  }
}

export function liftSelection() {
  const { selection, map, selectionLayer } = editor

  const minX = Math.min(selection.startX, selection.endX)
  const maxX = Math.max(selection.startX, selection.endX)
  const minY = Math.min(selection.startY, selection.endY)
  const maxY = Math.max(selection.startY, selection.endY)

  selection.triggers = []
  if (player.triggers) {
    const remainingTriggers = []
    for (const trigger of player.triggers) {
      if (trigger.x >= minX && trigger.x <= maxX && trigger.y >= minY && trigger.y <= maxY) {
        selection.triggers.push({ ...trigger })
      } else {
        remainingTriggers.push(trigger)
      }
    }
    player.triggers = remainingTriggers
  }

  const liftedTiles = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * map.w + x
      const tile = map.tiles[idx]

      if (tile !== 0) {
        selectionLayer[idx] = tile
        const rotation = editor.tileset[tile >> 4] && editor.tileset[tile >> 4].type == "rotation" ? tile & 3 : 0
        liftedTiles.push({ idx: idx, before: tile >> 4, after: 0, rotation: rotation })

        map.tiles[idx] = 0
      }
    }
  }
  const historyItem = {
    type: "replaceBlocks",
    lift: true,
    replacedBlocks: liftedTiles
  }
  selection.hasFloatingTiles = true
  editor.history.push(historyItem)
}

export function calculateAdjacenciesForIndexes(idxList) {
  const uniqueIndexes = [...new Set(idxList)]
  for (const idx of idxList) {
    const tileId = editor.map.tiles[idx] >> 4
    calcAdjacentAdjacency(idx, tileId)
  }
}

function stampSelection() {
  const { selection, map, selectionLayer } = editor

  const changedTiles = []
  const changedIndexes = []
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const idx = y * map.w + x
      const tile = selectionLayer[idx]

      const newX = x + selection.offsetX
      const newY = y + selection.offsetY

      if (newX >= 0 && newX < map.w && newY >= 0 && newY < map.h) {
        const newIdx = newY * map.w + newX;
        const beforeTile = map.tiles[newIdx] >> 4

        if (selectionLayer[idx] !== 0) {
          map.tiles[newIdx] = tile
          changedIndexes.push(newIdx)
          changedIndexes.push(idx)
          const rotation = editor.tileset[tile >> 4] && editor.tileset[tile >> 4].type == "rotation" ? tile & 3 : 0
          changedTiles.push({ idx: newIdx, before: beforeTile, after: tile >> 4, rotation: rotation })
        }
      }
      selectionLayer[idx] = 0
    }
  }

  if (selection.triggers.length > 0) {
    console.log(selection.triggers)
    for (const trigger of selection.triggers) {
      const newX = trigger.x + selection.offsetX
      const newY = trigger.y + selection.offsetY

      if (newX >= 0 && newX < map.w && newY >= 0 && newY < map.h) {
        player.triggers = player.triggers.filter(t => t.x !== newX || t.y !== newY)

        trigger.x = newX
        trigger.y = newY
        player.triggers.push(trigger)
      }
    }
    selection.triggers = []
  }
  calculateAdjacenciesForIndexes(changedIndexes)
  const historyItem = {
    type: "replaceBlocks",
    replacedBlocks: changedTiles
  }
  selection.hasFloatingTiles = false
  selection.active = false
  editor.selectionLayer = new Uint16Array(editor.map.w * editor.map.h)
  editor.history.push(historyItem)
}

export function levelEditorLoop(dt) {
  let timeScale = dt * 60
  const { map, cam, tileSize, tileset } = editor
  const speed = 10
  if (key("up") && cam.y >= 0) {
    cam.y -= speed * timeScale
    drawMinimap()
  }
  if (key("down") && cam.y <= (map.h * tileSize) - canvas.height) {
    cam.y += speed * timeScale
    drawMinimap()
  }
  if (key("left") && cam.x >= 0) {
    cam.x -= speed * timeScale
    drawMinimap()
  }
  if (key("right") && cam.x <= (map.w * tileSize) - canvas.width) {
    cam.x += speed * timeScale
    drawMinimap()
  }

  const shiftDown = input.keys["Shift"]

  if (shiftDown || editor.selection.isDragging) {
    const sideThreshold = 50
    const movementSpeed = 15
    if (input.x < sideThreshold) {
      cam.x -= movementSpeed * timeScale
      drawMinimap()
    } else if (input.x > canvas.width - sideThreshold) {
      cam.x += movementSpeed * timeScale
      drawMinimap()
    }
    if (input.y < sideThreshold) {
      cam.y -= movementSpeed * timeScale
      drawMinimap()
    } else if (input.y > canvas.height - sideThreshold) {
      cam.y += movementSpeed * timeScale
      drawMinimap()
    }
  }

  cam.x = Math.round(Math.max(0, Math.min(cam.x, (editor.map.w * editor.tileSize) - canvas.width)))
  cam.y = Math.round(Math.max(0, Math.min(cam.y, (editor.map.h * editor.tileSize) - canvas.height)))
  const worldX = input.x + cam.x
  const worldY = input.y + cam.y
  const tx = Math.floor(worldX / tileSize)
  const ty = Math.floor(worldY / tileSize)


  updateBottomBar(tx, ty)

  const { selection } = editor

  let isHoveringSelection = false
  if (selection.active) {
    const minX = Math.min(selection.startX, selection.endX) + selection.offsetX
    const maxX = Math.max(selection.startX, selection.endX) + selection.offsetX
    const minY = Math.min(selection.startY, selection.endY) + selection.offsetY
    const maxY = Math.max(selection.startY, selection.endY) + selection.offsetY
    isHoveringSelection = tx >= minX && tx <= maxX && ty >= minY && ty <= maxY
  }

  if (input.down) {

    if (!mouseDown) {
      let handledBySelection = false
      mouseDown = true

      if (selection.active && isHoveringSelection) {
        // hovering over selection, don't require shift key
        if (!selection.hasFloatingTiles) {
          liftSelection()
        }
        selection.isDragging = true
        selection.dragStartX = tx;
        selection.dragStartY = ty;
        selection.initialOffsetX = selection.offsetX
        selection.initialOffsetY = selection.offsetY
        handledBySelection = true

      } else if (shiftDown) {
        // selecting, draw new box
        if (selection.hasFloatingTiles) {
          stampSelection()
        }
        selection.active = true
        selection.isDragging = false
        selection.hasFloatingTiles = false
        selection.offsetX = 0
        selection.offsetY = 0
        selection.startX = Math.max(0, Math.min(tx, map.w - 1))
        selection.startY = Math.max(0, Math.min(ty, map.h - 1))
        selection.endX = selection.startX
        selection.endY = selection.startY
        handledBySelection = true
      } else if (selection.active) {
        if (selection.hasFloatingTiles) stampSelection()
        selection.active = false
        handledBySelection = true
      }
    } else {
      // dragging mouse around
      if (selection.isDragging) {
        // moving the selection around
        const rawOffsetX = selection.initialOffsetX + (tx - selection.dragStartX)
        const rawOffsetY = selection.initialOffsetY + (ty - selection.dragStartY)

        const minX = Math.min(selection.startX, selection.endX)
        const maxX = Math.max(selection.startX, selection.endX)
        const minY = Math.min(selection.startY, selection.endY)
        const maxY = Math.max(selection.startY, selection.endY)

        selection.offsetX = Math.max(-minX, Math.min(rawOffsetX, map.w - 1 - maxX))
        selection.offsetY = Math.max(-minY, Math.min(rawOffsetY, map.h - 1 - maxY))

        drawMinimap()
        handledBySelection = true
      } else if (selection.active && !selection.hasFloatingTiles) {
        // changing the size of the selection
        selection.endX = Math.max(0, Math.min(tx, map.w - 1))
        selection.endY = Math.max(0, Math.min(ty, map.h - 1))
        drawMinimap()
        handledBySelection = true
      }
    }

    if (!handledBySelection && !shiftDown) {
      const idx = ty * map.w + tx
      if (!mouseDown || differentTile) {
        if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
          const beforeTile = editor.map.tiles[idx] >> 4
          placeTile(tx, ty)
          const afterTile = editor.map.tiles[idx] >> 4
          if (beforeTile !== afterTile) {
            if (!mouseDown && !differentTile) {
              const entry = { type: "replaceBlocks", replacedBlocks: [] }
              editor.history.push(entry)
              const replacedBlock = { idx: idx, before: beforeTile, after: afterTile }
              editor.history[editor.history.length - 1]?.replacedBlocks.push(replacedBlock)
            }
          }
        }
        mouseDown = true
        differentTile = false
      }
      // so the user can drag
      if (lastIdx !== idx) {
        differentTile = true
      }
    }
  } else if (mouseDown) {
    if (editor.selection.isDragging) {
      editor.selection.isDragging = false
    }
    mouseDown = false
  }

  if (input.rightClick) {
    if (!rightClick) {
      const idx = ty * map.w + tx
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
        const raw = editor.map.tiles[idx]
        const tileId = raw >> 4
        if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("trigger")) {
          toggleTriggerDialog(true, tx, ty)
        }
      }
      rightClick = true
    }
  } else {
    rightClick = false
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

  if (editor.selection.active) {
    ctx.strokeStyle = 'white'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2

    const startX = Math.min(editor.selection.startX, editor.selection.endX) + editor.selection.offsetX
    const startY = Math.min(editor.selection.startY, editor.selection.endY) + editor.selection.offsetY
    const width = Math.abs(editor.selection.endX - editor.selection.startX) + 1
    const height = Math.abs(editor.selection.endY - editor.selection.startY) + 1

    const scrX = (startX * tileSize) - cam.x
    const scrY = (startY * tileSize) - cam.y

    ctx.strokeRect(scrX, scrY, width * tileSize, height * tileSize)
    ctx.setLineDash([])
  }

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


