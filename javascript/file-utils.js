import { uploadLevel } from "./api.js";
import { calculateAdjacencies } from "./platformer.js";
import { updateTileset } from "./renderer.js";
import { state } from "./state.js"

const { user, player, editor } = state

export async function importMap(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => console.error('failed to read file', reader.error);
  reader.onload = async () => {
    const json = JSON.parse(reader.result);
    await loadMapFromData(json)
  };
  reader.readAsText(file);
}

export async function loadMapFromData(json) {
  player.jumpHeight = json.jumpHeight;
  player.jumpWidth = json.jumpWidth;
  player.yInertia = json.yInertia;
  player.xInertia = json.xInertia;
  if (json.bouncePadHeight) {
    player.bouncePadHeight = json.bouncePadHeight;
  }
  if (json.zoom) {
    player.tileSize = json.zoom;
  }
  if (json.tilesetPath) {
    await updateTileset(json.tilesetPath)
  } else {
    await updateTileset("/assets/medium.json")
  }
  if (json.triggers) {
    player.triggers = json.triggers
  }
  if (json.spawn) {
    editor.playerSpawn = { x: json.spawn.x, y: json.spawn.y }
  }
  player.wallJump = json.wallJump;
  const tileLayer = json.layers.find(l => l.type === "tilelayer");
  const rotationLayer = json.layers.find(l => l.type === "rotation");
  const rawRotationLayer = decodeRLE(rotationLayer.data);
  let rawTileLayer = decodeRLE(tileLayer.data);
  if (rawTileLayer.length !== json.width * json.height) {
    console.warn('data length not expected value', rawTileLayer.length, json.width * json.height);
  }
  rawTileLayer = rawTileLayer.map(id => id << 4);
  // need to set width and height before calculateAdjacencies otherwise it don't work
  editor.width = json.width;
  editor.height = json.height;

  rawTileLayer = calculateAdjacencies(rawTileLayer, json.width, json.height);

  for (let i = 0; i < rawTileLayer.length; i++) {
    if (editor.tileset[rawTileLayer[i] >> 4] && editor.tileset[rawTileLayer[i] >> 4].type == "rotation") {
      rawTileLayer[i] += rawRotationLayer[i];
    }
    if (editor.tileset[rawTileLayer[i] >> 4] && editor.tileset[rawTileLayer[i] >> 4].mechanics && editor.tileset[rawTileLayer[i] >> 4].mechanics.includes("spawn")) {
      editor.playerSpawn.y = Math.floor(i / json.width);
      editor.playerSpawn.x = i % json.width;
    }
  }
  const tiles = new Uint16Array(rawTileLayer);
  const map = {
    tiles,
    w: json.width,
    h: json.height
  };
  editor.map = map;
}

export function decodeRLE(rle) {
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

export function loadMap(path) {
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

export function encodeRLE(list) {
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

export function createMap(width = editor.map.w, height = editor.map.h, data = Array.from(editor.map.tiles)) {
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
  json.spawn = { x: editor.playerSpawn.x, y: editor.playerSpawn.y }
  const tileIdRLE = encodeRLE(data.map(id => id >> 4))
  let mapLayer = {
    "type": "tilelayer",
    "name": "level",
    "data": tileIdRLE
  }
  json.layers.push(mapLayer)
  json.triggers = player.triggers
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
export function loadPlayerSprites(playerImg) {
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
    ctx.drawImage(playerImg, i * h, 0, h, h, 0, 0, h, h)
    sprites.push(c)
  }
  player.sprites = sprites
}
export async function loadTileset(manifestPath) {
  return fetch(manifestPath)
    .then(response => response.json())
    .then(manifest => {

      const promises = manifest.tiles.map(tileData => {

        if (!tileData.file) return Promise.resolve(tileData)
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.src = manifest.path + tileData.file
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img.height || 1
            canvas.height = img.height || 1
            ctx.drawImage(img, 0, 0)

            let minimapColor = 'rgba(0,0,0,0)'
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
              const colorCounts = {}
              let maxCount = 0
              for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i]
                const g = imgData[i + 1]
                const b = imgData[i + 2]
                const a = imgData[i + 3]

                if (a < 128) continue
                const rgb = `rgb(${r}, ${g}, ${b})`
                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1

                if (colorCounts[rgb] > maxCount) {
                  maxCount = colorCounts[rgb]
                  minimapColor = rgb
                }
              }
            } catch (e) {
              console.warn("Could not calculate minimap color", e)
            }
            resolve({ ...tileData, image: img, minimapColor })
          }
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
          console.log(tileset)
          return { tileset, characterImage }
        })
    })
}
export function splitStripImages(tileset) {
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

export async function updateMap() {
  if (!user) {
    alert("Please log in to save levels (you can save as json and upload later if you wish to save progress)")
    return
  }
  const levelNum = editor.level.id
  editor.dirty = false
  const serverUrl = window.location.origin

  const isOwner = editor.level.id && editor.level.owner == user.id
  console.log(editor.level, user.id)
  console.log(`isOwner: ${isOwner}`)
  if (isOwner) {
    const payload = {}
    payload.levelId = levelNum
    payload.data = createMap()

    fetch(`${serverUrl}/api/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }).then(res => {
      console.log(res)
    })
  } else {
    const levelId = await uploadLevel([
      ["data", createMap()]
    ])
    console.log(await levelId)
    window.location.href = `/level/${await levelId}`
  }
}

export function loadOwnerData(json) {
  if (json.id) editor.level.id = json.id
  if (json.owner) editor.level.owner = json.owner
  console.log(editor.level)
}