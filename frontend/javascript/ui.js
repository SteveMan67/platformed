import { importMap, updateMap, createMap } from "./file-utils.js"
import { mode, setMode, input } from "./site.js"
import { state } from "./state.js"
import { canvas, drawMinimap, updateCanvasSize, updateTileset } from "./renderer.js"
import { toggleErase, changeSelectedTile, zoomMap, scrollCategoryTiles, undo, redo, calculateAdjacenciesForIndexes } from "/javascript/editor.js"
import { killPlayer } from "./platformer.js"
const { editor, player } = state

export function toggleEditorUI(on) {
  const grid = document.querySelector(".grid")
  const minimap = document.querySelector('.minimap')
  if (on) {
    grid.classList.remove("grid-uihidden")
    if (minimap) minimap.style.display = 'block'
  } else {
    grid.classList.add("grid-uihidden")
    if (minimap) minimap.style.display = 'none'
  }
  updateCanvasSize()
}

export function updateSlidersOnLoad(json) {
  jumpWidthSlider.value = json.jumpWidth
  verticalInertiaSlider.value = json.yInertia
  horizontalInertiaSlider.value = json.x
  jumpHeightSlider.value = json.jumpHeightInertia
  if (json.bouncePadHeight) {
    bouncePadHeightSlider.value = json.bouncePadHeight
  }
  if (json.zoom) {
    zoomSlider.value = (json.zoom / (32 / 6))
  }
}

export function sortByCategory(category) {
  let tileCount = 0
  const tileSelects = document.querySelectorAll('.tile-select-container')
  let lowestIndexBlock
  tileSelects.forEach(tileSelect => {
    if (tileSelect.dataset.category == category) {
      if (!lowestIndexBlock || tileSelect.dataset.tile < lowestIndexBlock) {
        lowestIndexBlock = tileSelect.dataset.tile
      }
      tileSelect.style.display = 'block'
      tileCount++
    } else {
      tileSelect.style.display = 'none'
    }
    if (lowestIndexBlock) {
      changeSelectedTile(Number(lowestIndexBlock))
    }
  })
  updateCanvasSize()
  return tileCount
}

let activeTrigger

export function toggleTriggerDialog(open, tx, ty) {
  const overlay = document.querySelector(".overlay")
  const menu = document.querySelector(".menu-content")
  const triggerDialog = document.querySelector(".trigger-dialog")
  const stepsContainer = document.querySelector(".steps")
  stepsContainer.innerHTML = ''

  if (open) {
    overlay.style.display = "flex"
    menu.style.display = "none"
    triggerDialog.style.display = "flex"

    activeTrigger = player.triggers.find(f => f.x == tx && f.y == ty)
    if (activeTrigger && activeTrigger.execute) {
      addStepsToUI(activeTrigger.execute)
    }
  } else {
    overlay.style.display = "none"
    menu.style.display = "none"
    triggerDialog.style.display = "none"
    activeTrigger = null
  }

}

function addStepsToUI(steps) {
  for (const step of steps) {
    addStepToUI(step)
  }
}

function addStepToUI(stepData) {
  const stepContainer = document.querySelector(".steps")
  const stepEl = document.createElement('div')
  stepEl.classList.add("step")
  stepEl.classList.add(stepData.type)

  stepEl.innerHTML = `
    <div class="type">
      <select class="action-type" id="type">
        <option value="toggleBlocks" ${stepData.type === 'toggleBlocks' ? 'selected' : ''}>Swap red and blue</option>
        <option value="teleport" ${stepData.type === "teleport" ? 'selected' : ''}>Teleport</option>
        <option value="rotate" ${stepData.type === "rotate" ? 'selected' : ''}>Rotate Block</option>
        <option value="updateBlock" ${stepData.type === "updateBlock" ? 'selected' : ''}>Change Block</option>
      </select>
    </div>
    <div class="options">
      ${getOptionHTML(stepData)}
    </div>
  `

  stepContainer.appendChild(stepEl)
}

