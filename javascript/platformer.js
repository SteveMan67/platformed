import { toggleEditorUI, sortByCategory } from "./ui.js"
import { canvas, ctx, drawEnemies, drawMap, drawPlayer, getCameraCoords } from "./renderer.js"
import { endLevel, key, playSound, input, mode } from "./site.js"
import { state } from "./state.js"
import { createMap } from "./file-utils.js"
const { player, editor } = state


function getVariant(num) {
  return num >> 4
}

function getTileId(num) {
  return num & 15
}

export const enemies = []

function isStrip(img) {
  if (img) {
    const w = img.naturalWidth, h = img.naturalHeight
    if (w && h) {
      return w == h * 16
    }
  }
}

function getMechanics(idx) {
  const tiles = mode == "play" ? player.tiles : editor.map.tiles
  let outList = []
  if (idx >= 0 && idx < (editor.width * editor.height)) {
    const tilesetItem = editor.tileset[tiles[idx] >> 4]
    if (tilesetItem.id == 0 || !tilesetItem.mechanics) return outList
    outList = [...tilesetItem.mechanics]
    return outList
  } else {
    return outList
  }
}

export function calculateAdjacencies(tiles, w, h, tileset = editor.tileset) {
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

export function calculateAdjacency(tileIdx, tileId, tiles = editor.map.tiles, tileset = editor.tileset, w = editor.width, h = editor.height) {
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

export function calcAdjacentAdjacency(centerTileIdx, tile = editor.selectedTile, tiles = editor.map.tiles) {
  const centerVal = calculateAdjacency(centerTileIdx, tile, tiles)
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
      tiles[n] = calculateAdjacency(n, tileId, tiles)
    }
  })

  return centerVal
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
  const tiles = mode == "play" ? player.tiles : editor.map.tiles
  for (let i = 0; i < tiles.length; i++) {
    const raw = tiles[i]
    const tileId = raw >> 4
    if (tileId != 0 && editor.tileset[tileId] && editor.tileset[tileId].type == "enemy") {
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

export function initPlatformer() {
  toggleEditorUI(false)
  player.tiles = new Uint16Array(editor.map.tiles)
  player.toggledTile = true
  player.x = editor.playerSpawn.x * player.tileSize
  player.y = editor.playerSpawn.y * player.tileSize
  player.w = player.tileSize
  player.h = player.tileSize
  player.hitboxW = 0.8 * player.tileSize
  player.hitboxH = 0.8 * player.tileSize
  const ratio = player.tileSize / 64
  player.jump = getJumpHeight(player.jumpHeight + 0.3, player.yInertia, player.tileSize)
  player.speed = getJumpSpeed(player.jumpWidth - 1, player.jump, player.yInertia, player.tileSize)
  player.stopThreshold = 0.4 * ratio
  player.x = editor.playerSpawn.x * player.tileSize
  player.y = editor.playerSpawn.y * player.tileSize
  player.lastCheckpointSpawn = { x: 0, y: 0 }
  player.collectedCoinList = []
  scanLevelOnPlay()
}

export function killPlayer() {
  if (mode == "editor") return
  player.toggledTile = true,
    player.vy = 0
  player.vx = 0
  player.died = true
  player.dieCameraTimer = player.dieCameraTime
  player.dieCameraStart = { x: player.cam.x, y: player.cam.y }
  if (player.lastCheckpointSpawn.y !== 0 && player.lastCheckpointSpawn.x !== 0) {
    player.x = player.lastCheckpointSpawn.x * player.tileSize
    player.y = player.lastCheckpointSpawn.y * player.tileSize
  } else {
    player.x = editor.playerSpawn.x * player.tileSize
    player.y = editor.playerSpawn.y * player.tileSize
  }

  input.keys[" "] = false
  playSound("/assets/audio/death.wav")
  playSound("/assets/audio/deathmusic.wav")
}

const tileMaskCache = new Map()

function checkPixelCollsion(tile, tx, ty, px, py, pw, ph) {
  const tileId = tile
  let mask = tileMaskCache.get(tile)
  if (!mask) {
    const tile = editor.tileset[tileId >> 4]
    if (!tile) return false
    let img
    if (tile.images && tile.images.length > 0) {
      // calculate the frame 
      if (tile.type == "rotation") {
        img = tile.images[tileId & 3]
      } else {
        img = tile.images[0]
      }
      console.log(img, img.width, img.height)
    } else {
      img = tile.image
    }
    if (!img) return false

    const c = document.createElement('canvas')
    c.width = img.height || img.naturalHeight
    c.height = img.width || img.naturalWidth
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
      const u = (x - tileWorldX) / player.tileSize;
      const v = (y - tileWorldY) / player.tileSize;

      const localX = Math.floor(u * mask.w);
      const localY = Math.floor(v * mask.h);

      if (localX < 0 || localX >= mask.w || localY < 0 || localY >= mask.h) continue;

      const index = (localY * mask.w + localX) * 4 + 3;

      if (mask.data[index] > 10) {
        return true;
      }
    }
  }
  return false
}

function handleTriggers(tx, ty) {
  const trigger = player.triggers.find(f => f.x == tx && f.y == ty)
  if (!trigger) return
  player.standingOnTrigger = true

  for (const step of trigger.execute) {
    if (step.type == "toggleBlocks") {
      player.toggledTile = !player.toggledTile
    }
    if (step.type == "teleport") {
      if (!step.x || !step.y) continue
      teleportPlayer(step.x, step.y)
    }
    if (step.type == "rotate") {
      if (!step.x || !step.y || !step.rotation) return
      rotateTile(step.x, step.y, step.rotation)
    }
    if (step.type == "updateBlock") {
      if (step.x == undefined || step.y == undefined || step.block == undefined) return
      const idx = step.y * editor.width + step.x
      calcAdjacentAdjacency(idx, step.block, player.tiles)
    }
  }
}

function teleportPlayer(tx, ty) {
  player.vy = 0
  player.vx = 0
  player.died = true
  player.dieCameraTimer = player.dieCameraTime
  player.dieCameraStart = { x: player.cam.x, y: player.cam.y }
  player.x = tx * player.tileSize
  player.y = ty * player.tileSize
}

function rotateTile(tx, ty, amount) {
  const idx = ty * editor.width + tx
  const raw = player.tiles[idx]
  const rotation = raw & 3
  const newRotation = (rotation + amount) % 4
  if (editor.tileset[raw >> 4].type == "rotation") {
    player.tiles[idx] = (raw >> 4 << 4) + newRotation
  }
}
function mechanics(dt, tileIdx, tileId, tx, ty, x, y, w, h) {
  const tiles = mode == "play" ? player.tiles : editor.map.tiles
  const mechanics = editor.tileset[tileId].mechanics
  if (!mechanics) return
  if (mechanics.includes("killOnTouch")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      killPlayer()
    }
  }
  if (mechanics.includes("end")) {
    endLevel()
  }
  if (mechanics.includes("bouncePad")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx
      const bounceTile = tiles[idx]
      if ((bounceTile & 15) == 0) {
        player.vy = -getJumpHeight(player.bouncePadHeight, player.yInertia, player.tileSize)
      } else if ((bounceTile & 15) == 1) {
        player.vx = -getJumpHeight(player.bouncePadHeight, player.xInertia, player.tileSize)
      } else if ((bounceTile & 15) == 2) {
        player.vy = getJumpHeight(player.bouncePadHeight, player.yInertia, player.tileSize)
      } else if ((bounceTile & 15) == 3) {
        player.vx = getJumpHeight(player.bouncePadHeight, player.xInertia, player.tileSize)
      }
    }
  }
  if (mechanics.includes("checkpoint")) {
    if (player.lastCheckpointSpawn.x != tx && player.lastCheckpointSpawn.ty != ty) {
      playSound("/assets/audio/checkpoint.wav")
    }
    player.lastCheckpointSpawn = { x: tx, y: ty }
  }
  if (mechanics.includes("coin")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx
      player.collectedCoins++
      player.collectedCoinList.push(idx)
      playSound("/assets/audio/coin.wav", 0.25)
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
  if (mechanics.includes("trigger") && !player.standingOnTrigger) {
    handleTriggers(tx, ty)
  }
}

