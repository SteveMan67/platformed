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

function toggleErase() {
  if (editor.selectedTile == 0) {
    editor.selectedTile = editor.lastSelectedTile
  } else {
    editor.lastSelectedTile = editor.selectedTile
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

function sortByCategory(category) {
  let tileCount = 0
  const tileSelects = document.querySelectorAll('.tile-select-container')
  tileSelects.forEach(tileSelect => {
    if (tileSelect.dataset.category == category) {
      tileSelect.style.display = 'block'
      tileCount++
    } else {
      tileSelect.style.display = 'none'
    }
  })
  updateCanvasSize()
  return tileCount
}

// page event listeners
const eraserButton = document.querySelector('i.fa-solid.fa-eraser')
const saveButton = document.querySelector('i.fa-regular.fa-floppy-disk')
const importButton = document.querySelector('i.fa-solid.fa-file-import')
const tileSelection = document.querySelector('.tile-selection')
const zoomIn = document.querySelector('i.fa-solid.fa-plus')
const zoomOut = document.querySelector('i.fa-solid.fa-minus')
const categories = document.querySelectorAll('.category')

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

window.addEventListener('resize', () => {
  updateCanvasSize()
})

zoomIn.addEventListener('click', () => {
  zoomMap(false)
})

zoomOut.addEventListener('click', () => {
  zoomMap(true)
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
    console.log("switching modes")
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
    try {
      const json = JSON.parse(reader.result)
      const tileLayer = json.layers.find(l => l.type === 'tilelayer')
      let raw = decodeRLE(tileLayer.data)
      raw = raw.map(id => id << 4)
      editor.width = json.width
      editor.height = json.height
      let tiles = calculateAdjacencies(raw, json.width, json.height)
      tiles = new Uint16Array(tiles)
      const map = {
        tiles, 
        w: json.width,
        h: json.height
      }
      editor.map = map
    } catch {
      console.error('invalid map file')
    }
  }
  reader.readAsText(file)
}

function loadMap(path) {
  return fetch(path)
    .then(response => response.json())
    .then(json => {
      const tileLayer = json.layers.find(l => l.type === "tilelayer")
      const raw = decodeRLE(tileLayer.data)
      if (raw.length !== json.width * json.height) {
        console.warn('readData: data length not expected value', raw.length, json.width * json.height)
      }
      raw = raw.map(id => id << 4)
      editor.width = json.width
      editor.height = json.height
      let tiles = calculateAdjacencies(raw, json.width, json.height)
      tiles = new Uint16Array(tiles)
      const map = {
        tiles, 
        w: json.width,
        h: json.height
      }
      return map
    })
}

function createMap(width, height, data) {
  const json = {}
  json.width = width
  json.height = height
  json.layers = []
  let rle = []
  let runVal = data[0] >> 4
  let runCount = 1
  for (let i = 1; i < data.length; i++) {
    const v = data[i] >> 4
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
  let mapLayer = {
    "type": "tilelayer",
    "name": "level",
    "data": rle
  }
  json.layers.push(mapLayer)
  return json
}

function getVariant(num) {
  return num >> 4
}

function getTileId(num) {
  return num & 15
}

async function loadTileset(manifestPath) {
  return fetch(manifestPath)
    .then(res => res.json())
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

      return Promise.all(promises)
        .then(items => {
          const tileset = []
          items.forEach(item => {
            tileset[item.id] = item
          })
          return tileset
        })
    })
}


let mode = "editor"

const player = {
  cam: {x: 0, y: 0},
  vy: 0,
  vx: 0, 
  xInertia: 1.5,
  yInertia: 2,
  x: 0, 
  y: 0,
  speed: 10,
  jump: 22,
  w: 30,
  h: 30,
  stopThreshold: 0.4,
  grounded: false,
  coyoteTime: 5,
  coyoteTimer: 0,
  jumpBuffer: 3,
  jumpBufferTimer: 0,
  tileSize: 64,
  lastCheckpointSpawn: {x: 0, y: 0},
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
  lastSelectedTile: 1,
  map: null,
  width: 100,
  height: 50,
  tileset: [],
  limitedPlacedTiles: []
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
  console.log(tileset, newTileset)
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
  for (let i = 1; i < editor.tileset.length; i++) {
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
      editor.selectedTile = Number(div.dataset.tile)
    })
  }
  sortByCategory("")
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

  loadTileset('assets/tileset.JSON').then(images => {
    editor.tileset = splitStripImages(images)
    editor.map = {
      w: 100, h: 50, tiles: new Uint16Array(5000)
    }
    addTileSelection()
    updateCanvasSize()
    levelEditorLoop()
  })
}