function getOptionHTML(stepData) {
  let html = ''

  if (stepData.type == "teleport") {
    html += `x <input type="number" class="tp-x" value="${stepData.x || 0}" min="0" max="${editor.width}"> y <input type="number" class="tp-y" value=${stepData.y || 0} min="0" max="${editor.height}">`
  }
  if (stepData.type == "rotate") {
    html += `
    x <input type="number" class="rotate-x" value="${stepData.x || 0}" min="0" max="${editor.width}">
    y <input type="number" class="rotate-y" value=${stepData.y || 0} min="0" max="${editor.height}">
    <select class="rotation-amount">
      <option value="1">90</option>
      <option value="2">180</option>
      <option value="3">270</option>
    </select>
    `
  }
  if (stepData.type == "updateBlock") {
    let tileOptions = ''
    console.log(stepData)
    for (const tile of editor.tileset) {
      tileOptions += `<option value=${tile.id} ${tile.id == stepData.block ? 'selected' : ''}>${tile.name}</option>`
    }
    html += `
      x <input type="number" class="block-x coord" value="${stepData.x || 0}" min="0" max="${editor.width}">
      y <input type="number" class="block-y coord" value=${stepData.y || 0} min="0" max="${editor.height}">
      <select class="block">
        ${tileOptions}
      </select>
    `
  }
  html += `<img src="/assets/icons/delete.svg" alt="delete" class="delete-step">`
  return html
}

export function mobile() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
}

export function needsSmallerLevel() {
  return window.screen.width < 1500 && window.screen.height < 700
}

