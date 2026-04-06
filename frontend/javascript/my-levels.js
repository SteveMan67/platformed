const serverUrl = window.location.origin
async function getLevel(user = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/myLevels`)
    return levels.json()
  } catch (e) {
    console.error(e)
  }
}

const overlay = document.querySelector(".overlay")
let deletedLevelNumber

function showDeleteOverlay(levelNumber) {
  deletedLevelNumber = levelNumber
  overlay.style.display = "flex"
}

function deleteLevel(levelId = deletedLevelNumber) {
  const payload = {}
  payload.levelId = levelId

  fetch(`${serverUrl}/api/delete`, {
    method: "DELETE",
    credentials: "include",
    body: JSON.stringify(payload)
  })
    .then(res =>
      window.location.reload()
    )
}

const confirmButton = document.querySelector("#confirm-button")
confirmButton.addEventListener("click", (e) => {
  deleteLevel()
})

const levelsElement = document.querySelector(".levels")
getLevel(1).then(levels => {
  levelsElement.innerHTML = ''
  levels = [].concat(levels)
  levels.forEach(level => {
    const levelElement = document.createElement("a")
    levelElement.href = `/editor/${level.id}`
    let tagsHtml = ''
    for (let i = 0; i < level.tags.length || i < 2; i++) {
      tagsHtml += `<p class="tag">${level.tags[i]}</p>`
    }
    if (!level.tags.length) {
      tagsHtml = ''
    }

    let imageHtml
    if (level.image_url == "") {
      imageHtml = `
        <div class="no-image">
          <p>No Image Provided</p>
        </div>
      `
    } else {
      imageHtml = `<img src="${level.image_url}" alt="No Image Provided">`
    }

    const body = `
      <div data-level="${level.id}" class="image">
      </div>
      <div class="name-and-rating">
        <h2 class="name my-levels">${level.name}</h2>
      </div>
      <div class="quick-actions">
        <a href="/editor/${level.id}" id="edit" class="quick-action">
          <div class="svg edit"></div>
        </a>
        <div class="divider"></div>
        <a href="/level/${level.id}" id="view" class="quick-action">
          <div class="svg view"></div>
        </a>
        <div class="divider"></div>
        <button data-level="${level.id}" class="quick-action">
          <div class="svg delete"></div>
        </button>
        <div class="divider"></div>
        <a href="/meta/${level.id}" id="settings" class="quick-action">
          <div class="svg settings"></div>
        </a>
      </div>
      
    `


    levelElement.classList.add("level")
    levelElement.innerHTML = body
    levelsElement.append(levelElement)
    const quickActions = levelElement.querySelector(".quick-actions")

    const button = document.querySelector(`button.quick-action[data-level="${level.id}"]`)
    button.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      deletedLevelNumber = level.id
      overlay.style.display = "flex";
    })

    const imgWrapper = document.querySelector(`.image[data-level="${level.id}"]`)
    const canvas = document.createElement("canvas")
    imgWrapper.appendChild(canvas)
    renderLevelPreview(canvas, level)
  })
})

function getThemeColor(colorName) {
  return getComputedStyle(document.documentElement).getPropertyValue(colorName).trim()
}

const colorTheme = {}

function updateColorTheme() {
  colorTheme.bgPrimary = getThemeColor('--bg-primary')
  colorTheme.bgAccent = getThemeColor('--bg-accent')
  colorTheme.bgLevel = getThemeColor('--bg-level')
  colorTheme.textOnPrimary = getThemeColor('--text-on-primary')
  colorTheme.textOnAccent = getThemeColor('--text-on-accent')
  colorTheme.action = getThemeColor('--action')
  colorTheme.textOnAction = getThemeColor('--text-on-action')
}

updateColorTheme()

function decodeRLE(data) {
  const out = []
  for (let i = 0; i < data.length; i++) {
    const pair = data[i]
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

function calculateAdjacencies(tiles, w, h, tileset = editor.tileset) {
  let out = []
  // calculate all the adjacencies in a given level
  for (let i = 0; i < w * h; i++) {
    const raw = tiles[i]
    if (!raw) {
      out.push(0)
      continue
    }
    const baseId = raw >> 4
    out.push(calculateAdjacency(i, baseId, tiles, tileset, w, h))
  }
  return out
}

function calculateAdjacency(tileIdx, tileId, tiles, tileset, w, h) {
  // calculate the adjacency for a given tile when it's placed
  // bug: walls other than the top and bottom don't work
  let variant = 0

  tileId = (typeof tileId == 'number') ? tileId : tiles[tileIdx] >> 4
  if (tileId == 0) return 0

  if (tileset[tileId] && tileset[tileId].type == 'rotation') {
    return tileId << 4
  }

  const getNeighborId = (idx) => {
    const val = tiles[idx]
    return val ? val >> 4 : 0
  }

  const check = (idx) => {
    const nid = getNeighborId(idx)
    if (nid === 0) return false
    const t = tileset[nid]
    return t && t.triggerAdjacency
  }
  // top
  if (tileIdx - w >= 0) {
    if (check(tileIdx - w)) variant += 1
  } else {
    variant += 1
  }
  // right
  if (tileIdx + 1 < tiles.length && (tileIdx + 1) % w !== 0) {
    if (check(tileIdx + 1)) variant += 2
  } else {
    variant += 2
  }
  // bottom
  if (tileIdx + w < tiles.length) {
    if (check(tileIdx + w)) variant += 4
  } else {
    variant += 4
  }
  // left
  if (tileIdx - 1 >= 0 && tileIdx % w !== 0) {
    if (check(tileIdx - 1)) variant += 8
  } else {
    variant += 8
  }

  return (tileId * 16) + variant

}

const tilesetMap = new Map()
const imgMap = new Map()

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

        if (colorCounts[rgb] > maxCount) {
          maxCount = colorCounts[rgb]
          minimapColor = rgb
        }
      }
    } catch (e) {
      console.warn("could not calculate minimap color", e)
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
  if (manifestPath === "/assets/medium-spritesheet.json") manifestPath = "/assets/medium.json"
  if (tilesetMap.has(manifestPath)) {
    const tileset = tilesetMap.get(manifestPath)
    return tileset
  }

  const fetchPromise = fetch(manifestPath)
    .then(response => response.json())
    .then(async (manifest) => {
      if (manifest.type == "spritesheet") {
        const tileset = await loadSpriteSheetTileset(manifest)

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

        tilesetMap.set(manifestPath, tileset)
        console.log(characterImage)
        return tileset
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

            updateProgress()
            resolve({ ...tileData, image: img })
          }
          img.onerror = (e) => {
            updateProgress()
            reject(e)
          }
        })
      })

      return Promise.all(promises)
        .then((items) => {
          const tileset = []
          items.forEach(item => {
            tileset[item.id] = item
          })

          tilesetMap.set(manifestPath, tileset)
          return tileset
        })

    })

  tilesetMap.set(manifestPath, fetchPromise)

  return fetchPromise

}


export async function renderLevelPreview(canvas, levelData) {
  const tilesetPath = levelData.data ? levelData.data.tilesetPath : "/assets/medium.json"
  let tileset = await loadTileset(tilesetPath)
  tileset = Object.values(tileset)
  if (!canvas || !levelData) return

  const tilesize = 25
  const ctx = canvas.getContext("2d")


  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = colorTheme.bgLevel
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (imgMap.has(levelData.id)) {
    ctx.drawImage(imgMap.get(levelData.id), 0, 0)
    return
  }

  const decoded = decodeRLE(levelData.data.layers[0].data)
  const shifted = decoded.map(t => t << 4)
  const data = calculateAdjacencies(shifted, levelData.width, levelData.height, tileset)

  const rotationData = decodeRLE(levelData.data.layers[1] ? levelData.data.layers[1].data : [])

  const spawnId = tileset.find(f => f.mechanics && f.mechanics.includes("spawn")).id
  const spawnIdx = decoded.findIndex(f => f == spawnId)

  let spawnX = 0
  let spawnY = 0
  if (spawnIdx !== -1) {
    const tileX = spawnIdx % levelData.width
    const tileY = Math.floor(spawnIdx / levelData.width)
    spawnX = (tileX * tilesize) + (tilesize / 2)
    spawnY = (tileY * tilesize) + (tilesize / 2)
  }


  let camX = Math.floor(spawnX - (canvas.width / 2))
  let camY = Math.floor(spawnY - (canvas.height / 2))

  const maxCamX = (levelData.width * tilesize) - canvas.width
  const maxCamY = (levelData.height * tilesize) - canvas.height

  camX = Math.max(0, Math.min(camX, maxCamX > 0 ? maxCamX : 0))
  camY = Math.max(0, Math.min(camY, maxCamY > 0 ? maxCamY : 0))

  const startCol = Math.floor(camX / tilesize)
  const endCol = startCol + Math.ceil(canvas.width / tilesize) + 1
  const startRow = Math.floor(camY / tilesize)
  const endRow = Math.ceil((camY + canvas.height) / tilesize)


  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const idx = y * levelData.width + x;
      const raw = data[idx] + rotationData[idx]

      if (raw) {
        const tileId = raw >> 4;
        const variant = raw & 15

        const tileDef = tileset[tileId]
        if (tileDef) {
          const drawX = Math.floor((x * tilesize) - camX)
          const drawY = Math.floor((y * tilesize) - camY)
          const img = (tileDef.images && tileDef.images[variant]) ? tileDef.images[variant] : tileDef.image
          ctx.drawImage(img, drawX, drawY, tilesize, tilesize)
        }
      }
    }
  }
  const bitmap = await createImageBitmap(canvas)
  imgMap.set(levelData.id, bitmap)
}
