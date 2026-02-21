import { importMap, updateMap, createMap } from "./file-utils.js"
import { mode, setMode, input } from "./site.js"
import { state } from "./state.js"
import { canvas, updateCanvasSize, updateTileset } from "./renderer.js"
import { toggleErase, changeSelectedTile, zoomMap, scrollCategoryTiles } from "./editor.js"
import { killPlayer } from "./platformer.js"
const { editor, player } = state

export function toggleEditorUI(on) {
  const grid = document.querySelector(".grid")
  if (on) {
    grid.classList.remove("grid-uihidden")
  } else {
    grid.classList.add("grid-uihidden")
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
    html += `x <input type="number" class="tp-x" value="${stepData.x || 0}"> y <input type="number" class="tp-y" value=${stepData.y || 0}>`
  }
  html += `<img src="/assets/icons/delete.svg" alt="delete" class="delete-step">`
  console.log(html)
  return html
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

  applyButton.addEventListener('click', (e) => {
    console.log(activeTrigger)
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
      newExecuteArray.push(stepData)
    })
    console.log(newExecuteArray)
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

  document.addEventListener('wheel', (e) => {
    if (e.wheelDelta > 0) {
      scrollCategoryTiles(true)
    } else {
      scrollCategoryTiles(false)
    }
  })

  window.addEventListener('resize', () => {
    updateCanvasSize()
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
      toggleErase()
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
