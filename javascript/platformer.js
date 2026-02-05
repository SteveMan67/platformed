const canvas = document.querySelector("canvas")
const dpr = window.devicePixelRatio
const ctx = canvas.getContext('2d')
const rect = canvas.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height

ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.imageSmoothingEnabled = false
canvas.style.imageRendering = 'pixelated'

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  ctx.imageSmoothingEnabled = false
  canvas.style.imageRendering = 'pixelated'
}

function toggleEditorUI(on) {
    if (on) {
        console.log("show editor ui")
        grid.className = "grid"
    }
    else {
        console.log("hide editor ui")
        grid.className = "grid-uihidden"
    }
}

function toggleErase() {
  if (editor.selectedTile == 0) {
    editor.selectedTile = editor.lastSelectedTiles[1]
  } else {
    editor.selectedTile = 0
  }
}

function zoomMap(zoomDirectionIsIn) {
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

function changeSelectedTile(tileId) {
  console.log(tileId)
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

function scrollCategoryTiles(up) {
  let currentSelectedTiles = document.querySelectorAll(".tile-select-container")
  currentSelectedTiles = Array.from(currentSelectedTiles).filter(f => f.style.display !== "none")
  if (currentSelectedTiles.length !== 0) {
    // moving up works!
    editor.selectedTile = !up ? Number(currentSelectedTiles[(currentSelectedTiles.indexOf(currentSelectedTiles.find(f => f.dataset.tile == String(editor.selectedTile))) + 1) % currentSelectedTiles.length].dataset.tile) : Number(currentSelectedTiles[(currentSelectedTiles.indexOf(currentSelectedTiles.find(f => f.dataset.tile == String(editor.selectedTile))) - 1 + currentSelectedTiles.length) % currentSelectedTiles.length].dataset.tile)
  }
}

function sortByCategory(category) {
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
const grid = document.querySelector(".grid")

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

function decodeRLE(rle) {
  const out = []
  for (let i = 0; i < rle.length; i++) {
    const pair = rle[i]
    if (Array.isArray(pair)) {
      const tile = pair[0]
      const count = pair[1]
      for (let j = 0; j < count; j++) out.push(tile)
    } else {
      out.push(pair)
    }
  }
  return out
}

function importMap(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return 
  const reader = new FileReader()
  reader.onerror = () => console.error('failed to read file', reader.error)
  reader.onload = () => {
    const json = JSON.parse(reader.result)
    console.log(json)
    player.jumpHeight = json.jumpHeight
    jumpHeightSlider.value = json.jumpHeight
    player.jumpWidth = json.jumpWidth
    jumpWidthSlider.value = json.jumpWidth
    player.yInertia = json.yInertia
    verticalInertiaSlider.value = json.yInertia
    player.xInertia = json.xInertia
    horizontalInertiaSlider.value = json.xInertia
    if (json.bouncePadHeight) {
      bouncePadHeightSlider.value = json.bouncePadHeight
      player.bouncePadHeight = json.bouncePadHeight
    }
    if (json.zoom) {
      zoomSlider.value = (json.zoom / (32 / 0.6))
      player.tileSize = json.zoom
    }
    if (json.tilesetPath) {
      updateTileset(json.tilesetPath)
    }
    player.wallJump = json.wallJump
    const tileLayer = json.layers.find(l => l.type === "tilelayer")
    const rotationLayer = json.layers.find(l => l.type === "rotation")
    const rawRotationLayer = decodeRLE(rotationLayer.data)
    let rawTileLayer = decodeRLE(tileLayer.data)
    if (rawTileLayer.length !== json.width * json.height) {
      console.warn('readData: data length not expected value', rawTileLayer.length, json.width * json.height)
    }
    rawTileLayer = rawTileLayer.map(id => id << 4)
    rawTileLayer = calculateAdjacencies(rawTileLayer, json.width, json.height)
    for (let i = 0; i < rawTileLayer.length; i++) {
      if (editor.tileset[rawTileLayer[i] >> 4].type == "rotation") {
        rawTileLayer[i] += rawRotationLayer[i]
      }
      if (editor.tileset[rawTileLayer[i] >> 4].mechanics && editor.tileset[rawTileLayer[i] >> 4].mechanics.includes("spawn")) {
        editor.playerSpawn.y = Math.floor(i / json.width)
        editor.playerSpawn.x = i % json.width
      }
    }
    editor.width = json.width
    editor.height = json.height
    tiles = new Uint16Array(rawTileLayer)
    const map = {
      tiles, 
      w: json.width,
      h: json.height
    }
    editor.map = map
  }
  reader.readAsText(file)
}

function loadMap(path) {
  return fetch(path)
    .then(response => response.json())
    .then(json => {
      const tileLayer = json.layers.find(l => l.type === "tilelayer")
      const rotationLayer = json.layers.find(l => l.type === "rotation")
      const rawRotationLayer = decodeRLE(rotationLayer)
      const rawTileLayer = decodeRLE(tileLayer.data)
      if (rawTileLayer.length !== json.width * json.height) {
        console.warn('readData: data length not expected value', rawTileLayer.length, json.width * json.height)
      }
      rawTileLayer = rawTileLayer.map(id => id << 4)
      for (let i = 0; i < rawTileLayer.length; i++) {
        if (editor.tileset[rawTileLayer[i] >> 4].type == "rotation") {
          rawTileLayer[i] = rawTileLayer[i] + rawRotationLayer[i]
        }
      }
      editor.width = json.width
      editor.height = json.height
      let tiles = calculateAdjacencies(rawTileLayer, json.width, json.height)
      tiles = new Uint16Array(tiles)
      const map = {
        tiles, 
        w: json.width,
        h: json.height
      }
      return map
    })
}

function encodeRLE(list) {
  const rle = []
  let runVal = list[0]
  let runCount = 1
  for (let i = 1; i < list.length; i++) {
    const v = list[i]
    if (v === runVal) {
      runCount++
    } else {
      if (runCount === 1) {
        rle.push(runVal)
      } else {
        rle.push([runVal, runCount])
      }
      runVal = v
      runCount = 1
    }
  }
  if (runCount == 1) {
    rle.push(runVal)
  } else {
    rle.push([runVal, runCount])
  }
  return rle
}

function createMap(width, height, data) {
  const json = {}
  json.width = width
  json.height = height
  json.jumpHeight = player.jumpHeight
  json.yInertia = player.yInertia
  json.jumpWidth = player.jumpWidth
  json.xInertia = player.xInertia
  json.wallJump = player.wallJump
  json.bouncePadHeight = player.bouncePadHeight
  json.zoom = player.tileSize
  json.tilesetPath = editor.tilesetPath
  json.layers = []
  const tileIdRLE = encodeRLE(data.map(id => id >> 4))
  let mapLayer = {
    "type": "tilelayer",
    "name": "level",
    "data": tileIdRLE
  }
  json.layers.push(mapLayer)

  // encode layer with 2 bits of rotation data, 0-3 and run length encode it
  let rotationList = []
  for (let i = 0; i < data.length; i++) {
    if (editor.tileset[data[i] >> 4].type == "rotation") {
      rotationList.push(data[i] & 3)
    } else {
      rotationList.push(0)
    }
  }
  const rotationRLE = encodeRLE(rotationList)
  let rotationLayer = {
    "type": "rotation",
    "data": rotationRLE
  }
  json.layers.push(rotationLayer)
  return json
}

function getVariant(num) {
  return num >> 4
}

function getTileId(num) {
  return num & 15
}

function loadPlayerSprites(playerImg) {
  if (!playerImg) return 
  const h = playerImg.naturalHeight
  const w = playerImg.naturalWidth
  const sprites = []

  const count = Math.floor(w / h)
  for (let i = 0; i < count; i++) {
    const c = document.createElement('canvas')
    c.width = h
    c.height = h
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(playerImg, i *h, 0, h, h, 0, 0, h, h)
    sprites.push(c)
  }
  player.sprites = sprites
}

async function loadTileset(manifestPath) {
  return fetch(manifestPath)
  .then(response => response.json())
  .then(manifest => {
    
    const promises = manifest.tiles.map(tileData => {
      
      if (!tileData.file) return Promise.resolve(tileData)
        return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = manifest.path + tileData.file
      img.onload = () => resolve({...tileData, image: img})
      img.onerror = reject
    })
  })
  
      const characterPromise = new Promise((resolve) => {
        if (!manifest.characterFile) return resolve(null)
          const img = new Image()
        img.src = manifest.path + manifest.characterFile
        img.onload = () => resolve(img) 
        img.onerror = () => resolve(null)
      })
      
      return Promise.all([Promise.all(promises), characterPromise])
      .then(([items, characterImage]) => {
        const tileset = []
        items.forEach(item => {
          tileset[item.id] = item
        })
        return { tileset, characterImage }
        })
    })
}


let mode = "editor"

const enemies = []

const player = {
  dieCameraTime: 30, // frames
  dieCameraTimer: 30,
  dieCameraStart: {},
  died: false,
  collectedCoins: 0,
  collectedCoinList: [],
  cam: {x: 0, y: 0},
  vy: 0,
  vx: 0, 
  jumpHeight: 2.5,
  yInertia: 1,
  jumpWidth: 7,
  xInertia: 1.5,
  bouncePadHeight: 8,
  x: 0, 
  y: 0,
  w: 30,
  h: 30,
  stopThreshold: 0.4,
  grounded: false,
  coyoteTime: 5,
  coyoteTimer: 0,
  wallCoyoteTime: 10,
  wallCoyoteTimer: 0,
  lastWallSide: 0,
  jumpBuffer: 10,
  jumpBufferTimer: 0,
  tileSize: 64,
  lastCheckpointSpawn: {x: 0, y: 0},
  facingLeft: 1,
  AnimationFrame: 0,
  AnimationFrameCounter: 0,
  wallJump: "up",
  decreaseAirControl: true,
  autoJump: false,
  controlTimer: 0,
  controlMultiplier: 1,
  dissipations: [] // each item has a timeToDissapate, timeToReturn, timer, and tileIdx
}

const editor = {
  cam: {
    x: 0,
    y: 0
  },
  currentRotation: 0,
  playerSpawn: {x: 0, y: 0},
  tileSize: 32,
  selectedTile: 1,
  lastSelectedTiles: [2, 1], // [1] is the current selected tile
  map: null,
  width: 100,
  height: 50,
  tileset: [],
  limitedPlacedTiles: [],
  tilesetPath: "./assets/medium.json",
  dissipateTime: 2 * 60,
  dissipateDelay: 2 * 60,
}

const input = {
  x: 0,
  y: 0,
  down: false,
  keys: {}
}

function isStrip(img) {
  if (img) {
    const w = img.naturalWidth, h = img.naturalHeight
    if (w && h) {
      return w == h * 16
    }
  }
}

function splitStripImages(tileset) {
  // split strip images 
  const newTileset = []
  tileset.forEach(tile => {
    if (!tile) return
    if (tile.type === 'adjacency' && tile.image) {
      // split the strip into different pieces here 
      const h = tile.image.naturalHeight
      const w = tile.image.naturalWidth
      const sublist = []
      for (let i = 0; i < 16; i++) {
        const c = document.createElement('canvas')
        c.width = h
        c.height = h
        const ctx = c.getContext('2d')
        ctx.drawImage(tile.image, i * h, 0, h, h, 0, 0, h, h)

        sublist.push(c)
      }
      newTileset[tile.id] = { ...tile, images: sublist }
    } else if (tile.type == 'rotation') {
      const h = tile.image.naturalHeight
      const w = tile.image.naturalWidth
      const sublist = []
      if (w == h * 4) {
        for (let i = 0; i < 4; i++) {
          const c = document.createElement('canvas')
          c.width = h
          c.height = h
          const ctx = c.getContext('2d')
          ctx.drawImage(tile.image, i * h, 0, h, h, 0, 0, h, h)
          sublist.push(c)
        }
        newTileset[tile.id] = { ...tile, images: sublist }
      } else if (w == h * 8) {
        for (let i = 0; i < 8; i++) {
          const c = document.createElement('canvas')
          c.width = h
          c.height = h
          const ctx = c.getContext('2d')
          ctx.drawImage(tile.image, i * h, 0, h, h, 0, 0, h, h)
          sublist.push(c)
        }
        newTileset[tile.id] = { ...tile, images: sublist }
      }
    } else {
      newTileset[tile.id] = tile
    }
  })
  return newTileset
}

function getMechanics(idx) {
  let outList = []
  if (idx >= 0 && idx < (editor.width * editor.height)) {
    const tilesetItem = editor.tileset[editor.map.tiles[idx] >> 4]
    if (tilesetItem.id == 0 || !tilesetItem.mechanics) return outList
    outList = [...tilesetItem.mechanics]
    return outList
  } else {
    return outList
  } 
}

function calculateAdjacencies(tiles, w, h) {
  let out = []
  // calculate all the adjacencies in a given level
  for (let i = 0; i < w * h; i++) {
    const raw = tiles[i]
    if (!raw) {
      out.push(0)
      continue
    }
    const baseId = raw >> 4
    out.push(calculateAdjacency(i, baseId, tiles))
  }
  return out
}

function calculateAdjacency(tileIdx, tileId, tiles = editor.map.tiles) {
  // calculate the adjacency for a given tile when it's placed
  // bug: walls other than the top and bottom don't work
  let variant = 0

  tileId = (typeof tileId == 'number') ? tileId : tiles[tileIdx] >> 4
  if (tileId == 0) return 0

  if (editor.tileset[tileId].type == 'rotation') {
    return tileId << 4
  }

  const getNeighborId = (idx) => {
    const val = tiles[idx]
    return val ? val >> 4 : 0
  }
  

  const check = (idx) => {
    const nid = getNeighborId(idx)
    if (nid === 0) return false
    const t = editor.tileset[nid]
    return t && t.triggerAdjacency
  }
  // top
  if (tileIdx - editor.width >= 0) {
    if (check(tileIdx - editor.width)) variant += 1
  } else {
    variant += 1
  }
  // right
  if (tileIdx + 1 < tiles.length) {
    if (check(tileIdx + 1)) variant += 2
  } else {
    variant += 2
  }
  // bottom
  if (tileIdx + editor.width < tiles.length) {
    if (check(tileIdx + editor.width)) variant += 4
  } else {
    variant += 4
  }
  // left
  if (tileIdx - 1 >= 0) {
    if (check(tileIdx - 1)) variant += 8
  } else {
    variant += 8
  }

  return (tileId * 16) + variant

}

function calcAdjacentAdjacency(centerTileIdx) {
  const tiles = editor.map.tiles
  const centerVal = calculateAdjacency(centerTileIdx, editor.selectedTile)
  tiles[centerTileIdx] = centerVal
  const w = editor.width
  const neighbors = []
  if (centerTileIdx - w >= 0) neighbors.push(centerTileIdx - w)
  if ((centerTileIdx % w) < w - 1 && centerTileIdx + 1 < tiles.length) neighbors.push(centerTileIdx + 1)
  if ((centerTileIdx % w) > 0 && centerTileIdx - 1 >= 0) neighbors.push(centerTileIdx - 1)
  if (centerTileIdx + w < tiles.length) neighbors.push(centerTileIdx + w)
  
  neighbors.forEach(n => {
    const tileId = tiles[n] >> 4
    if (tileId !== 0 && editor.tileset[tileId].type == 'adjacency') {
      tiles[n] = calculateAdjacency(n)
    }
  })

  return centerVal
}

function updateLevelSize(width, height) {
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
}

function addTileSelection() {
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

function updateTileset(path) {
  editor.tilesetPath = path
  loadTileset(editor.tilesetPath).then(({tileset, characterImage}) => {
    editor.tileset = splitStripImages(tileset)
    loadPlayerSprites(characterImage)
    addTileSelection()
  })
}

function init() {
  window.addEventListener('keydown', e => input.keys[e.key] = true)
  window.addEventListener('keyup', e => input.keys[e.key] = false)

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect()
    input.x = e.clientX - rect.left
    input.y = e.clientY - rect.top
  })
  canvas.addEventListener('mousedown', () => input.down = true)
  canvas.addEventListener('mouseup', () => input.down = false)

  loadTileset(editor.tilesetPath).then(({tileset, characterImage}) => {
    editor.tileset = splitStripImages(tileset)
    loadPlayerSprites(characterImage)
    editor.map = {
      w: 100, h: 50, tiles: new Uint16Array(5000)
    }
    addTileSelection()
    updateCanvasSize()
    levelEditorLoop()
  })
}