function initEditor() {
  levelEditorLoop()
}

function initPlatformer() {
  player.w = 0.9 * player.tileSize
  player.h = 0.9 * player.tileSize
  const ratio = player.tileSize / 64
  player.jump = 22 * ratio
  player.xInertia = 1.5 * ratio
  player.yInertia = 2 * ratio
  player.speed = 10 * ratio
  player.stopThreshold = 0.4 * ratio
  player.x = editor.playerSpawn.x * player.tileSize
  player.y = editor.playerSpawn.y * player.tileSize
  platformerLoop()
}

function drawMap(tileSize = editor.tileSize) {
  const { map, cam, tileset} = editor
  
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
      if (editor.tileset[tileId].mechanics && editor.tileset[tileId].mechanics.includes("hidden") && mode == 'play') {
        showTile = false
      }
      if (selectedTile.type == 'adjacency' && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize)
      } else if (selectedTile.type == "rotation" && showTile) {
        ctx.drawImage(selectedTile.images[raw & 15], scrX, scrY, tileSize, tileSize)
      } else if (selectedTile.type == 'standalone' && showTile) {
        ctx.drawImage(selectedTile.image, scrX, scrY, tileSize, tileSize)
      }
    }
  } 
}

function killPlayer() {
  console.log(editor.playerSpawn)
  player.vy = 0
  player.vx = 0
  if (player.lastCheckpointSpawn.y !== 0 && player.lastCheckpointSpawn.x !== 0) {
    player.x = editor.lastCheckpointSpawn.x * player.tileSize
    player.y = editor.lastCheckpointSpawn.y * player.tileSize
  } else {
    player.x = editor.playerSpawn.x * player.tileSize
    player.y = editor.playerSpawn.y * player.tileSize
  }
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

function mechanics(tileId, tx, ty, x, y, w, h) {
  const mechanics = editor.tileset[tileId].mechanics
  if (!mechanics) return
  if (mechanics.includes("killOnTouch")) {
    if (checkPixelCollsion(tileId, tx, ty, x, y, w, h)) {
      killPlayer()
    }
  }
}

function checkCollision(x, y, w, h) {
  const startX = Math.floor(x / player.tileSize)
  const endX = Math.floor((x + w - 0.01) / player.tileSize)
  const startY = Math.floor(y / player.tileSize)
  const endY = Math.floor((y + h - 0.01) / player.tileSize)

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      if (px < 0 || px >= editor.map.w || py < 0) return true
      const idx = py * editor.map.w + px
      const tileId = editor.map.tiles[idx] >> 4

      const oldX = player.x;
      const oldY = player.y

      mechanics(tileId, px, py, x, y, w, h)
      
      if (player.x !== oldX || player.y !== oldY) return false
      if (tileId !== 0) {
        const tile = editor.tileset[tileId]
        if (tile && tile.mechanics && tile.mechanics.includes("killOnTouch")) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("hidden")) {
          continue
        }
        return true
      }
    }
  }
  return false
}