export function addEventListeners() {

  window.addEventListener("beforeunload", (e) => {
    if (editor.dirty) {
      e.preventDefault()
      e.returnValue = ""
    }
  })

  // page event listeners
  const menuElement = document.querySelector(".menu")
  const eraserButton = document.querySelector('.eraser')
  const saveButton = document.querySelector('.save')
  const importButton = document.querySelector('.import')
  const tileSelection = document.querySelector('.tile-selection')
  const zoomIn = document.querySelector('.plus')
  const zoomOut = document.querySelector('.minus')
  const categories = document.querySelectorAll('.category')
  const play = document.querySelector(".play")
  const saveAsJson = document.getElementById("save-as-json")

  const jumpHeightSlider = document.querySelector('#jump-height-input')
  const verticalInertiaSlider = document.querySelector('#vertical-inertia-input')
  const jumpWidthSlider = document.querySelector('#jump-width-input')
  const horizontalInertiaSlider = document.querySelector('#horizontal-inertia-input')
  const bouncePadHeightSlider = document.querySelector('#bounce-pad-height-input')
  const zoomSlider = document.getElementById('zoom-level-input')
  const walljumpInput = document.getElementById('walljump-input')
  const tilesetInput = document.getElementById('tileset-input')

  const stepsContainer = document.querySelector('.steps')
  const applyButton = document.querySelector('.apply')
  let mousedown = false
  const minimapToggle = document.getElementById("show-minimap")
  const minimap = document.querySelector(".minimap")

  minimapToggle.addEventListener("input", (e) => {
    if (minimapToggle.checked) {
      minimap.style.display = 'block'
    } else {
      minimap.style.display = 'none'
    }
  })

  minimap.addEventListener('mousedown', (e) => {
    mousedown = true
    moveMinimap(e)
  })

  let isDraggingMap = false
  const dragStart = {}
  const camStart = {}


  canvas.addEventListener("mousedown", (e) => {
    if (e.button == 1) {
      isDraggingMap = true
      dragStart.x = e.screenX
      dragStart.y = e.screenY
      camStart.x = editor.cam.x
      camStart.y = editor.cam.y
    }
  })

  const gameCanvas = document.querySelector(".canvas")
  let animationFrameId = null

  window.addEventListener("mousemove", (e) => {
    if (!isDraggingMap) return
    const maxX = (editor.width * editor.tileSize) - gameCanvas.width
    const maxY = (editor.height * editor.tileSize) - gameCanvas.height

    const dx = dragStart.x - e.screenX
    const dy = dragStart.y - e.screenY

    const newX = Math.round(camStart.x + dx)
    const newY = Math.round(camStart.y + dy)

    editor.cam.x = Math.max(0, Math.min(newX, maxX))
    editor.cam.y = Math.max(0, Math.min(newY, maxY))
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        drawMinimap()
        animationFrameId = null
      })
    }
  })

  window.addEventListener('mouseup', (e) => {
    mousedown = false
    isDraggingMap = false
  })

  function moveMinimap(e) {
    if (!mousedown || isDraggingMap) return
    const tx = e.offsetX / 3
    const ty = e.offsetY / 3
    const x = tx * editor.tileSize
    const y = ty * editor.tileSize
    const mapX = Math.max(0, Math.min(x - (canvas.width / 2), (editor.map.w * editor.tileSize) - canvas.width))
    const mapY = Math.max(0, Math.min(y - (canvas.height / 2), (editor.map.h * editor.tileSize) - canvas.height))

    editor.cam.x = mapX
    editor.cam.y = mapY
    drawMinimap()
  }

  minimap.addEventListener('mousemove', (e) => {
    moveMinimap(e)
  })

  applyButton.addEventListener('click', (e) => {
    if (!activeTrigger) return

    const newExecuteArray = []
    const stepElements = document.querySelectorAll('.steps .step')

    stepElements.forEach(stepEl => {
      const type = stepEl.querySelector('.action-type').value
      let stepData = { type: type }

      if (type == 'teleport') {
        const xInput = stepEl.querySelector('.tp-x')
        const yInput = stepEl.querySelector('.tp-y')
        stepData.x = xInput ? parseInt(xInput.value, 10) : 0
        stepData.y = yInput ? parseInt(yInput.value, 10) : 0
      }
      if (type == 'rotate') {
        const xInput = stepEl.querySelector('.rotate-x')
        const yInput = stepEl.querySelector('.rotate-y')
        const rotationEl = stepEl.querySelector('.rotation-amount')
        stepData.x = xInput ? Number(xInput.value) : 0
        stepData.y = yInput ? Number(yInput.value) : 0
        stepData.rotation = rotationEl ? Number(rotationEl.value) : 1
      }
      if (type == "updateBlock") {
        const xInput = stepEl.querySelector('.block-x')
        const yInput = stepEl.querySelector('.block-y')
        const blockEl = stepEl.querySelector('.block')
        stepData.x = xInput ? Number(xInput.value) : null
        stepData.y = xInput ? Number(yInput.value) : null
        stepData.block = blockEl ? Number(blockEl.value) : null
      }
      newExecuteArray.push(stepData)
    })
    activeTrigger.execute = newExecuteArray
    toggleTriggerDialog(false)
  })

  stepsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-step')) {
      e.target.closest('.step').remove()
    }
  })

  stepsContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('action-type')) {
      const stepEl = e.target.closest('.step')
      const optionsContainer = stepEl.querySelector('.options')
      optionsContainer.innerHTML = getOptionHTML({ type: e.target.value })
    }
  })

  document.querySelector('#new').addEventListener('click', () => {
    addStepToUI({ type: 'toggleBlocks' })
  })

  tilesetInput.addEventListener("input", () => {
    updateTileset(tilesetInput.value)
  })

  walljumpInput.addEventListener('input', () => {
    player.wallJump = walljumpInput.value
  })

  zoomSlider.addEventListener('click', () => {
    player.tileSize = Math.floor((32 / 0.6) * zoomSlider.value)
  })

  bouncePadHeightSlider.addEventListener('input', () => {
    player.bouncePadHeight = Number(bouncePadHeightSlider.value)
  })

  jumpHeightSlider.addEventListener('input', () => {
    player.jumpHeight = Number(jumpHeightSlider.value)
  })

  verticalInertiaSlider.addEventListener('input', () => {
    player.yInertia = Number(verticalInertiaSlider.value)
  })

  jumpWidthSlider.addEventListener('input', () => {
    player.jumpWidth = Number(jumpWidthSlider.value)
  })

  horizontalInertiaSlider.addEventListener('input', () => {
    player.xInertia = Number(horizontalInertiaSlider.value)
  })

  categories.forEach(category => {
    category.addEventListener('click', () => {
      categories.forEach(cat => {
        cat.classList.remove('active')
      })
      let tileCount = sortByCategory(category.dataset.category)
      if (tileCount !== 0) category.classList.add('active')
    })
    window.addEventListener('keypress', (e) => {
      if (e.key == String(((Array.from(categories).indexOf(category)) * -1) + categories.length)) {
        categories.forEach(cat => {
          cat.classList.remove('active')
        })
        let tileCount = sortByCategory(category.dataset.category)
        if (tileCount !== 0) category.classList.add('active')
      }
    })
  })

  let lastWheelTime = 0
  document.addEventListener('wheel', (e) => {
    const now = Date.now()
    if (now - lastWheelTime < 150) return
    if (e.deltaY < 0) {
      scrollCategoryTiles(true)
      lastWheelTime = now
    } else if (e.deltaY > 0) {
      scrollCategoryTiles(false)
      lastWheelTime = now
    }
  })

  window.addEventListener('resize', () => {
    updateCanvasSize()
    drawMinimap()
  })

  zoomIn.addEventListener('click', () => {
    zoomMap(false)
  })

  zoomOut.addEventListener('click', () => {
    zoomMap(true)
  })

  play.addEventListener('click', () => {
    setMode(mode === 'play' ? 'editor' : 'play')
  })

  importButton.addEventListener('click', () => {
    let input = document.createElement('input')
    input.type = 'file'
    input.id = 'mapFileInput'
    input.accept = '.json,application/json'
    input.style.display = 'none'
    input.addEventListener('change', (e) => {
      importMap(e)
    })
    input.value = ''
    input.click()
  })

  saveButton.addEventListener("click", () => {
    updateMap()
  })

  saveAsJson.addEventListener('click', () => {
    const json = createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles))
    const text = JSON.stringify(json, null, 2)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'map.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })

  eraserButton.addEventListener('click', () => {
    toggleErase()
  })
  document.addEventListener('keypress', (e) => {
    if (menuElement && menuElement.style.display != '' && menuElement.style.display != "none") return
    if (e.key == 'e') {
      const { selection } = editor
      if (selection.active) {
        // erase within selection

        const minX = Math.min(selection.startX, selection.endX)
        const maxX = Math.max(selection.startX, selection.endX)
        const minY = Math.min(selection.startY, selection.endY)
        const maxY = Math.max(selection.startY, selection.endY)

        const changedIndexes = []
        const changedBlocks = []
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const idx = y * editor.map.w + x
            let beforeTile
            if (selection.hasFloatingTiles) {
              beforeTile = editor.selectionLayer[idx] >> 4
              editor.selectionLayer[idx] = 0
            } else {
              beforeTile = editor.map.tiles[idx] >> 4
              editor.map.tiles[idx] = 0
            }
            if (beforeTile !== 0) {
              changedBlocks.push({ idx: idx, before: beforeTile, after: 0 })
              changedIndexes.push(idx)
            }
          }
        }
        calculateAdjacenciesForIndexes(changedIndexes)
        const historyEntry = {
          type: "replaceBlocks",
          replacedBlocks: changedBlocks
        }
        editor.history.push(historyEntry)
        selection.active = false
      } else {
        toggleErase()
      }
    } else if (e.key == 'p') {
      const desiredMode = mode == 'editor' ? 'play' : 'editor'
      setMode(desiredMode)
    } else if (e.key == 'o') {
      let input = document.createElement('input')
      input.type = 'file'
      input.id = 'mapFileInput'
      input.accept = '.json,application/json'
      input.style.display = 'none'
      input.addEventListener('change', (e) => {
        importMap(e)
      })
      input.value = ''
      input.click()
    } else if (e.key.toLowerCase == 'r') {
      killPlayer()
    }
    if ((e.ctrlKey || e.metaKey) && e.code == "KeyZ") {
      console.log("undo")
      if (e.shiftKey) {
        e.preventDefault()
        redo()
      } else {
        e.preventDefault()
        undo()
      }
    }
  })

}