function initEditor() {
  toggleEditorUI(true)

  enemies.forEach(enemy => 
    enemies.pop()
  )
  lastTime = 0
  mode = "editor"
  ctx.imageSmoothingEnabled = false
  levelEditorLoop()
}

function getJumpHeight(heightInTiles, yInertia, tileSize) {
  const gravity = (0.7 * yInertia) + 0.5
  const heightInPixels = heightInTiles * tileSize
  return Math.sqrt(2 * gravity * heightInPixels)
}

function getJumpSpeed(jumpLengthInTiles, jumpForce, yInertia, tilesize) {
  const gravity = (0.7 * yInertia) + 0.5
  let vy = -jumpForce
  let y = 0
  let frames = 0

  while (y <= 0) {
    y += vy
    vy += gravity
    frames++ 
  }

  const distance = jumpLengthInTiles * player.tileSize
  return distance / frames
}

function scanLevelOnPlay() {
  // enemies
  const tiles = editor.map.tiles
  for (let i = 0; i < tiles.length; i++) {
    const raw = tiles[i]
    const tileId = raw >> 4
    if (tileId != 0 && editor.tileset[tileId] && editor.tileset[tileId].type == "enemy") {
      console.log(raw)
      const ty = Math.floor(i / editor.map.w)
      const tx = i % editor.map.w
      const worldY = ty * player.tileSize
      const worldX = tx * player.tileSize
      const enemy = {
        x: worldX,
        y: worldY,
        vx: 0,
        vy: 0,
        tileId: tileId,
        speed: 5,
        direction: 1
      }
      enemies.push(enemy)
    }
  }
}

