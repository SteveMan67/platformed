import { calcAdjacentAdjacency, calculateAdjacency, enemies, mechanicsHas, typeIs } from "./platformer.js"
import { canvas, ctx, drawMap, drawMinimap, updateColorTheme } from "./renderer.js"
import { input, key } from "./site.js"
import { state } from "./state.js"
import { toggleTriggerDialog } from "./ui.js"
const { editor, player } = state

/**
 * 
 * @param {boolean} zoomDirectionIsIn - the direction to zoom, true = in
 * @param {amount} amount - how many pixels to change the tilesize by
 */
export function zoomMap(zoomDirectionIsIn, amount) {
  const oldTileSize = editor.tileSize
  let newZoom = editor.tileSize
  if (zoomDirectionIsIn) {
    newZoom += amount
  } else {
    newZoom -= amount
  }
  const smallestDimension = editor.width / canvas.width > editor.height / canvas.height ? "height" : "width"
  const wh = smallestDimension == "height" ? canvas.height : canvas.width
  const twh = smallestDimension == "height" ? editor.map.h : editor.map.w

  newZoom = Math.ceil(Math.max(wh / twh, Math.min(newZoom, 100)))

  const scaleRatio = newZoom / oldTileSize

  editor.cam.x = (input.x + editor.cam.x) * scaleRatio - input.x
  editor.cam.y = (input.y + editor.cam.y) * scaleRatio - input.y
  editor.tileSize = newZoom
  drawMinimap()
}

function getMinMaxXY() {
  const { selection } = editor
  const minX = Math.min(selection.startX, selection.endX)
  const maxX = Math.max(selection.startX, selection.endX)
  const minY = Math.min(selection.startY, selection.endY)
  const maxY = Math.max(selection.startY, selection.endY)

  return { minX: minX, maxX: maxX, minY: minY, maxY: maxY }
}

export function toggleErase() {
  if (editor.selectedTile == 0) {
    editor.selectedTile = editor.lastSelectedTiles[1] ?? 1
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
    editor.lastSelectedTiles.shift()
    editor.lastSelectedTiles.push(editor.selectedTile ?? 1)

    if (editor.selectedTile == undefined) {
      editor.selectedTile = 1
    }
  }
}

export function initEditor() {
  updateColorTheme()
  enemies.forEach(enemy => enemies.pop())
  ctx.imageSmoothingEnabled = false
}

export let mouseDown = false;
let differentTile = false
export let rightClick = false
let rDown = false;
export let spaceDown = false;
export let lastIdx;
let handledBySelection = false
let undidSelection = false

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
  let tileLimitPlaced = editor.limitedPlacedTiles.includes(editor.selectedTile)

  const idx = ty * editor.map.w + tx
  const selected = editor.selectedTile

  const underCursor = editor.map.tiles[idx] >> 4

  if (mechanicsHas(underCursor, "trigger")) {
    const trigger = player.triggers.findIndex(f => f.x == tx && f.y == ty)
    if (trigger !== -1) {
      player.triggers.splice(trigger, 1)
    }
  }
  if (mechanicsHas(selected, "spawn") && !tileLimitPlaced) {
    editor.playerSpawn = { x: tx, y: ty }
    console.log(editor.playerSpawn)
  }
  if (mechanicsHas(selected, "end") && !tileLimitPlaced) {
    editor.end = { x: tx, y: ty }
  }
  if (mechanicsHas(selected, "onePerLevel") && !tileLimitPlaced) {
    editor.limitedPlacedTiles.push(selected)
  }
  if (mechanicsHas(selected, "trigger")) {
    addTrigger(tx, ty)
  }

  if (editor.limitedPlacedTiles.includes(editor.map.tiles[idx] >> 4) && editor.map.tiles[idx] >> 4 !== selected) {
    editor.limitedPlacedTiles = editor.limitedPlacedTiles.filter(f => f !== editor.map.tiles[idx] >> 4)
  }


  if (typeIs(selected, "adjacency") && !tileLimitPlaced) {
    calcAdjacentAdjacency(idx, editor.selectedTile)
  } else if (typeIs(selected, "rotation") && !tileLimitPlaced) {
    editor.map.tiles[idx] = (editor.selectedTile * 16) + editor.currentRotation
    calcAdjacentAdjacency(idx, editor.selectedTile)
  } else if (typeIs(selected, "empty")) {
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
  const latestChange = editor.history[editor.history.length - 1]
  console.log(latestChange)
  if (!latestChange) return
  if (latestChange.type == "replaceBlocks") {
    if (!latestChange.replacedBlocks) return
    for (const change of latestChange.replacedBlocks) {
      if (change.idx == undefined) continue
      if (change.before) {
        editor.map.tiles[change.idx] = (change.before << 4)
      }
      if (change.beforeRotation) {
        editor.map.tiles[change.idx] = (editor.map.tiles[change.idx] >> 4 << 4) + change.beforeRotation
      }
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
      if (change.idx == undefined) continue
      if (change.after) {
        editor.map.tiles[change.idx] = change.after << 4
      }
      if (change.afterRotation) {
        editor.map.tiles[change.idx] = (editor.map.tiles[change.idx] >> 4 << 4) + change.beforeRotation
      }
      calcAdjacentAdjacency(change.idx, change.after)
    }
    editor.history.push(editor.future.pop())
  } else {
    editor.history.push(editor.future.pop())
  }
}