export function setInputEventListeners() {
  const menuElement = document.querySelector(".overlay")
  document.addEventListener("blur", () => {
    for (const k of input.keys) {
      input.keys[k] = false;
    }
  })

  window.addEventListener("contextmenu", (e) => {
    e.preventDefault()
  })

  window.addEventListener('keydown', e => {
    if (menuElement && menuElement.style.display != '' && menuElement.style.display != "none") return
    input.keys[e.key] = true
    if (e.key == 'w' || e.key == 'd' || e.key == 'a' || e.key == 'ArrowUp' || e.key == "ArrowLeft" || e.key == "") {
      // has keyboard
      player.hasKeyboard = true
      const mobileControls = document.querySelector('.mobile-controls')
      mobileControls?.classList.add("hidden")

    }
  })
  window.addEventListener('keyup', e => {
    if (menuElement && menuElement.style.display != '' && menuElement.style.display != "none") return
    input.keys[e.key] = false
  })

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect()
    input.x = e.clientX - rect.left
    input.y = e.clientY - rect.top
  })

  canvas.addEventListener('mousedown', (e) => {
    if (e.button == 2) {
      input.rightClick = true
    }
  })
  window.addEventListener('mouseup', (e) => {
    if (e.button == 2) {
      input.rightClick = false
    }
  })
  canvas.addEventListener('mousedown', (e) => {
    if (menuElement && menuElement.style.display != '' && menuElement.style.display != "none") return
    if (e.button == 0) {
      input.down = true
    }
  })
  window.addEventListener('mouseup', (e) => {
    if (menuElement && menuElement.style.display != '' && menuElement.style.display != "none") return
    if (e.button == 0) {
      input.down = false
    }
  })
}