function initPlatformer() {
  toggleEditorUI(false)

  lastTime = 0
  player.w = player.tileSize
  player.h = player.tileSize
  player.hitboxW = 0.8 * player.tileSize
  player.hitboxH = 0.8 * player.tileSize
  const ratio = player.tileSize / 64
  // !! changes on save/load and gets higher and higher if tilesize != 0 !!!!!!
  console.log(player.jumpHeight + 0.3, player.yInertia, player.tileSize)
  player.jump = getJumpHeight(player.jumpHeight + 0.3, player.yInertia, player.tileSize)
  player.speed = getJumpSpeed(player.jumpWidth - 1, player.jump, player.yInertia, player.tileSize)
  player.stopThreshold = 0.4 * ratio
  player.x = editor.playerSpawn.x * player.tileSize
  player.y = editor.playerSpawn.y * player.tileSize
  player.lastCheckpointSpawn = { x: 0, y: 0 }
  player.collectedCoinList = []
  scanLevelOnPlay()
  platformerLoop()
}

function drawMap(tileSize = editor.tileSize, cam = editor.cam) {
  const { map, tileset} = editor
  
  const startX = Math.floor(cam.x / tileSize)
  const endX = startX + (canvas.width / tileSize) + 1
  const startY = Math.floor(cam.y / tileSize)
  const endY = startY + (canvas.width / tileSize) + 1
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (x < 0 || x >= map.w || y < 0 || y >= map.h) continue
      const raw = map.tiles[y * map.w + x]
      const tileId = raw >> 4
      const scrX = Math.floor((x * tileSize) - cam.x)
      const scrY = Math.floor((y * tileSize) - cam.y)
      const selectedTile = tileset[tileId]
      let showTile = true
      if (editor.tileset[tileId] && editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("hidden") && mode == 'play') {
        showTile = false
      }
      if (player.collectedCoinList.includes(y * map.w + x) && mode === 'play') {
        showTile = false
      }
      if (selectedTile.type == 'enemy' && mode == 'play') {
        showTile = false
      }
      if (selectedTile.type == 'adjacency' && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize)
      } else if (selectedTile.type == "rotation" && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize)
      } else if (selectedTile.type == 'standalone' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize)
      } else if (selectedTile.type == 'enemy' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize)
      }
    }
  } 
}