function checkCollision(dt, x, y, w, h, simulate = false) {
  const tiles = mode == "play" ? player.tiles : editor.map.tiles
  const startX = Math.floor(x / player.tileSize)
  const endX = Math.floor((x + w - 0.01) / player.tileSize)
  const startY = Math.floor(y / player.tileSize)
  const endY = Math.floor((y + h - 0.01) / player.tileSize)

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      if ((px < 0 || px >= editor.map.w || py < 0) && !simulate) return true
      const idx = py * editor.map.w + px
      const tileId = tiles[idx] >> 4

      const oldX = player.x;
      const oldY = player.y

      if (!player.collectedCoinList.includes(idx) && !simulate) mechanics(dt, idx, tileId, px, py, x, y, w, h)

      if (player.x !== oldX || player.y !== oldY) return false
      if (tileId !== 0) {
        const tile = editor.tileset[tileId]
        if (tile && tile.mechanics && tile.mechanics.includes("trigger")) {
          touchingTrigger = true
        }
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
          return checkPixelCollsion(tiles[idx], px, py, x, y, w, h)
        }
        if (tile && tile.mechanics && tile.mechanics.includes("swapTrigger1") && player.toggledTile) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("swapTrigger2") && !player.toggledTile) {
          continue
        }
        if (tile && tile.mechanics && tile.mechanics.includes("dissipate")) {
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
let touchingTrigger = false
let walljumpControlLimited = false

function updatePhysics(dt) {
  if (player.coyoteTimer > 0) player.coyoteTimer -= dt
  if (player.jumpBufferTimer > 0) player.jumpBufferTimer -= dt

  //determine whether jump was just pressed down
  let isJumping = false;
  if (key("up") || input.jumpButton) {
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

  if (player.vy > player.tileSize * 0.8) {
    player.vy = player.tileSize * 0.8
  }

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = -player.jump
    player.jumpBufferTimer = 0
    player.coyoteTimer = 0
    player.grounded = false

    playSound("/assets/audio/jump.wav", 0.1)
  }
  const jumpControl = player.decreaseAirControl && !player.grounded ? 1 : 1
  const currentControl = jumpControl * player.controlMultiplier
  let activeInput = false

  const moveLeft = (key("left") && !key("right")) || input.joystickX < -0.1
  const moveRight = (key("right") && !key("left")) || input.joystickX > 0.1

  if (moveLeft) {
    activeInput = true
    const analog = input.joystickX > 0.1 ? Math.abs(input.joystickX) : 1
    if (player.vx > -player.speed * analog) {
      player.vx -= player.xInertia * analog * currentControl * dt
    } else {
      player.vx = -player.speed * analog
    }
  }
  if (moveRight) {
    activeInput = true
    const analog = input.joystickX > 0.1 ? Math.abs(input.joystickX) : 1
    if (player.vx < player.speed * analog) {
      player.vx += player.xInertia * analog * currentControl * dt
    } else {
      player.vx = player.speed * analog
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
  touchingTrigger = false
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

  const touchingLeft = checkCollision(dt, player.x + offX - 2, player.y + offY + 2, player.hitboxW, player.hitboxH - 4, true)
  const touchingRight = checkCollision(dt, player.x + offX + 2, player.y + offY + 2, player.hitboxW, player.hitboxH - 4, true)

  if (!touchingTrigger) {
    player.standingOnTrigger = false
  }

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
  if (!player.grounded && player.wallJump !== "none" && key("any") && player.jumpBufferTimer !== 0 && !player.wallCoyoteTimer == 0) {

    if (player.wallJump == "off") {
      if (player.lastWallSide == 1 && (key("up") || input.jumpButton)) {
        player.vx = -player.speed
      } else if (player.lastWallSide == -1 && key("up") || input.jumpButton) {
        player.vx = player.speed
      }
      player.vy = -player.jump
      player.jumpBufferTimer = 0
      player.lastWallSide = 0
      player.wallCoyoteTimer = 0
      player.airControl = true
      limitControl(40, 0.0)
      playSound("/assets/audio/jump.wav", 0.1)
    } else if (player.wallJump == "up") {
      player.vx = player.lastWallSide == -1 ? player.speed * 1.2 : -player.speed * 1.2
      player.vy = -player.jump
      player.jumpBufferTimer = 0
      player.lastWallSide = 0
      player.wallCoyoteTimer = 0
      playSound("/assets/audio/jump.wav", 0.1)
    }
  }

  if (player.wallJump == "off" && !player.grounded && !walljumpControlLimited) {
    if (touchingLeft) {
      limitControl(20, 0)
      walljumpControlLimited = true
    } else if (touchingRight) {
      limitControl(20, 0)
      walljumpControlLimited = true
    } else {
      walljumpControlLimited = false
    }

  }
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

  if (!aabbIntersect(px, py, pw, ph, ex, ey, ew, eh)) return false

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

export function platformerLoop(dt) {
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
}

let once = true

function logCurrentMapAsJSON() {
  console.log(createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles)))
}