function updatePhysics() {
  if (player.coyoteTimer > 0) player.coyoteTimer--
  if (player.jumpBufferTimer > 0) player.jumpBufferTimer--

  if (input.keys['w'] || input.keys[' '] || input.keys['ArrowUp']) {
    player.jumpBufferTimer = player.jumpBuffer
  }

  player.vy += 0.7 * player.yInertia

  if (player.vy > player.tileSize * 0.9) {
    player.vy = player.tileSize * 0.9
  }

  if (player.vx < 0) {
    player.vx += player.xInertia * 0.45
  } else if (player.vx > 0) {
    player.vx -= player.xInertia * 0.45
  }
  if (Math.abs(player.vx) < player.stopThreshold) {
    player.vx = 0
  }

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = - player.jump
    player.jumpBufferTimer = 0
    player.coyoteTimer = 0
    player.grounded = false
  }
  if (input.keys['a'] || input.keys['ArrowLeft']) {
    if (player.vx > -player.speed) {
      player.vx -= player.xInertia * 1
    } else {
      player.vx = -player.speed
    }
  }
  if (input.keys['d'] || input.keys['ArrowRight']) {
    if (player.vx < player.speed) {
      player.vx += player.xInertia * 1
    } else {
      player.vx = player.speed
    }
  }

  player.x += player.vx
  if (checkCollision(player.x, player.y, player.w, player.h)) {
    if (player.vx > 0) {
      player.x = (Math.floor((player.x + player.w) / player.tileSize) * player.tileSize) - player.w
    } else if (player.vx < 0) {
      player.x = (Math.floor(player.x / player.tileSize) + 1) * player.tileSize
    }
    player.vx = 0
  }

  player.y += player.vy
  player.grounded = false

  if (checkCollision(player.x, player.y, player.w, player.h)) {
    if (player.vy > 0) {
      player.y = (Math.floor((player.y + player.h) / player.tileSize) * player.tileSize) - player.h
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
}

function platformerLoop() {
  updatePhysics()
  // don't update the camera if the player is in the middle section of the screen
  if (player.x > editor.cam.x + (canvas.width * 0.75)) {
    // moving right
    editor.cam.x = player.x - (canvas.width * 0.75)
  } else if (player.x < editor.cam.x + (canvas.width * 0.25)) {
    // moving left
    editor.cam.x = player.x - (canvas.width * 0.25)
  }
  if (player.y > editor.cam.y + (canvas.height * 0.5)) {
    // moving down
    editor.cam.y = player.y - (canvas.height * 0.5)
  } else if (player.y < editor.cam.y + (canvas.height * 0.25)) {
    // moving up
    editor.cam.y = player.y - (canvas.height * 0.25)
  }

  if (editor.cam.y < 0) {
    editor.cam.y = 0
  } else if (editor.cam.y > (editor.map.h * player.tileSize) - canvas.height) {
    editor.cam.y = (editor.map.h * player.tileSize) - canvas.height
  }

  if (editor.cam.x < 0) {
    editor.cam.x = 0
  } else if (editor.cam.x > (editor.map.w * player.tileSize) - canvas.width) {
    editor.cam.x = (editor.map.w * player.tileSize) - canvas.width
  }

 
  ctx.fillStyle = '#C29A62'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawMap(player.tileSize)

  ctx.fillStyle = 'black'
  ctx.fillRect(player.x - editor.cam.x, player.y - editor.cam.y, player.w, player.h)

  if (mode == 'play') {
    requestAnimationFrame(platformerLoop)
  }
}

let mouseDown = false
let rDown = false
let lastIdx
let once = true

function levelEditorLoop() {
  const { map, cam, tileSize, tileset} = editor

  const speed = 10
  if (input.keys['w'] && cam.y >= 0) cam.y -= speed
  if (input.keys['s'] && cam.y <= (map.h * tileSize) - canvas.height) cam.y += speed
  if (input.keys['a'] && cam.x >= 0) cam.x -= speed
  if (input.keys['d'] && cam.x <= (map.w * tileSize) - canvas.width) cam.x += speed

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
        }
        console.log(tileLimitPlaced)
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
      console.log(editor.map.tiles[idx] >> 4)
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
        if (tileset[editor.map.tiles[idx] >> 4].type == 'rotation') {
          const currentRotation = editor.map.tiles[idx] & 15
          const newRotation = (currentRotation + 1) % 4
          editor.map.tiles[idx] = (editor.map.tiles[idx] >> 4) + newRotation 
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