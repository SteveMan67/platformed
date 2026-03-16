import { importMap, updateMap, createMap } from "./file-utils.js"
import { mode, setMode, input } from "./site.js"
import { state } from "./state.js"
import { canvas, drawMinimap, updateCanvasSize, updateTileset, changeColorTheme } from "./renderer.js"
import { toggleErase, changeSelectedTile, zoomMap, scrollCategoryTiles, undo, redo, calculateAdjacenciesForIndexes } from "/javascript/editor.js"
import { killPlayer, mechanicsHas, typeIs } from "./platformer.js"
import { stampSelection, updateLevelSize } from "./editor.js"
import { compileToTriggerScript, getTriggerScriptForLine, readTriggerScript } from "./trigger-script.js"
const { user, editor, player, colorSchemes } = state

export function openMenu(menuClass) {
  const menuOverlay = document.querySelector(".overlay")
  const menus = document.querySelectorAll(".menu")
  if (!menuClass) {
    console.log(1)
    menuOverlay.classList.add("hidden")
    for (const menu of menus) {
      menu.classList.add("hidden")
    }
  } else {
    console.log(2)
    menuOverlay.classList.remove("hidden")
    for (const menu of menus) {
      if (menu.classList.contains(menuClass)) {
        console.log(3)
        console.log(menuClass)
        console.log(menu)
        menu.classList.remove("hidden")
        menuOverlay.classList.remove("hidden")
      } else {
        menu.classList.add("hidden")
      }
    }
  }
}

function addSvg(filePath, containerSelector, width = 50, height = 50, svgClass, title) {
  const div = document.createElement('div')
  div.style.width = `${width}px`
  div.style.height = `${height}px`
  div.title = title
  if (svgClass) {
    div.classList.add(svgClass)
  }

  div.style.backgroundColor = 'var(--text-on-primary)'

  const maskUrl = `url('/assets/icons/${filePath}')`

  div.style.maskImage = maskUrl
  div.style.maskSize = 'contain'
  div.style.maskRepeat = 'no-repeat'
  div.style.maskPosition = 'center'

  const container = document.querySelector(containerSelector)
  container.appendChild(div)
}

function addTopBarSVGs() {
  addSvg('help.svg', '.actions', 45, 50, "help", "help")
  addSvg('undo.svg', '.actions', 50, 50, "undo", "undo")
  addSvg('redo.svg', '.actions', 50, 50, "redo", "redo")
  addSvg('save.svg', '.actions', 50, 50, "save", "save-level")
  addSvg('import.svg', '.actions', 50, 50, 'import', "import")
  addSvg('play_nofill.svg', '.actions', 50, 50, 'play', 'play')
  addSvg('menu.svg', '.actions', 40, 50, 'menu-button', 'menu')
  // addSvg('.svg', '.actions', 50, 50, '', '')
}

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
  const stepsContainer = document.querySelector(".steps")
  stepsContainer.innerHTML = ''

  if (open) {
    openMenu("trigger-dialog")
    activeTrigger = player.triggers.find(f => f.x == tx && f.y == ty)
    console.log(activeTrigger)
    if (activeTrigger && activeTrigger.execute) {
      addStepsToUI(activeTrigger.execute)
    }
  } else {
    openMenu("")
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
        <option value="delay" ${stepData.type === "delay" ? 'selected' : ''}>Delay</option>
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
    html += `x <input type="number" class="number tp-x" value="${stepData.x || 0}" min="0" max="${editor.width}"> y <input type="number" class="number tp-y" value=${stepData.y || 0} min="0" max="${editor.height}"> instant <input type="checkbox" class="instant toggle" ${stepData.instant ? 'checked' : ''}>`
  } else if (stepData.type == "rotate") {
    html += `
    x <input type="number" class="number rotate-x" value="${stepData.x || 0}" min="0" max="${editor.width}">
    y <input type="number" class="number rotate-y" value=${stepData.y || 0} min="0" max="${editor.height}">
    <select class="rotation-amount">
      <option value="1" ${stepData.beforeRotation == 1 ? 'selected' : ''}>90</option>
      <option value="2" ${stepData.beforeRotation == 2 ? 'selected' : ''}>180</option>
      <option value="3" ${stepData.beforeRotation == 3 ? 'selected' : ''}>270</option>
    </select>
    `
  } else if (stepData.type == "updateBlock") {
    let tileOptions = ''
    for (const tile of editor.tileset) {
      tileOptions += `<option value=${tile.id} ${tile.id == stepData.block ? 'selected' : ''}>${tile.name}</option>`
    }
    html += `
      x <input type="number" class="number block-x coord" value="${stepData.x || 0}" min="0" max="${editor.width}">
      y <input type="number" class="number block-y coord" value=${stepData.y || 0} min="0" max="${editor.height}">
      <select class="block">
        ${tileOptions}
      </select>
    `
  } else if (stepData.type == "delay") {
    console.log(stepData)
    html += `
      ms <input type="number" class="number ms" value="${stepData.time || 500}" min="0">
    `
  } else {
    html += getTriggerScriptForLine(stepData)
  }

  html += `<img src="/assets/icons/delete.svg" alt="delete" class="delete-step">`
  return html
}

