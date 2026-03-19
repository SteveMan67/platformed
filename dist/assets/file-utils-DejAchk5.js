import { uploadLevel } from "./api.js";
import { calculateAdjacencies, initPlatformer, mechanicsHas, triggersAdjacency, typeIs, updatePhysicsConstants } from "./platformer.js";
import { updateTileset } from "./renderer.js";
import { state } from "./state.js"
import { needsSmallerLevel, openMenu } from "./ui.js";

const { user, player, editor } = state

export function createSpriteSheet(width) {
  const { tileset } = editor

  const tileWidth = tileset[1].image.naturalHeight || tileset[1].image.height
  const newTileset = { tiles: [], type: "spritesheet" }
  const framesToDraw = []
  let tileIndex = 0

  for (const tile of tileset) {
    if (!tile) continue
    const imagesToProcess = tile.images ? tile.images : (tile.image ? [tile.image] : [])

    const tileY = Math.floor(tileIndex / width)
    const tileX = tileIndex % width

    for (const img of imagesToProcess) {
      tileIndex++
      framesToDraw.push({ img: img })
    }

    const newTile = {
      x: tileX,
      y: tileY,
      id: tile.id,
      name: tile.name,
      type: tile.type,
      category: tile.category,
      triggerAdjacency: tile.triggerAdjacency,
      file: tile.file,
      mechanics: tile.mechanics
    }

    newTileset.tiles.push(newTile)
  }

  const columns = Math.min(width, framesToDraw.length)
  const row = Math.ceil(framesToDraw.length / columns)

  let currentX = 0
  let currentY = 0

  for (const frame of framesToDraw) {
    frame.x = currentX * tileWidth
    frame.y = currentY * tileWidth

    currentX++
    if (currentX >= columns) {
      currentX = 0
      currentY++
    }
  }

  const sheetCanvas = document.createElement("canvas")
  sheetCanvas.width = tileWidth * width
  sheetCanvas.height = Math.ceil(framesToDraw.length / width) * tileWidth
  const ctx = sheetCanvas.getContext("2d")
  ctx.imageSmoothingEnabled = false

  for (const frame of framesToDraw) {
    ctx.drawImage(frame.img, frame.x, frame.y, tileWidth, tileWidth)
    delete frame.obj
  }

  const link = document.createElement("a")
  link.download = "spritesheet.png"
  link.href = sheetCanvas.toDataURL("image/png")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return newTileset
}

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
  player.jumpHeight = json.jumpHeight ?? 2.5;
  player.jumpWidth = json.jumpWidth ?? 7;
  player.yInertia = json.yInertia ?? 1;
  player.xInertia = json.xInertia ?? 1.5;
  player.physicsVersion = json.physicsVersion ?? 1
  if (json.bouncePadHeight) {
    player.bouncePadHeight = json.bouncePadHeight;
  }
  if (json.zoom) {
    if (needsSmallerLevel()) {
      console.log(json.zoom)
      player.tileSize = Math.round(Math.max(json.zoom / 1.5, 40))
      updatePhysicsConstants()
    }
  } else if (needsSmallerLevel()) {
    player.tileSize = 45
    updatePhysicsConstants()
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
  const tileLayer = json.layers?.find(l => l.type === "tilelayer");
  const rotationLayer = json.layers?.find(l => l.type === "rotation");
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
    if (typeIs(rawTileLayer[i] >> 4, "rotation")) {
      rawTileLayer[i] += rawRotationLayer[i];
    }
    if (mechanicsHas(rawTileLayer[i] >> 4, "spawn")) {
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
      let rawTileLayer = decodeRLE(tileLayer.data)
      if (rawTileLayer.length !== json.width * json.height) {
        console.warn('readData: data length not expected value', rawTileLayer.length, json.width * json.height)
      }
      rawTileLayer = rawTileLayer.map(id => id << 4)
      for (let i = 0; i < rawTileLayer.length; i++) {
        if (typeIs(rawTileLayer[i] >> 4)) {
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
  json.physicsVersion = 2
  json.jumpHeight = player.jumpHeight
  json.jumpWidth = player.jumpWidth
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
    if (typeIs(data[i] >> 4, "rotation")) {
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
  console.log("hello")
  if (!playerImg) return
  console.log("hi")
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

const loadedTilesets = new Map()
const loadedPlayers = new Map()

async function loadSpriteSheetTileset(manifest) {
  const tileset = []
  const raw = await fetch(manifest.spritesheetPath)
  const blob = await raw.blob()

  const spriteSheet = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = manifest.spritesheetPath
  })

  const tileWidth = manifest.tileWidth
  const width = spriteSheet.naturalWidth / tileWidth
  console.log(`width: ${width}`)
  for (const tile of manifest.tiles) {
    const dpr = window.devicePixelRatio
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = width
    ctx.imageSmoothingEnabled = false
    canvas.style.imageRendering = 'pixelated'

    ctx.drawImage(spriteSheet, tile.x * width, tile.y * width, width, width, 0, 0, width, width)

    const images = []

    if (tile.type === "adjacency") {
      for (let i = 0; i < 16; i++) {
        const subCanvas = document.createElement("canvas")
        const subCtx = subCanvas.getContext("2d")
        subCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        subCanvas.width = width
        subCanvas.height = width
        subCtx.imageSmoothingEnabled = false
        subCanvas.style.imageRendering = 'pixelated'

        let x = tile.x + i
        let y = tile.y

        if (x >= tileWidth) {
          y = Math.floor(x / tileWidth) + y
          x = x % tileWidth
        }
        subCtx.drawImage(spriteSheet, x * width, y * width, width, width, 0, 0, width, width)
        images.push(subCanvas)
      }
    } else if (tile.type === "rotation") {
      for (let i = 0; i < 4; i++) {
        const subCanvas = document.createElement("canvas")
        const subCtx = subCanvas.getContext("2d")
        subCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        subCanvas.width = width
        subCanvas.height = width
        subCtx.imageSmoothingEnabled = false
        subCanvas.style.imageRendering = 'pixelated'

        let x = tile.x + i
        let y = tile.y

        if (x >= tileWidth) {
          y = Math.floor(x / tileWidth) + y
          x = x % tileWidth
        }
        subCtx.drawImage(spriteSheet, x * width, y * width, width, width, 0, 0, width, width)
        images.push(subCanvas)
      }
    }

    let minimapColor = 'rgba(0, 0, 0, 0)'
    if (tile.type !== "empty") {

      try {
        const imgData = ctx.getImageData(0, 0, width, width).data
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

          if (colorCounts[rgb] > maxCount && colorCounts[rgb] > (imgData.length / 4) * 0.1) {
            maxCount = colorCounts[rgb]
            minimapColor = rgb
          }
        }
      } catch (e) {
        console.warn("could not calculate minimap color", e)
      }
    }
    const tileObject = {
      ...tile,
      minimapColor: minimapColor,
      image: canvas,
    }
    if (images.length > 0) {
      tileObject.images = images
    }
    tileset.push(tileObject)
  }
  console.log(tileset)
  return tileset
}

export async function loadTileset(manifestPath) {
  if (loadedTilesets.has(manifestPath)) {
    const tileset = loadedTilesets.get(manifestPath)
    const characterImage = loadedPlayers.get(manifestPath)
    return { tileset, player: characterImage }
  }

  return fetch(manifestPath)
    .then(response => response.json())
    .then(async (manifest) => {
      if (manifest.type == "spritesheet") {
        console.log("spritesheet")
        const tileset = await loadSpriteSheetTileset(manifest)

        const rawCharacterImage = fetch(manifest.path + "/" + manifest.characterFile)
        const blob = await rawCharacterImage.blob

        const characterImage = await new Promise((resolve) => {
          const img = new Image()
          const prefix = manifest.path + "/"
          img.onload = () => resolve(img)
          img.onerror = (e) => {
            console.error(`failed to load character image from: ${srcPath}`, e)
            resolve(null)
          }
          img.src = prefix + manifest.characterFile
        })

        loadedTilesets.set(manifestPath, tileset)
        loadedPlayers.set(manifestPath, characterImage)
        console.log(characterImage)
        return { tileset, characterImage }
      }

      let loadedCount = 0
      const totalCount = manifest.tiles.length + 1

      function updateProgress() {
        loadedCount++
        window.dispatchEvent(new CustomEvent('loading:progress', {
          detail: { loaded: loadedCount, total: totalCount }
        }))
      }

      const promises = manifest.tiles.map(tileData => {

        if (!tileData.file) {
          updateProgress()
          return Promise.resolve(tileData)
        }
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

                if (a < 128 || (r < 10 && g < 10 && b < 10)) continue
                const rgb = `rgb(${r}, ${g}, ${b})`
                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1

                if (colorCounts[rgb] > maxCount && colorCounts[rgb] > (imgData.length / 4) * 0.1) {
                  maxCount = colorCounts[rgb]
                  minimapColor = rgb
                }
              }
            } catch (e) {
              console.warn("Could not calculate minimap color", e)
            }
            updateProgress()
            resolve({ ...tileData, image: img, minimapColor })
          }
          img.onerror = (e) => {
            updateProgress()
            reject(e)
          }
        })
      })

      const characterPromise = new Promise((resolve) => {
        if (!manifest.characterFile) {
          updateProgress()
          return resolve(null)
        }
        const img = new Image()
        img.src = manifest.path + manifest.characterFile
        img.onload = () => {
          updateProgress()
          resolve(img)
        }
        img.onerror = () => {
          updateProgress()
          resolve(null)
        }
      })

      return Promise.all([Promise.all(promises), characterPromise])
        .then(([items, characterImage]) => {
          const tileset = []
          items.forEach(item => {
            tileset[item.id] = item
          })

          loadedTilesets.set(manifestPath, tileset)
          loadedPlayers.set(manifestPath, characterImage)
          return { tileset, characterImage }
        })
    })
}
export function splitStripImages(tileset) {
  // split strip images 
  const newTileset = []
  tileset.forEach(tile => {
    if (!tile) return
    if (tile.images) {
      newTileset[tile.id] = tile
      return
    }
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
  console.log(user)
  let me
  if (!user || user.id == null) {
    // check whether the cookie exists
    const serverUrl = window.location.origin

    me = await fetch(`${serverUrl}/api/me`, {
      method: "GET",
      credentials: "include"
    })

    if (me.ok) {
      const userJson = await me.json()
      console.log(userJson)
      if (userJson.user !== undefined) {
        user.id = userJson.user
      }
    } else {
      // need to show a log prompt 
      const CLIENT_ID = 'bf7d0bd81b456fe6c1fce13daf452ad7'
      const hackClub = document.querySelector(".hack-club-oauth")
      hackClub.target = '_blank'
      hackClub.href = `https://auth.hackclub.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}&response_type=code&scope=${encodeURIComponent("openid slack_id")}`
      openMenu("login")
      return
    }
  }

  const levelNum = editor.level.id
  editor.dirty = false
  const serverUrl = window.location.origin

  const isOwner = editor.level.id && editor.level.owner == user.id
  if (isOwner) {
    const payload = {}
    payload.levelId = levelNum
    payload.data = createMap()
    payload.width = editor.width
    payload.height = editor.height

    const saving = document.querySelector(".saving")
    const loading = document.querySelector(".loading")
    saving.classList.remove("hidden")
    loading.classList.remove("hidden")


    fetch(`${serverUrl}/api/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }).then(res => {
      loading.classList.add("hidden")
      if (res.ok) {
        saving.innerText = "Saved"
        setTimeout(() => {
          saving.innerText = "Saving..."
          saving.classList.add("hidden")
        }, 1500)
      }
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
}