function killPlayer() {
  player.vy = 0
  player.vx = 0
  player.died = true
  player.dieCameraTimer = player.dieCameraTime
  player.dieCameraStart = { x: player.cam.x, y: player.cam.y}
  if (player.lastCheckpointSpawn.y !== 0 && player.lastCheckpointSpawn.x !== 0) {
    player.x = player.lastCheckpointSpawn.x * player.tileSize
    player.y = player.lastCheckpointSpawn.y * player.tileSize
  } else {
    player.x = editor.playerSpawn.x * player.tileSize
    player.y = editor.playerSpawn.y * player.tileSize
  }
}

function endLevel() {
  mode = "editor"
  setTimeout(initEditor, 1)
}

const tileMaskCache = new Map()

function checkPixelCollsion(tileId, tx, ty, px, py, pw, ph) {
  let mask = tileMaskCache.get(tileId)
  if (!mask) {
    const tile = editor.tileset[tileId]
    if (!tile) return false

    let img = tile.image
    if (!img && tile.images && tile.images[0]) img = tile.images[0]
    if (!img) return false

    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    mask = { w: c.width, h: c.height, data: data }
    tileMaskCache.set(tileId, mask)
  }

  const tileWorldX = tx * player.tileSize
  const tileWorldY = ty * player.tileSize

  const intersectionLeft = Math.max(px, tileWorldX)
  const intersectionTop = Math.max(py, tileWorldY)
  const intersectionRight = Math.min(px + pw, tileWorldX + player.tileSize)
  const intersectionBottom = Math.min(py + ph, tileWorldY + player.tileSize)

  if (intersectionLeft >= intersectionRight || intersectionTop >= intersectionBottom) return false

  for (let y = intersectionTop; y < intersectionBottom; y += 2) {
    for (let x = intersectionLeft; x < intersectionRight; x += 2) {
      const localX = Math.floor((x - tileWorldX) / player.tileSize * mask.w)
      const localY = Math.floor((y - tileWorldY) / player.tileSize * mask.h)

      const index = (localY * mask.w + localX) * 4 + 3
      if (mask.data[index] > 10) {
        return true;
      }
    }
  }
  return false
} 

