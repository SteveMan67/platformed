import { createMap } from "./platformer.js"
import { mode, state } from "./site.js"
import { ctx } from "./renderer.js"
import { canvas } from "./renderer.js"
import { toggleErase, changeSelectedTile, zoomMap, scrollCategoryTiles } from "./editor.js"

const { player, editor } = state

export function toggleEditorUI(on) {
  const grid = document.querySelector(".grid")
  if (on) {
    grid.classList.remove("grid-uihidden")
  } else {
    grid.classList.add("grid-uihidden")
  }
  updateCanvasSize()
  console.log(player.vx)
}

export function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  ctx.imageSmoothingEnabled = false
  canvas.style.imageRendering = 'pixelated'
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

// page event listeners
const eraserButton = document.querySelector('.eraser')
const saveButton = document.querySelector('.save')
const importButton = document.querySelector('.import')
const tileSelection = document.querySelector('.tile-selection')
const zoomIn = document.querySelector('.plus')
const zoomOut = document.querySelector('.minus')
const categories = document.querySelectorAll('.category')
const play = document.querySelector(".play")

const jumpHeightSlider = document.querySelector('#jump-height-input')
const verticalInertiaSlider = document.querySelector('#vertical-inertia-input')
const jumpWidthSlider = document.querySelector('#jump-width-input')
const horizontalInertiaSlider = document.querySelector('#horizontal-inertia-input')
const bouncePadHeightSlider = document.querySelector('#bounce-pad-height-input')
const zoomSlider = document.getElementById('zoom-level-input')

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
  mode = mode === 'editor' ? 'play' : 'editor'
    if (mode == 'play') {
        initPlatformer()
        play.src = "./assets/icons/stop_noborder.svg"
    } else {
        initEditor()
        play.src = "./assets/icons/play_nofill.svg"
    }
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

saveButton.addEventListener('click', () => {
  const json = createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles))
  const text = JSON.stringify(json, null, 2)
  const blob = new Blob([text], {type: 'application/json'})
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
  if (e.key == 'e') {
    toggleErase()
  } else if (e.key == 'p') {
    mode = mode === 'editor' ? 'play' : 'editor'
    if (mode == 'play') {
      initPlatformer()
    } else {
      initEditor()
    }
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
  }
})

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