export function mobile() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
}

export function needsSmallerLevel() {
  return canvas.width < 900 && canvas.height < (player.tileSize * 15)
}

export function addEventListeners() {
  console.log("setting event listeners")

  addTopBarSVGs()
  addSvg('close.svg', '.close-wrapper', 30, 30, 'close-button', 'close')

  // add color theme swatches
  const serverUrl = window.location.origin

  const swatches = document.querySelector(".color-theme .swatches")
  for (const theme of colorSchemes) {
    console.log(theme)
    const swatch = document.createElement('div')
    swatch.innerHTML = `
      <div class="swatch">
        <div class="level-color" style="background-color: ${theme.colors.bgLevel}"></div>
        <div class="primary" style="background-color: ${theme.colors.bgPrimary}"></div>
      </div>
      <p>${theme.name}</p>
    `
    console.log(swatch)
    swatch.addEventListener("click", () => {
      changeColorTheme(theme.id)
      console.log(1)
      fetch(`${serverUrl}/api/theme`, {
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          theme: theme.id
        })
      })
    })
    swatches.appendChild(swatch)
  }

  window.addEventListener("beforeunload", (e) => {
    if (editor.dirty) {
      e.preventDefault()
      e.returnValue = ""
    }
  })

  const linkEl = document.querySelector(".share-link .link")
  const linkBox = document.querySelector(".share-link")

  const url = window.location.href
  const hasEditorId = /\/editor\/\d+/.test(url)
  let out = url.replace(/^https?:\/\//, '').replace('/editor/', '/level/')

  if (hasEditorId) {
    const levelIdMatch = url.match(/\/editor\/(\d+)/)
    const levelId = levelIdMatch[0].replace('editor/', 'level/')
    linkEl.innerText = out
    const linkWrapper = document.querySelector(".topbar .link-wrapper")
    const topBarLink = document.querySelector(".main-link")
    linkWrapper.classList.remove("hidden")
    topBarLink.href = levelId
    topBarLink.innerText = "Open Level"
    topBarLink.target = "_blank"
  } else {
    out = ''
  }

  linkBox.addEventListener("click", async () => {
    if (out === '') return
    const text = out
    try {
      await navigator.clipboard.writeText(text)
      linkEl.innerText = 'Copied'
      setTimeout(() => {
        if (out !== '') linkEl.innerText = out
      }, 1000)
      return
    } catch {

    }

    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      linkEl.innerText = "Copied"
      setTimeout(() => {
        if (out !== '') linkEl.innerText = out
      }, 1000)
    } finally {
      document.removeChild(ta)
    }

  })

  // page event listeners
  const menuElement = document.querySelector(".overlay")
  const menuButton = document.querySelector(".menu-button")
  const background = document.querySelector(".background")
  const eraserButton = document.querySelector('.eraser')
  const saveButton = document.querySelector('.save')
  const undoButton = document.querySelector('.undo')
  const redoButton = document.querySelector('.redo')
  const helpButton = document.querySelector('.help')
  const helpTabRadio = document.getElementById('tab5')
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
  const resizeLevel = document.querySelector(".resize")

  const closeButton = document.querySelector(".close-button")
  const triggerDialog = document.querySelector(".trigger-dialog")
  const stepsContainer = document.querySelector('.steps')
  const applyTrigger = document.querySelector('.trigger-dialog .apply')
  const editWithTS = document.querySelector(".trigger-script-edit")
  const tsTextarea = document.querySelector(".trigger-script textarea")
  const tsDialog = document.querySelector(".trigger-script")
  const applyTS = document.querySelector(".trigger-script .apply")
  const tsError = document.querySelector(".trigger-script .error")
  let mousedown = false
  const minimapToggle = document.getElementById("show-minimap")
  const triggerHighlightToggle = document.getElementById("trigger-highlight")
  const minimap = document.querySelector(".minimap")

  const username = document.querySelector(".login #username")
  const password = document.querySelector(".login #password")
  const login = document.querySelector(".login")
  const loginSubmit = document.querySelector(".login #submit")
  const loginForm = document.querySelector(".login form")
  const overlay = document.querySelector(".overlay")
  const HackClubOauth = document.querySelector(".hack-club-oauth")

  HackClubOauth.addEventListener("click", () => {
    openMenu()
  })

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const form = e.target
    if (form.username.value && form.password.value) {
      console.log("hello")
      const payload = {
        username: form.username.value,
        password: form.password.value
      }

      const url = `${serverUrl}/api/login`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": 'applicatoin/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        openMenu()
        const json = await res.json()
        console.log(json)
        user.id = json.id
        updateMap()
      }
    }
  })


  editWithTS.addEventListener("click", (e) => {
    openMenu("trigger-script")
    tsTextarea.value = compileToTriggerScript(activeTrigger.execute)
  })

  tsTextarea.addEventListener("input", (e) => {
    e.preventDefault()
    e.stopPropagation()
  })

  tsTextarea.addEventListener("keydown", (e) => {
    e.stopPropagation()
  })

  tsTextarea.addEventListener("keyup", (e) => {
    e.stopPropagation()
  })

  tsTextarea.addEventListener("keypress", (e) => {
    e.stopPropagation()
  })

  applyTS.addEventListener("click", async () => {
    const text = tsTextarea.value

    try {
      const execute = await readTriggerScript(text)
      activeTrigger.execute = execute
      openMenu()
    } catch (e) {
      console.log(e)
      tsError.innerText = e
    }
  })

  triggerHighlightToggle.addEventListener("input", (e) => {
    if (triggerHighlightToggle.checked) {
      editor.showTriggerHighlights = true
    } else {
      editor.showTriggerHighlights = false
    }
  })
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
    // mmb move around
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

  applyTrigger.addEventListener('click', (e) => {
    console.log("1")
    if (!activeTrigger) return
    console.log("2")

    const newExecuteArray = []
    const stepElements = document.querySelectorAll('.steps .step')

    stepElements.forEach(stepEl => {
      const type = stepEl.querySelector('.action-type').value
      let stepData = { type: type }

      if (type == 'teleport') {
        const xInput = stepEl.querySelector('.tp-x')
        const yInput = stepEl.querySelector('.tp-y')
        const instant = stepEl.querySelector('.instant')
        stepData.instant = instant.checked
        stepData.x = xInput ? parseInt(xInput.value, 10) : 0
        stepData.y = yInput ? parseInt(yInput.value, 10) : 0
      }
      if (type == 'rotate') {
        const xInput = stepEl.querySelector('.rotate-x')
        const yInput = stepEl.querySelector('.rotate-y')
        const rotationEl = stepEl.querySelector('.rotation-amount')
        stepData.x = xInput ? Number(xInput.value) : 0
        stepData.y = yInput ? Number(yInput.value) : 0
        stepData.beforeRotation = rotationEl ? Number(rotationEl.value) : 1
      }
      if (type == "updateBlock") {
        const xInput = stepEl.querySelector('.block-x')
        const yInput = stepEl.querySelector('.block-y')
        const blockEl = stepEl.querySelector('.block')
        stepData.x = xInput ? Number(xInput.value) : null
        stepData.y = xInput ? Number(yInput.value) : null
        stepData.block = blockEl ? Number(blockEl.value) : null
      }
      if (type == "delay") {
        const ms = stepEl.querySelector(".ms")
        stepData.time = ms.value ?? 500
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

  resizeLevel.addEventListener("click", () => {
    console.log("hi")
    const heightEl = document.querySelector(".resize-wrapper .height")
    const widthEl = document.querySelector(".resize-wrapper .width")
    const width = Number(widthEl.value)
    const height = Number(heightEl.value)

    if (height > 100 || height < 10 || width > 200 || width < 10) {
      alert("invalid level size")
      return
    }
    if (height < editor.height || width < editor.width) {
      console.log(height, editor.height, width, editor.width)
      console.log(height < editor.height, width < editor.width)
      if (confirm("This might erase level data. Continue?")) {
        updateLevelSize(width, height)
      }
    } else {
      updateLevelSize(width, height)
    }
    openMenu()
  })

  menuButton.addEventListener("click", () => {
    openMenu("menu-content")
  })

  background.addEventListener("click", () => {
    openMenu()
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

  closeButton.addEventListener("click", () => {
    openMenu()
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
      if (!overlay.classList.contains("hidden")) return
      if (e.key == String(((Array.from(categories).indexOf(category)) * -1) + categories.length) && getComputedStyle(menuElement).display === "none") {
        categories.forEach(cat => {
          cat.classList.remove('active')
        })
        let tileCount = sortByCategory(category.dataset.category)
        if (tileCount !== 0) category.classList.add('active')
      }
    })
  })

  window.addEventListener('wheel', (e) => {
    if (!overlay.classList.contains("hidden") || input.keys["Shift"]) return
    e.preventDefault()

    if (e.ctrlKey) {
      e.stopPropagation()
      let zoomAmount = Math.max(1, Math.round(Math.abs(e.deltaY) * 0.1))
      if (e.deltaY < 0) {
        zoomMap(true, zoomAmount)
      } else if (e.deltaY > 0) {
        zoomMap(false, zoomAmount)
      }
    } else {
      const sensitivity = 1.5
      editor.cam.x += e.deltaX * sensitivity
      editor.cam.y += e.deltaY * sensitivity
    }
    drawMinimap()
  }, { passive: false })

  let lastWheelTime = 0
  document.addEventListener('wheel', (e) => {
    const now = Date.now()
    if (now - lastWheelTime < 150 || !input.keys["Shift"]) return
    if (e.deltaY < 0) {
      scrollCategoryTiles(true)
      lastWheelTime = now
    } else if (e.deltaY > 0) {
      scrollCategoryTiles(false)
      lastWheelTime = now
    }
  }, { passive: false })

  window.addEventListener('resize', () => {
    updateCanvasSize()
    drawMinimap()
  })

  zoomIn.addEventListener('click', () => {
    zoomMap(true, 10)
  })

  zoomOut.addEventListener('click', () => {
    zoomMap(false, 10)
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

  undoButton.addEventListener("click", () => undo())
  redoButton.addEventListener("click", () => redo())

  helpButton.addEventListener("click", () => {
    openMenu("menu-content")
    helpTabRadio.checked = true
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
  document.addEventListener('keydown', (e) => {
    if (e.key == "Escape") {
      const { selection } = editor

      if (selection.active) {
        if (selection.hasFloatingTiles) {
          stampSelection()
        }

        selection.active = false
        editor.dirty = true
      }

      if (menuElement?.classList.contains("hidden")) {
        openMenu()
      }
    }
  })
  document.addEventListener('keypress', (e) => {
    if (!menuElement?.classList?.contains("hidden")) return
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
              if (editor.limitedPlacedTiles.includes(beforeTile)) {
                const index = editor.limitedPlacedTiles.findIndex(f => f === beforeTile)
                editor.limitedPlacedTiles.splice(index, 1)
              }
            } else {
              beforeTile = editor.map.tiles[idx] >> 4
              editor.map.tiles[idx] = 0
              if (editor.limitedPlacedTiles.includes(beforeTile)) {
                const index = editor.limitedPlacedTiles.findIndex(f => f === beforeTile)
                editor.limitedPlacedTiles.splice(index, 1)
              }
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
        drawMinimap()
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
    } else if (e.key == 'r') {
      killPlayer()
    } else if (e.key == 'f' && editor.selection.active) {
      const { selection } = editor
      // fill selection

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
            if (!editor.limitedPlacedTiles.includes(editor.selectedTile)) {
              editor.selectionLayer[idx] = editor.selectedTile << 4
              if (mechanicsHas(editor.selectedTile, "onePerLevel")) {
                editor.limitedPlacedTiles.push(editor.selectedTile)
              }
            }
            if (mechanicsHas(editor.selectedTile, "onePerLevel")) {
              const index = editor.limitedPlacedTiles.findIndex(f => f === beforeTile)
              if (index !== -1) {
                editor.limitedPlacedTiles.splice(index, 1)
              }
            }
          } else {
            beforeTile = editor.map.tiles[idx] >> 4
            if (!editor.limitedPlacedTiles.includes(editor.selectedTile)) {
              editor.map.tiles[idx] = editor.selectedTile << 4
              if (mechanicsHas(editor.selectedTile, "onePerLevel")) {
                editor.limitedPlacedTiles.push(editor.selectedTile)
              }
            }
            if (mechanicsHas(editor.selectedTile, "onePerLevel") && editor.selectedTile !== beforeTile) {
              const index = editor.limitedPlacedTiles.findIndex(f => f === beforeTile)
              if (index !== -1) {
                editor.limitedPlacedTiles.splice(index, 1)
              }
            }
          }
          changedBlocks.push({ idx: idx, before: beforeTile, after: editor.selectedTile >> 4 })
          changedIndexes.push(idx)
        }
      }
      calculateAdjacenciesForIndexes(changedIndexes)
      const historyEntry = {
        type: "replaceBlocks",
        replacedBlocks: changedBlocks
      }
      editor.history.push(historyEntry)
      drawMinimap()
    }
    if ((e.ctrlKey || e.metaKey) && e.code == "KeyZ") {
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


export function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
  if (!gamepads) return

  const gp = gamepads[0]
  if (!gp) return

  input.keys[" "] = gp.buttons[0]?.pressed
  const deadzone = 0.1
  const outerDeadzone = 0.9
  let rawX = gp.axes[0]

  if (Math.abs(rawX) > deadzone) {
    let normalized = Math.sign(rawX) * ((Math.abs(rawX) - deadzone) / (1 - deadzone))
    if (Math.abs(normalized) > outerDeadzone) {
      input.joystickX = Math.sign(normalized)
    } else {
      input.joystickX = normalized
    }
    input.joystickX = Math.sign(rawX) * ((Math.abs(rawX) - deadzone) / (1 - deadzone))
  } else {
    input.joystickX = 0
  }

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

  canvas.addEventListener("touchstart", () => {
    player.hasKeyboard = false
    const mobileControls = document.querySelector('.mobile-contorls')
    mobileControls?.classList.add("hidden")
  })

  window.addEventListener('keydown', e => {
    input.keys[e.key] = true
    if (e.key == 'w' || e.key == 'd' || e.key == 'a' || e.key == 'ArrowUp' || e.key == "ArrowLeft" || e.key == "") {
      // has keyboard
      player.hasKeyboard = true
      const mobileControls = document.querySelector('.mobile-controls')
      mobileControls?.classList.add("hidden")

    }
  })
  window.addEventListener('keyup', e => {
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
    if (e.button == 0) {
      input.down = true
    }
  })
  window.addEventListener('mouseup', (e) => {
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
      div.title = editor.tileset[i].name
      div.dataset.tile = i
      div.dataset.category = editor.tileset[i].category
      categoryBlocks.appendChild(div)
      let img = document.createElement('img')
      img.classList.add('tile-select')
      let src
      if (typeIs(i, 'rotation') || typeIs(i, 'adjacency')) {
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
