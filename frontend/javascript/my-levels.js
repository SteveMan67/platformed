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
  console.log(payload)

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
          <img src="/assets/icons/edit.svg">
        </a>
        <div class="divider"></div>
        <a href="/level/${level.id}" id="view" class="quick-action">
          <img src="/assets/icons/view.svg">
        </a>
        <div class="divider"></div>
        <button data-level="${level.id}" class="quick-action">
          <img src="/assets/icons/delete.svg">
        </button>
        <div class="divider"></div>
        <a href="/meta/${level.id}" id="settings" class="quick-action">
          <img src="/assets/icons/settings.svg">
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

async function loadTileset(tilesetPath) {
  if (tilesetMap.has(tilesetPath)) return tilesetMap.get(tilesetPath)
  const res = await fetch(tilesetPath)
  const rawJson = await res.json()
  const tilesetJson = rawJson.tiles
  const tileset = {}
  const path = rawJson.path

  const promises = tilesetJson.map(async (def) => {
    const img = new Image()
    img.src = path + def.file
    await new Promise(resolve => {
      img.onload = resolve
      img.onerror = resolve
    })

    tileset[def.id] = { ...def, triggerAdjacency: def.triggerAdjacency, image: img, images: [] }

    if (def.type == "adjacency" || def.type == "rotation") {
      const w = img.naturalHeight
      if (w > 0) {
        const count = Math.floor(img.naturalWidth / w)
        for (let i = 0; i < count; i++) {
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = w
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, i * w, 0, w, w, 0, 0, w, w)

          const sliceImg = new Image()
          sliceImg.src = canvas.toDataURL()
          tileset[def.id].images[i] = sliceImg
        }
      }
    }
  })
  await Promise.all(promises)
  tilesetMap.set(tilesetPath, tileset)
  return tileset
}

export async function renderLevelPreview(canvas, levelData) {
  console.log(levelData)
  const tilesetPath = levelData.data ? levelData.data.tilesetPath : "/assets/medium.json"
  let tileset = await loadTileset(tilesetPath)
  tileset = Object.values(tileset)
  if (!canvas || !levelData) return

  const tilesize = 25
  const ctx = canvas.getContext("2d")


  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#C29A62"
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
