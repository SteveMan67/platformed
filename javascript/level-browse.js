const serverUrl = window.location.origin
async function getLevel(page = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/browse`)
    return levels.json()
  } catch (e) {
    console.error(e)
  }
}

async function addLevels(levels) {
  levelsElement.innerHTML = ''
  levels.forEach(level => {
    const levelElement = document.createElement("a")
    levelElement.href = `/level/${level.id}`
    let tagsHtml = ''
    for (let i = 0; i < level.tags.length || i < 2; i++) {
      tagsHtml += `<p class="tag">${level.tags[i]}</p>`
    }
    if (!level.tags.length) {
      tagsHtml = ''
    }

    const imageHtml = document.createElement("canvas")

    const body = `
      <div data-level="${level.id}" class="image">
        
      </div>
      <div class="name-and-rating">
        <h2 class="name">${level.name}</h2>
        <div class="approval-rating-wrapper">
          <p class="approval-rating">${level.approval_percentage}%</p>
          <img src="./assets/icons/thumbs-up.svg" alt="">
        </div>
      </div>
      <div class="tags-and-plays">
        <div class="tags">
          ${tagsHtml}
        </div>
        <div class="plays">
          <p class="plays-finishes"><span class="plays">${level.total_plays}</span>/<span class="finishes">${level.finished_plays}</span>
          </p>
        </div>
      </div>
    `
    levelElement.classList.add("level")
    levelElement.innerHTML = body
    levelsElement.append(levelElement)

    const imageWrapper = document.querySelector(`.image[data-level="${level.id}"]`)
    const canvas = document.createElement("canvas")
    imageWrapper.appendChild(canvas)
    renderLevelPreview(canvas, level)
  })
}

const levelsElement = document.querySelector(".levels")
getLevel(1).then(levels => {
  levels = new Array(levels)
  levelsElement.innerHTML = ''
  console.log(levels)
  addLevels(levels[0])
})

const search = document.getElementById("search")

search.addEventListener("input", async (e) => {
  if (search.value == "") {
    const raw = await fetch(`${serverUrl}/api/browse`)
    const levels = await raw.json()
    addLevels(levels)
  } else {
    const raw = await fetch(`${serverUrl}/api/search?search=${search.value}`)
    const levels = await raw.json()
    addLevels(levels)
  }
})

const myLevelsbutton = document.getElementById("my-levels")

fetch(`${serverUrl}/api/me`)
  .catch(e => {
    console.log("caught error")
    myLevelsbutton.innerText = "Sign In"
    myLevelsbutton.href = "/login"
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
  tilesetMap.set(path, tileset)
  return tileset
}

async function renderLevelPreview(canvas, levelData) {
  let tileset = await loadTileset(levelData.data.tilesetPath)
  tileset = Object.values(tileset)
  console.log(tileset)
  if (!canvas || !levelData) return
  const tilesize = 25
  const ctx = canvas.getContext("2d")

  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#C29A62"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const decoded = decodeRLE(levelData.data.layers[0].data)
  const shifted = decoded.map(t => t << 4)
  const data = calculateAdjacencies(shifted, levelData.width, levelData.height, tileset)

  const rotationData = decodeRLE(levelData.data.layers[1] ? levelData.data.layers[1].data : [])
  console.log(rotationData)

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
  const maxCamY = (levelData.width * tilesize) - canvas.height

  camX = Math.max(0, Math.min(camX, maxCamX > 0 ? maxCamX : 0))
  camY = Math.max(0, Math.min(camY, maxCamY > 0 ? maxCamY : 0))

  const startCol = Math.floor(camX / tilesize)
  const endCol = startCol + Math.ceil(canvas.width / tilesize) + 1
  const startRow = Math.floor(camY / tilesize)
  const endRow = Math.ceil((camY + canvas.height) / tilesize)


  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const idx = y * levelData.width + x;
      const rotated = data[idx] + rotationData[idx]
      const raw = data[idx]

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
}
