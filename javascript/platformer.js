const canvas = document.querySelector("canvas")
const dpr = window.devicePixelRatio
const ctx = canvas.getContext('2d')
const rect = canvas.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height

ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.imageSmoothingEnabled = false
canvas.style.imageRendering = 'pixelated'

function toggleErase() {
  if (editor.selectedTile == 0) {
    editor.selectedTile = editor.lastSelectedTile
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

// page event listeners
const eraserButton = document.querySelector('i.fa-solid.fa-eraser')
const saveButton = document.querySelector('i.fa-regular.fa-floppy-disk')
const importButton = document.querySelector('i.fa-solid.fa-file-import')
const tileSelection = document.querySelector('.tile-selection')
const zoomIn = document.querySelector('i.fa-solid.fa-plus')
const zoomOut = document.querySelector('i.fa-solid.fa-minus')

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
      const raw = decodeRLE(tileLayer.data)
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
      const promises = manifest.files.map(filename => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.src = manifest.path + filename
          img.onload = () => resolve(img)
          img.onerror = reject
        })
      })

      return Promise.all(promises)
        .then(images => [null, ...images])
    })
}


let mode = "editor"

const player = {
  cam: {x: 0, y: 0},
  vy: 0,
  vx: 0, 
  inertia: 1,
  x: 0, 
  y: 0,
  speed: 4,
  jump: 10,
  w: 30,
  h: 30,
  grounded: false,
  tileSize: 64
}

const editor = {
  cam: {
    x: 0,
    y: 0
  },
  playerSpawn: {x: 0, y: 0},
  lastCheckpointSpawn: {x: 0, y: 0},
  tileSize: 32,
  selectedTile: 1,
  lastSelectedTile: 1,
  map: null,
  width: 100,
  height: 50,
  tileset: []
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
    if (isStrip(tile)) {
      // split the strip into different pieces here 
      const h = tile.naturalHeight
      const w = tile.naturalWidth
      const sublist = []
      for (let i = 0; i < 16; i++) {
        const c = document.createElement('canvas')
        c.width = h
        c.height = h
        const ctx = c.getContext('2d')
        ctx.drawImage(tile, i * h, 0, h, h, 0, 0, h, h)

        sublist.push(c)
      }
      newTileset.push(sublist)
    } else {
      newTileset.push(tile)
    }
  })
  return newTileset
}

function calculateAdjacencies(tiles, w, h) {
  let out = []
  // calculate all the adjacencies in a given level
  for (let i = 0; i < w * h; i++) {
    if (tiles[i] !== 0) {
      out.push(calculateAdjacency(i, tiles[i], tiles))
    } else {
      out.push(0)
    }
  }
  return out
}

function calculateAdjacency(tileIdx, tileId, tiles = editor.map.tiles) {
  // calculate the adjacency for a given tile when it's placed
  // bug: walls other than the top and bottom don't work
  let variant = 0

  tileId = (typeof tileId == 'number') ? tileId : tiles[tileIdx] >> 4
  if (tileId == 0) return 0
  if (tileIdx - editor.width >= 0) {
    if (tiles[tileIdx - editor.width] !== 0) {
      variant += 1
    }
  } else {
    variant += 1
  }
  // right
  if (tileIdx + 1 < tiles.length) {
    if(tiles[tileIdx + 1] !== 0) {
      variant += 2
    }
  } else {
    variant += 2
  }
  // bottom
  if (tileIdx + editor.width < tiles.length) {
    if (tiles[tileIdx + editor.width] !== 0) {
      variant += 4
    }
  } else {
    variant += 4
  }
  // left
  if (tileIdx - 1 >= 0) {
    if(tiles[tileIdx - 1] !== 0) {
      variant += 8
    }
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
    if (tileId !== 0) {
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
  for (let i = 1; i < editor.tileset.length; i++) {
    let img = document.createElement('img')
    img.classList.add('tile-select')
    img.dataset.tile = i
    let src
    if (Array.isArray(editor.tileset[i])) {
      const c = editor.tileset[i][0]
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
      if (editor.tileset[i] instanceof HTMLImageElement) {
        img.src = editor.tileset[i].src
      } else {
        img.src = ''
      }
    }
    tileSelection.appendChild(img)
    img.addEventListener('click', () => {
      editor.selectedTile = Number(img.dataset.tile)
    })
  }
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
    levelEditorLoop()
  })
}

function initEditor() {
  levelEditorLoop()
}

function initPlatformer() {
  player.w = 0.9 * player.tileSize
  player.h = 0.9 * player.tileSize
  player.jump = (0.15625 * player.tileSize) + 5
  player.inertia = 1
  player.speed = 5
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
      
      if (tileId > 0 && Array.isArray(tileset[tileId])) {
        ctx.drawImage(tileset[tileId][(raw & 15)], scrX, scrY, tileSize, tileSize)
      } else if (tileId > 0 && !Array.isArray(tileset[tileId])) {
        ctx.drawImage(tileset[tileId], scrX, scrY, tileSize, tileSize)
      }
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
      if (px < 0 || px >= editor.map.w || py < 0 || py >= editor.map.h) continue
      const idx = py * editor.map.w + px
      const tileId = editor.map.tiles[idx] >> 4
      if (tileId !== 0) return true
    }
  }
  return false
}

function updatePhysics() {
  player.vy += player.inertia * 0.8
  if (player.vx < 0) {
    player.vx += player.inertia * 0.45
  } else if (player.vx > 0) {
    player.vx -= player.inertia * 0.45
  }
  if (Math.abs(player.vx) < 0.4) {
    player.vx = 0
  }

  if (input.keys['w'] && player.grounded || input.keys[' '] && player.grounded) player.vy -= player.jump
  if (input.keys['a']) {
    if (player.vx > -player.speed) {
      player.vx -= player.inertia * 1
    } else {
      player.vx = -player.speed
    }
  }
  if (input.keys['d']) {
    if (player.vx < player.speed) {
      player.vx += player.inertia * 1
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
    } else if (player.vy < 0) {
      player.y = (Math.floor(player.y / player.tileSize) + 1) * player.tileSize
    }
    player.vy = 0
  } else {
    player.grounded = false
  }

  if (player.y > editor.map.h * player.tileSize) {
    player.vy = 0
    player.vx = 0
    player.x = editor.playerSpawn.x
    player.y = editor.playerSpawn.y
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
       calcAdjacentAdjacency(idx, editor.selectedTile)
      }
    }
    if (lastIdx !== idx) {
      mouseDown = false
    }
  } else {
    mouseDown = false
  }
  
  ctx.fillStyle = '#C29A62'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawMap()
  

  const cursorScrX = (tx * tileSize) - cam.x
  const cursorScrY = (ty * tileSize) - cam.y
  const img = Array.isArray(tileset[editor.selectedTile]) ? tileset[editor.selectedTile][calculateAdjacency(ty * map.w + tx, editor.selectedTile) & 15] : tileset[editor.selectedTile]
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