function mechanics(dt, tileIdx, tileId, tx, ty, x, y, w, h) {
  const mechanics = editor.tileset[tileId].mechanics
  if (!mechanics) return
  if (mechanics.includes("killOnTouch")) {
    if (checkPixelCollsion(tileId, tx, ty, x, y, w, h)) {
      killPlayer()
    }
  }
  if (mechanics.includes("end")) {
    endLevel()
  }
  if (mechanics.includes("bouncePad")) {
    if (checkPixelCollsion(tileId, tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx
      const bounceTile = editor.map.tiles[idx]
      console.log(idx, bounceTile, bounceTile & 15)
      if ((bounceTile & 15) == 0) {
        player.vy = -getJumpHeight(player.bouncePadHeight, player.yInertia, player.tileSize)
      } else if ((bounceTile & 15) == 1){
        player.vx = -getJumpHeight(player.bouncePadHeight, player.xInertia, player.tileSize)
      } else if ((bounceTile & 15) == 2) {
        player.vy = getJumpHeight(player.bouncePadHeight, player.yInertia, player.tileSize)
      } else if ((bounceTile & 15) == 3) {
        player.vx = getJumpHeight(player.bouncePadHeight, player.xInertia, player.tileSize)
      }
    }
  }
  if (mechanics.includes("checkpoint")) {
    player.lastCheckpointSpawn = { x: tx, y: ty }
  }
  if (mechanics.includes("coin")) {
    if (checkPixelCollsion(tileId, tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx
      player.collectedCoins++
      player.collectedCoinList.push(idx)
    }
  }
  if (mechanics.includes("dissipate")) {
    let dissipation = player.dissipations.find(f => f.tileIdx == tileIdx)
    if (dissipation) {
      if (dissipation.timer > dissipation.timeToDissipate) {
        dissipation.timer -= dt
      } else if (dissipation.timer <= 0) {
        dissipation.timer = dissipation.timeToReturn
      }
    } else {
      // initialize the dissipation
      dissipation = {
        timeToDissipate: editor.dissipateTime,
        timeToReturn: editor.dissipateTime + editor.dissipateDelay,
        timer: editor.dissipateTime + editor.dissipateDelay,
        tileIdx: tileIdx
      }
      player.dissipations.push(dissipation)
    }
  }
}

function checkCollision(dt, x, y, w, h, simulate = false) {
  const startX = Math.floor(x / player.tileSize)
  const endX = Math.floor((x + w - 0.01) / player.tileSize)
  const startY = Math.floor(y / player.tileSize)
  const endY = Math.floor((y + h - 0.01) / player.tileSize)

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      if ((px < 0 || px >= editor.map.w || py < 0) && !simulate) return true
      const idx = py * editor.map.w + px
      const tileId = editor.map.tiles[idx] >> 4

      const oldX = player.x;
      const oldY = player.y

      if (!player.collectedCoinList.includes(idx) && !simulate) mechanics(dt, idx, tileId, px, py, x, y, w, h)
      
      if (player.x !== oldX || player.y !== oldY) return false
      if (tileId !== 0) {
        const tile = editor.tileset[tileId]
        if (tile && tile.mechanics && tile.mechanics.includes("killOnTouch")) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("hidden")) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("bouncePad")) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("noCollision")) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("pixelCollision")) {
          return checkPixelCollsion(tileId, px,py, x, y, w, h)
        }
        if (tile && tile.mechanics && tile.mechanics.includes("dissipate")) {
          console.log(idx)
          const dissipation = player.dissipations.find(d => d.tileIdx === idx)
          if (dissipation && dissipation.timer <= dissipation.timeToDissipate && dissipation.timer > 0) {
            continue
          }
        }
        if (player.collectedCoinList.includes(idx)) continue
        return true
      }
    }
  }
  return false
}