export function liftSelection() {
  const { selection, map, selectionLayer } = editor

  const { minX, maxX, minY, maxY } = getMinMaxXY()

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
        const rotation = typeIs(tile >> 4, "rotation") ? tile & 3 : 0
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
  drawMinimap()
}

export function calculateAdjacenciesForIndexes(idxList) {
  const uniqueIndexes = [...new Set(idxList)]
  for (const idx of idxList) {
    const tileId = editor.map.tiles[idx] >> 4
    calcAdjacentAdjacency(idx, tileId)
  }
}

export function stampSelection() {
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
          const rotation = mechanicsHas(tile >> 4, "rotation") ? tile & 3 : 0
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
  drawMinimap()
}

function handleInput(timeScale) {
  const tx = editor.tx
  const ty = editor.ty
  const { minX, maxX, minY, maxY } = getMinMaxXY()
  const { selection, map, cam, tileSize, tileset } = editor
  const shiftDown = input.keys["Shift"] || false
  const isHoveringSelection = editor.tx >= minX && editor.tx <= maxX && editor.ty >= minY && editor.ty <= maxY

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


  // move the camera if we're on the outside of the box
  if (selection.active && isHoveringSelection) {
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

  if (input.down) {
    handledBySelection = false
    const isFirstClick = !mouseDown
    if (!mouseDown) {
      mouseDown = true
      undidSelection = false

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
        undidSelection = true
      }
    } else {
      // dragging mouse around
      if (selection.isDragging) {
        // moving the selection around
        editor.dirty = true
        const rawOffsetX = selection.initialOffsetX + (tx - selection.dragStartX)
        const rawOffsetY = selection.initialOffsetY + (ty - selection.dragStartY)

        const baseMinX = Math.min(selection.startX, selection.endX)
        const baseMaxX = Math.max(selection.startX, selection.endX)
        const baseMinY = Math.min(selection.startY, selection.endY)
        const baseMaxY = Math.max(selection.startY, selection.endY)

        selection.offsetX = Math.max(-baseMinX, Math.min(rawOffsetX, map.w - 1 - baseMaxX))
        selection.offsetY = Math.max(-baseMinY, Math.min(rawOffsetY, map.h - 1 - baseMaxY))

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

    if (!handledBySelection && !shiftDown && !undidSelection) {
      const idx = ty * map.w + tx
      if (isFirstClick || differentTile) {
        if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
          const beforeTile = editor.map.tiles[idx] >> 4
          placeTile(tx, ty)
          const afterTile = editor.map.tiles[idx] >> 4
          if (beforeTile !== afterTile) {
            if (isFirstClick) {
              const entry = { type: "replaceBlocks", replacedBlocks: [] }
              editor.history.push(entry)
              const replacedBlock = { idx: idx, before: beforeTile, after: afterTile }
              editor.history[editor.history.length - 1]?.replacedBlocks.push(replacedBlock)
            } else if (isFirstClick || differentTile) {
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
        if (mechanicsHas(tileId, "trigger")) {
          toggleTriggerDialog(true, tx, ty)
        }
      }
      rightClick = true
    }
  } else {
    rightClick = false
  }

  if (input.keys['r'] && selection.active && !rDown) {
    const changedBlocks = []
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * editor.map.w + x
        let beforeTile
        let beforeRotation = 0
        let afterRotation = 0
        if (selection.hasFloatingTiles) {
          const raw = editor.selectionLayer[idx]
          if (raw !== 0 && typeIs(raw >> 4, "rotation")) {
            beforeRotation = raw & 3
            afterRotation = ((raw & 3) + 1) % 4
            editor.selectionLayer[idx] = (editor.selectionLayer[idx] >> 4 << 4) + afterRotation
            changedBlocks.push({ idx: idx, beforeRotation: beforeRotation, afterRotation: afterRotation })
          }
        } else {
          const raw = editor.map.tiles[idx]
          changedBlocks.push({ idx: idx, before: beforeTile, after: editor.selectedTile >> 4 })
          if (raw !== 0 && typeIs(raw >> 4, "rotation")) {
            beforeRotation = raw & 3
            afterRotation = ((raw & 3) + 1) % 4
            editor.map.tiles[idx] = (editor.map.tiles[idx] >> 4 << 4) + afterRotation
            changedBlocks.push({ idx: idx, beforeRotation: beforeRotation, afterRotation: afterRotation })
          }
        }
      }
    }
    const historyEntry = {
      type: "replaceBlocks",
      replacedBlocks: changedBlocks
    }
    editor.history.push(historyEntry)
    drawMinimap()
    rDown = true
  } else if (input.keys["r"]) {
    if (!rDown) {
      const idx = ty * map.w + tx
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
        if (typeIs(editor.map.tiles[idx] >> 4, 'rotation')) {
          const currentRotation = editor.map.tiles[idx] & 15
          const newRotation = (currentRotation + 1) % 4
          editor.map.tiles[idx] = (editor.map.tiles[idx] >> 4 << 4) + newRotation
          editor.currentRotation = newRotation
        } else {
          const newRotation = (editor.currentRotation + 1) % 4
          editor.currentRotation = newRotation
        }
        editor.dirty = true
      }
    }
    rDown = true
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

}

export function levelEditorLoop(dt) {
  let timeScale = dt * 60
  const { map, cam, tileSize, tileset, colorTheme } = editor


  handleInput(timeScale)

  cam.x = Math.round(Math.max(0, Math.min(cam.x, (editor.map.w * editor.tileSize) - canvas.width)))
  cam.y = Math.round(Math.max(0, Math.min(cam.y, (editor.map.h * editor.tileSize) - canvas.height)))
  const worldX = input.x + cam.x
  const worldY = input.y + cam.y
  const tx = Math.floor(worldX / tileSize)
  const ty = Math.floor(worldY / tileSize)
  editor.tx = tx
  editor.ty = ty


  updateBottomBar(tx, ty)


  ctx.fillStyle = colorTheme.bgLevel
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawMap()

  if (editor.selection.active) {
    ctx.strokeStyle = colorTheme.selection
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
  } else if (selectedTileOfTileset && selectedTileOfTileset.image) {
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
    ctx.strokeStyle = colorTheme.selection
    ctx.strokeRect(cursorScrX, cursorScrY, tileSize, tileSize)
  }
  ctx.globalAlpha = 1
}

export function updateLevelSize(width, height) {
  let tiles = Array.from(editor.map.tiles)
  if (editor.width > width) {
    const diff = width - editor.width
    for (let h = 0; h < editor.height; h++) {
      tiles.splice((h * width) + width, editor.width - width)
    }
  } else if (editor.width < width) {
    const diff = Math.abs(width - editor.width)
    for (let h = 0; h < editor.height; h++) {
      tiles.splice(((h * width) + width - diff), 0, ...Array(diff).fill(0))
    }
  }
  if (editor.height > height) {
    tiles.splice(0, (editor.height - height) * width)
  } else if (editor.height < height) {
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