export function addTileSelection() {
  const categoryBlocks = document.querySelector('.category-blocks')
  categoryBlocks.innerHTML = ''
  for (let i = 1; i < editor.tileset.length; i++) {
    if (editor.tileset[i]) {
      let div = document.createElement('div')
      div.classList.add('tile-select-container')
      div.dataset.tile = i
      div.dataset.category = editor.tileset[i].category
      categoryBlocks.appendChild(div)
      let img = document.createElement('img')
      img.classList.add('tile-select')
      let src
      if (editor.tileset[i].type == 'rotation' || editor.tileset[i].type == 'adjacency') {
        const c = editor.tileset[i].images[0]
        if (c instanceof HTMLCanvasElement) {
          if (c.toBlob) {
            c.toBlob(blob => {
              const url = URL.createObjectURL(blob)
              img.src = url
              img.onload = () => URL.revokeObjectURL(url)
            })
          } else {
            img.src = c.toDataURL()
          }
        } else if (c instanceof HTMLImageElement) {
          img.src = c.src
        }
      } else {
        if (editor.tileset[i].image instanceof HTMLImageElement) {
          img.src = editor.tileset[i].image.src
        } else {
          img.src = ''
        }
      }
      div.appendChild(img)
      div.addEventListener('mousedown', (e) => {
        e.preventDefault()
        editor.lastSelectedTiles.shift()
        changeSelectedTile(Number(div.dataset.tile))
      })
    }
  }
  sortByCategory("")
}