function key(key) {
  if (key === "right") {
    return !!(input.keys["d"] || input.keys["ArrowRight"] )
  } else if (key === "left") {
    return !!(input.keys["a"] || input.keys["ArrowLeft"])
  } else if (key === "up") {
    return !!(input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"])
  } else if (key === "down") {
    return !!(input.keys['s'] || input.keys['ArrowDown'])
  } else if (key === "any") {
    return !!(input.keys["d"] || input.keys["ArrowRight"] || input.keys["a"] || input.keys["ArrowLeft"] || input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"])
  } else {
    return false
  }
}

function limitControl(time, multiplier) {
  if (multiplier == 1) {
    player.controlTimer = 0
    player.controlMultiplier = 0
  }

  if (time > player.controlTimer) {
    player.controlTimer = time
    player.controlMultiplier = multiplier
  }
}

let lastJumpInput = false;
function updatePhysics(dt) {
  if (player.coyoteTimer > 0) player.coyoteTimer -= dt
  if (player.jumpBufferTimer > 0) player.jumpBufferTimer -= dt

  //determine whether jump was just pressed down
  let isJumping = false;
  if (input.keys['w'] || input.keys[' '] || input.keys['ArrowUp']) {
    if (!lastJumpInput) {
      player.jumpBufferTimer = player.jumpBuffer;
      player.wallCoyoteTimer = 0
      lastJumpInput = true;
      isJumping = true;
    }
  } else {
      lastJumpInput = false;
      isJumping = false;
  }

  if (player.controlTimer > 0) {
    player.controlTimer -= dt
  } else {
    player.controlMultiplier = 1
  }

  player.vy += ((0.7 * player.yInertia) + 0.5) * dt
  
  if (player.vy > player.tileSize * 0.9) {
    player.vy = player.tileSize * 0.9
  }
  
  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = - player.jump
    player.jumpBufferTimer = 0
    player.coyoteTimer = 0
    player.grounded = false
  }
  const jumpControl = player.decreaseAirControl && !player.grounded ? 1 : 1
  const currentControl = jumpControl * player.controlMultiplier
  let activeInput = false
  if (key("left")) {
    activeInput = true
    if (player.vx > -player.speed) {
      player.vx -= player.xInertia * 1 * currentControl * dt
    } else {
      player.vx = -player.speed
    }
  }
  if (key("right")) {
    activeInput = true
    if (player.vx < player.speed) {
      player.vx += player.xInertia * 1 * currentControl * dt
    } else {
      player.vx = player.speed
    }
  }

  if (!activeInput) {
    if (player.vx < 0) {
      player.vx += player.xInertia * 0.45 * dt
      if (player.vx > 0) player.vx = 0
    } else if (player.vx > 0) {
      player.vx -= player.xInertia * 0.45 * dt
      if (player.vx < 0) player.vx = 0
    }
    if (Math.abs(player.vx) < player.stopThreshold) {
      player.vx = 0
  }
  }

  const offX = (player.w - player.hitboxW) / 2
  const offY = (player.h - player.hitboxH)

  player.x += player.vx * dt
  if (checkCollision(dt, player.x + offX, player.y + offY, player.hitboxW, player.hitboxH)) {
    if (player.vx > 0) {
      const hitRight = player.x + offX + player.hitboxW
      player.x = (Math.floor(hitRight / player.tileSize) * player.tileSize) - player.hitboxW - offX
    } else if (player.vx < 0) {
      const hitLeft = player.x + offX
      player.x = ((Math.floor(hitLeft / player.tileSize) + 1) * player.tileSize) - offX
    }
    player.vx = 0
  }

  player.y += player.vy * dt
  player.grounded = false

  if (checkCollision(dt, player.x + offX, player.y + offY, player.hitboxW, player.hitboxH)) {
    if (player.vy > 0) {
      const hitBottom = player.y + offY + player.hitboxH
      const tileTop = Math.floor(hitBottom / player.tileSize) * player.tileSize
      player.y = tileTop - player.hitboxH - offY 
      player.grounded = true
      player.coyoteTimer = player.coyoteTime
    } else if (player.vy < 0) {
      player.y = (Math.floor(player.y / player.tileSize) + 1) * player.tileSize
    }
    player.vy = 0
  } else {
    player.grounded = false
  }

  if (player.y > editor.map.h * player.tileSize) {
    killPlayer()
  }

  const touchingLeft = checkCollision(dt,player.x + offX - 2, player.y + offY + 2, player.hitboxW, player.hitboxH - 4, true)
  const touchingRight = checkCollision(dt, player.x + offX + 2, player.y + offY + 2, player.hitboxW, player.hitboxH - 4, true)

  // coyote timer
  if (touchingLeft) {
    player.wallCoyoteTimer = player.wallCoyoteTime
    player.lastWallSide = -1
  } else if (touchingRight) {
    player.wallCoyoteTimer = player.wallCoyoteTime
    player.lastWallSide = 1
  } else if (player.wallCoyoteTimer > 0) {
    player.wallCoyoteTimer -= dt
  }

  if (player.grounded) limitControl(0, 1)

  // walljump
  if (!player.grounded && player.wallJump !== "none" && key("any") && player.jumpBufferTimer !== 0 &&  !player.wallCoyoteTimer == 0) {
    if (player.wallJump == "off") {
      if (player.lastWallSide == 1 && key("up")) {
        player.vx = -player.speed
      } else if (player.lastWallSide == -1 && key("up")) {
        player.vx = player.speed
      }
      player.vy = -player.jump
      player.jumpBufferTimer = 0
      player.lastWallSide = 0
      player.wallCoyoteTimer = 0
      player.airControl = true
      limitControl(20, 0.0)
    } else if (player.wallJump == "up") {
      player.vx = player.lastWallSide == -1 ? player.speed * 1.2 : -player.speed * 1.2
      player.vy = -player.jump
      player.jumpBufferTimer = 0
      player.lastWallSide = 0
      player.wallCoyoteTimer = 0
    }
  }


}

function drawPlayer(dt) {
  player.AnimationFrameCounter += dt
  if (player.AnimationFrameCounter > 5) {
    player.AnimationFrame = player.AnimationFrame == 0 ? 1 : 0
    player.AnimationFrameCounter = 0
  }
  if (!player.sprites) return
  let selectedFrame = 0
  if ((input.keys["a"] || input.keys["ArrowLeft"]) && (input.keys["d"] || input.keys["ArrowRight"])) {
    // pressing both keys, don't rapidly switch between frames

  } else if (!player.facingLeft && (input.keys["a"] || input.keys["ArrowLeft"])) {
    player.facingLeft = 1
  } else if (player.facingLeft && (input.keys["d"] || input.keys["ArrowRight"])) {
    player.facingLeft = 0
  }
  if (player.grounded) {
    // has to be one of the first 6
      if ((input.keys["a"] || input.keys["ArrowLeft"]) && (input.keys["d"] || input.keys["ArrowRight"])) {
      // pressing both keys, don't rapidly switch between frames

      } else if (input.keys["a"] || input.keys["d"] || input.keys["ArrowRight"] || input.keys["ArrowLeft"]) {
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

function getCameraCoords() {
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
  return {x: x, y: y}
}

function aabbIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function handleEnemyCollision(enemy, dt) {
  const offX = (player.w - player.hitboxW) / 2
  const offY = (player.h - player.hitboxH) 
  const px = player.x + offX
  const py = player.y + offY
  const pw = player.hitboxW
  const ph = player.hitboxH

  const ex = enemy.x
  const ey = enemy.y
  const ew = player.tileSize
  const eh = player.tileSize

  if (!aabbIntersect(px,py,pw,ph,ex,ey,ew,eh)) return false

  if (py < ey) {
    // player stomped on enemy
    player.vy = -getJumpHeight(5, player.yInertia, player.tileSize)
    return true
  } else {
    killPlayer()
  }
  return false
}

function updateEnemyPhysics(dt) {
  const gravity = (0.7 * player.yInertia) + 0.5
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]
    enemy.vy += gravity * dt
    enemy.vx = enemy.speed * enemy.direction
    enemy.x += enemy.vx * dt
    if (checkCollision(dt, enemy.x, enemy.y, player.tileSize, player.tileSize)) {
      if (enemy.vx > 0) {
        const hitright = enemy.x + player.tileSize
        enemy.x = (Math.floor(hitright / player.tileSize) * player.tileSize) - player.tileSize
        enemy.direction *= -1
      } else if (enemy.vx < 0) {
        const hitLeft = enemy.x
        enemy.x = (Math.floor(hitLeft / player.tileSize) + 1) * player.tileSize
        enemy.direction *= -1
      }
      enemy.vx = 0
    } 

    enemy.y += enemy.vy * dt
    enemy.grounded = false

    if (checkCollision(dt, enemy.x, enemy.y, player.tileSize, player.tileSize)) {
      if (enemy.vy > 0) {
        const hitBottom = enemy.y + player.tileSize
        const tileTop = Math.floor(hitBottom / player.tileSize) * player.tileSize
        enemy.y = tileTop - player.tileSize
        enemy.grounded = true
      } else if (enemy.vy < 0) {
        enemy.y = (Math.floor(enemy.y / player.tileSize) + 1) * player.tileSize
      }
      enemy.vy = 0
    }

    if (enemy.y > editor.map.h * player.tileSize) {
      enemies.splice(i, 1)
    }
    if (handleEnemyCollision(enemy)) {
      enemies.splice(i, 1)
    }
  }
}

function drawEnemies(dt) {
  enemies.forEach(enemy => {
    ctx.drawImage(editor.tileset[enemy.tileId].image, enemy.x - player.cam.x, enemy.y - player.cam.y, player.tileSize, player.tileSize)
  })
}

function deltaTime(timestamp) {
  if (!timestamp) timestamp = performance.now()
  if (lastTime === 0) lastTime = timestamp
  const seconds = (timestamp - lastTime) / 1000
  lastTime = timestamp
  return Math.min(seconds, 0.1)
}
let lastTime = 0
function platformerLoop(timestamp) {
  let dt = deltaTime(timestamp)
  let timeScale = dt * 60

  player.dissipations.forEach(dissipation => {
    if (dissipation.timer > 0) {
      dissipation.timer -= timeScale
    }
  })
  if (!player.died) {
    updatePhysics(timeScale)
  }
  updateEnemyPhysics(timeScale)
  // don't update the camera if the player is in the middle section of the screen
  if (!player.died) {
    player.cam.x = getCameraCoords().x
    player.cam.y = getCameraCoords().y
  } else {
    // camera animation to respawn point
    if (player.dieCameraTimer > 0) {
      const progress = 1 - (Math.max(0, player.dieCameraTimer) / player.dieCameraTime)
      const ease = -(Math.cos(Math.PI * progress) - 1) / 2
      const mapW = editor.map.w * player.tileSize
      const mapH = editor.map.h * player.tileSize

      let targetX = getCameraCoords().x
      let targetY = getCameraCoords().y

      player.cam.x = player.dieCameraStart.x + (targetX - player.dieCameraStart.x) * ease
      player.cam.y = player.dieCameraStart.y + (targetY - player.dieCameraStart.y) * ease
      player.dieCameraTimer -= timeScale
    } else {
      player.died = false
    }
  }

  if (player.cam.y < 0) {
    player.cam.y = 0
  } else if (player.cam.y > (editor.map.h * player.tileSize) - canvas.height) {
    player.cam.y = (editor.map.h * player.tileSize) - canvas.height
  }

  if (player.cam.x < 0) {
    player.cam.x = 0
  } else if (player.cam.x > (editor.map.w * player.tileSize) - canvas.width) {
    player.cam.x = (editor.map.w * player.tileSize) - canvas.width
  }

 
  ctx.fillStyle = '#C29A62'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawMap(player.tileSize, player.cam)
  if (!player.died) {
    drawPlayer(timeScale)
  }
  drawEnemies(timeScale)

  if (mode == 'play') {
    requestAnimationFrame(platformerLoop)
  }
}

let mouseDown = false
let rDown = false
let spaceDown = false
let lastIdx
let once = true

function levelEditorLoop(timestamp) {
  let dt = deltaTime(timestamp)
  let timeScale = dt * 60
  const { map, cam, tileSize, tileset} = editor

  const speed = 10
  if ((input.keys['w'] || input.keys["ArrowUp"]) && cam.y >= 0) cam.y -= speed * timeScale
  if ((input.keys['s'] || input.keys["ArrowDown"]) && cam.y <= (map.h * tileSize) - canvas.height) cam.y += speed * timeScale
  if ((input.keys['a'] || input.keys["ArrowLeft"]) && cam.x >= 0) cam.x -= speed * timeScale
  if ((input.keys['d'] || input.keys["ArrowRight"]) && cam.x <= (map.w * tileSize) - canvas.width) cam.x += speed * timeScale
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
            editor.playerSpawn = { x: tx, y: ty}
          }
          if (tileset[editor.selectedTile].mechanics.includes("end")) {
            editor.end = { x: tx, y: ty }
          }
        }
        if (tileset[editor.selectedTile].type == "adjacency" && !tileLimitPlaced) {
          calcAdjacentAdjacency(idx, editor.selectedTile)
        } else if (tileset[editor.selectedTile].type == 'rotation' && !tileLimitPlaced) {
          editor.map.tiles[idx] = (editor.selectedTile * 16) + editor.currentRotation
        } else if (tileset[editor.selectedTile].type == 'empty' ) {
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
  if(selectedTileOfTileset.type == "adjacency") {
    img = selectedTileOfTileset.images[calculateAdjacency(ty * map.w + tx, editor.selectedTile) & 15]
  } else if (selectedTileOfTileset.type == "rotation") {
    img = selectedTileOfTileset.images[editor.currentRotation]
  } else {
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

  if (mode == 'editor') {
    requestAnimationFrame(levelEditorLoop)
  }
}

function logCurrentMapAsJSON() {
  console.log(createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles)))
}

init()