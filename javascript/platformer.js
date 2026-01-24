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
  return out
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

function platformerLoop() {

}

const editor = {
  cam: {
    x: 0,
    y: 0
  },
  tileSize: 32,
  selectedTile: 1,
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
    console.log(w, h)
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
      console.log("found strip")
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

function calculateAdjacencies(tiles) {
  // calculate all the adjacencies in a given level
}

function calculateAdjacency(tileIdx, tileId) {
  // calculate the adjacency for a given tile when it's placed
  let variant = 0

  // top
  if (tileIdx - editor.width >= 0) {
    if (editor.map.tiles[tileIdx - editor.width] !== 0) {
      variant += 1
      console.log("tile on top")
    }
  } else {
    variant += 1
    console.log("wall on top")
  }
  // right
  if (tileIdx + 1 < editor.map.tiles.length) {
    if(editor.map.tiles[tileIdx + 1] !== 0) {
      variant += 2
      console.log("tile on right")
    }
  } else {
    variant += 2
    console.log("wall on right")
  }
  // bottom
  if (tileIdx + editor.width < editor.map.tiles.length) {
    if (editor.map.tiles[tileIdx + editor.width] !== 0) {
      variant += 4
      console.log("tile on bottom")
    }
  } else {
    variant += 4
    console.log("wall on bottom")
  }
  // left
  if (tileIdx - 1 >= 0) {
    if(editor.map.tiles[tileIdx - 1] !== 0) {
      variant += 8
      console.log("tile on left")
    }
  } else {
    variant += 8
    console.log("wall on left")
  }

  console.log(variant)
  return (tileId * 16) + variant

}

function updateLevelSize(width, height) {
  // need to update the array with new values or slice old ones 
  // and also update editor object
  // note: add new columns on the right of the map
  // note: and new rows on top and same for removing
  let tiles = Array.from(editor.map.tiles)
  if (editor.width > width) {
    console.log("Shorter")
    const diff = width - editor.width
    for (let h = 0; h < editor.height; h++) {
      // delete the end of the rows
      tiles.splice((h * width) + width, editor.width - width)
    }
  } else if (editor.width < width) {
    console.log("Longer")
    // !!Working!!
    const diff = Math.abs(width - editor.width)
    console.log(diff)
    for (let h = 0; h < editor.height; h++) {
      tiles.splice(((h * width) + width - diff), 0, ...Array(diff).fill(0))
    }
  }
  if (editor.height > height) {
    console.log("shorter")
    // !!Working!!
    console.log((editor.height - height) * width)
    tiles.splice(0, (editor.height - height) * width)
  } else if (editor.height < height) {
    console.log("taller")
    // !!Working!!
    Array((height - editor.height) * width).fill(0)
    tiles.unshift(...Array((height - editor.height) * width).fill(0))
  }
  console.log(tiles.length, tiles.length === width * height)

  editor.map.tiles = new Uint16Array(tiles)
  editor.width = width
  editor.height = height
  editor.map.w = width
  editor.map.h = height
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
    editor.tileset = splitStripImages(images)
    editor.map = {
      w: 100, h: 50, tiles: new Uint16Array(5000)
    }
    levelEditorLoop()
  })
}

let mouseNotDown = true

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
    if (mouseNotDown) {
      if (tx >= 0 && tx < map.w && ty >= 0 && ty < map.h) {
       const idx = ty * map.w + tx
       console.log(ty, tx, idx)
       map.tiles[idx] = calculateAdjacency(idx, editor.selectedTile)
      }
      mouseNotDown = false
    }
  } else {
    mouseNotDown = true
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
      const raw = map.tiles[y * map.w + x]
      const tileId = raw >> 4
      const scrX = (x * tileSize) - cam.x
      const scrY = (y * tileSize) - cam.y
      
      if (tileId > 0 && Array.isArray(tileset[tileId])) {
        ctx.drawImage(tileset[tileId][(raw & 15)], scrX, scrY, tileSize, tileSize)
      } else if (tileId > 0 && !tileset[tileId].isArray) {
        ctx.drawImage(tileset[tileId], scrX, scrY, tileSize, tileSize)
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