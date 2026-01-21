const canvas = document.querySelector("canvas")
const dpr = window.devicePixelRatio
const ctx = canvas.getContext('2d')
const rect = canvas.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height

ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
ctx.imageSmoothingEnabled = false
canvas.style.imageRendering = 'pixelated'

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
}

function loadMap(path) {
  return fetch(path)
    .then(response => response.json())
    .then(json => {
      const layer = json.layers.find(l => l.type === "tilelayer")
      const raw = decodeRLE(json.data)
      if (raw.length !== json.width * json.height) {
        console.warn('readData: data length not expected value', raw.length, json.width * json.height)
      }
      const tiles = new Uint16Array(raw)
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
  let runVal = data[0]
  let runCount = 1
  for (let i = 1; i < data.length; i++) {
    const v = data[i]
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
    "data": data
  }
  json.layers.push(mapLayer)
  return json
}

function loadTileset(manifestPath) {
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

function platformerLoop() {

}

const editor = {
  cam: {
    x: 0,
    y: 0
  },
  tileSize: 64,
  selectedTile: 1,
  map: null,
  tileset: []
}

const input = {
  x: 0,
  y: 0,
  down: false,
  keys: {}
}

function initEditor() {
  window.addEventListener('keydown', e => input.keys[e.key] = true)
  window.addEventListener('keyup', e => input.keys[e.key] = false)

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect()
    input.x = e.clientX - rect.left
    input.y = e.clientY - rect.top
  })
  canvas.addEventListener('mousedown', () => input.down = true)
  canvas.addEventListener('mouseup', () => input.down = false)

  loadTileset('assets/tileset.json').then(images => {
    editor.tileset = images
    editor.map = {
      w: 100, h: 50, tiles: new Uint16Array(100 * 50)
    }
    levelEditorLoop()
  })
}

function levelEditorLoop() {
  const { map, cam, tileSize, tileset} = editor

  const speed = 5
  if (input.keys['w'] && cam.y >= 0) cam.y -= speed
  if (input.keys['s'] && cam.y <= (map.h * tileSize) - canvas.height + 5) cam.y += speed
  if (input.keys['a'] && cam.x >= 0) cam.x -= speed
  if (input.keys['d'] && cam.x <= (map.w * tileSize) - canvas.width + 5) cam.x += speed

  const worldX = input.x + cam.x
  const worldY = input.y + cam.y
  const tx = Math.floor(worldX / tileSize)
  const ty = Math.floor(worldY / tileSize)

  if (input.down) {
     if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
      const idx = ty * map.w + tx
      console.log(ty, tx)
      map.tiles[idx] = editor.selectedTile
     }
  }
  
  ctx.fillStyle = '#C29A62'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const startX = Math.floor(cam.x / tileSize)
  const endX = startX + (canvas.width / tileSize) + 1
  const startY = Math.floor(cam.y / tileSize)
  const endY = startY + (canvas.width / tileSize) + 1
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (x < 0 || x >= map.w || y < 0 || y >= map.h) continue
      const tileId = map.tiles[y * map.w + x]
      const scrX = (x * tileSize) - cam.x
      const scrY = (y * tileSize) - cam.y
      
      if (tileId > 0 && tileset[tileId]) {
        ctx.drawImage(tileset[tileId], scrX, scrY, tileSize, tileSize)
      } else {
        ctx.strokeStyle = 'grey'
        ctx.strokeRect(scrX, scrY, tileSize, tileSize)
      }
    }
  }

  const cursorScrX = (tx * tileSize) - cam.x
  const cursorScrY = (ty * tileSize) - cam.y
  ctx.strokeStyle = 'grey'
  ctx.strokeRect(cursorScrX, cursorScrY, tileSize, tileSize)

  requestAnimationFrame(levelEditorLoop)
}

function logCurrentMapAsJSON() {
  console.log(createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles)))
}

initEditor()