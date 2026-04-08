import {
  toggleEditorUI,
  sortByCategory,
  needsSmallerLevel,
  pollGamepad,
  updateDisplay,
} from "./ui.js";
import {
  canvas,
  ctx,
  drawEnemies,
  drawMap,
  drawMovingTiles,
  drawPlayer,
  getCameraCoords,
} from "./renderer.js";
import { endLevel, key, playSound, input, mode } from "./site.js";
import { state } from "./state.js";
import { createMap } from "./file-utils.js";
const { player, editor } = state;

export const enemies = [];

// I do these a lot so it's helpful to have a helper function
export function mechanicsHas(tileId, mechanic) {
  return (
    editor.tileset[tileId] &&
    editor.tileset[tileId].mechanics &&
    editor.tileset[tileId].mechanics.includes(mechanic)
  );
}

export function typeIs(tileId, type) {
  return editor.tileset[tileId] && editor.tileset[tileId].type == type;
}

export function triggersAdjacency(tileId) {
  return editor.tileset[tileId] && editor.tileset[tileId].triggerAdjacency;
}

/**
 * Calculates adjacencies for the whole level
 */
export function calculateAdjacencies(tiles, w, h, tileset = editor.tileset) {
  let out = [];
  // calculate all the adjacencies in a given level
  for (let i = 0; i < w * h; i++) {
    const raw = tiles[i];
    if (!raw) {
      out.push(0);
      continue;
    }
    const baseId = raw >> 4;
    out.push(calculateAdjacency(i, baseId, tiles, tileset, w, h));
  }
  return out;
}

/**
 * Calculates an adjacency for a specific tile
 */
export function calculateAdjacency(
  tileIdx,
  tileId,
  tiles = editor.map.tiles,
  tileset = editor.tileset,
  w = editor.width,
  h = editor.height,
) {
  let variant = 0;

  tileId = typeof tileId === "number" ? tileId : tiles[tileIdx] >> 4;
  if (tileId == 0) return 0;

  // we don't need to calculate adjacencies for rotation
  if (tileset[tileId] && tileset[tileId].type == "rotation") {
    return tiles[tileIdx];
  }

  // calculate which tiles are where around the tile so we know what variant to use 
  const getNeighborId = (idx) => {
    const val = tiles[idx];
    return val ? val >> 4 : 0;
  };

  const check = (idx) => {
    const nid = getNeighborId(idx);
    if (nid === 0) return false;
    const t = tileset[nid];
    return t && t.triggerAdjacency;
  };
  // top
  if (tileIdx - w >= 0) {
    if (check(tileIdx - w)) variant += 1;
  } else {
    variant += 1;
  }
  // right
  if (tileIdx + 1 < tiles.length && (tileIdx + 1) % w !== 0) {
    if (check(tileIdx + 1)) variant += 2;
  } else {
    variant += 2;
  }
  // bottom
  if (tileIdx + w < tiles.length) {
    if (check(tileIdx + w)) variant += 4;
  } else {
    variant += 4;
  }
  // left
  if (tileIdx - 1 >= 0 && tileIdx % w !== 0) {
    if (check(tileIdx - 1)) variant += 8;
  } else {
    variant += 8;
  }

  return tileId * 16 + variant;
}

/**
 * Calculates the adjacency and 4 surrounding adjacencies for a given tile index
 * also sets the tile index to tile passed in
 * @param {number} idx - The index of the tile
 * @param {number} tile - The tileId of the tile @default editor.selectedTile
 * @param {Uint16Array} tiles - what tileset to use
 * @returns The raw center tile
 */
export function calcAdjacentAdjacency(
  idx,
  tile = editor.selectedTile,
  tiles = editor.map.tiles,
) {
  let beforeRotation = 0;
  const tileId = tiles[idx] >> 4;
  if (typeIs(tileId, "rotation")) {
    beforeRotation = tiles[idx] & 3;
  }
  if (triggersAdjacency(tile)) {
    tiles[idx] = tile << 4;
  }
  const centerVal = calculateAdjacency(idx, tile, tiles);

  if (typeIs(tileId, "rotation")) {
    tiles[idx] = ((centerVal >> 2) << 2) + beforeRotation;
  } else {
    tiles[idx] = centerVal;
  }

  const w = editor.width;
  const neighbors = [];
  if (idx - w >= 0) neighbors.push(idx - w);
  if (idx % w < w - 1 && idx + 1 < tiles.length) neighbors.push(idx + 1);
  if (idx % w > 0 && idx - 1 >= 0) neighbors.push(idx - 1);
  if (idx + w < tiles.length) neighbors.push(idx + w);

  neighbors.forEach((n) => {
    const tileId = tiles[n] >> 4;
    if (tileId !== 0 && typeIs(tileId, "adjacency")) {
      tiles[n] = calculateAdjacency(n, tileId, tiles);
    }
  });

  return centerVal;
}

/**
 *
 * @param {number} heightInTiles - how high the jump should be
 * @param {number} yInertia - the yIntertia value
 * @param {number} tileSize - the tileSize in pixels
 * @returns the jump height value needed for that jump height
 */
function getJumpHeight(heightInTiles, yInertia, tileSize) {
  const gravity = (0.7 * yInertia + 0.5) * (tileSize / 64);
  const maxHeightInPixels = heightInTiles * tileSize;
  const minHeightInPixels = heightInTiles * 0.3 * tileSize;
  return {
    max: Math.sqrt(2 * gravity * maxHeightInPixels),
    min: Math.sqrt(2 * gravity * minHeightInPixels),
  };
}

function getJumpSpeed(jumpLengthInTiles, jumpForce, yInertia, tilesize) {
  const gravity = (0.7 * yInertia + 0.5) * (tilesize / 64);
  let vy = -jumpForce;
  let y = 0;
  let frames = 0;

  while (y <= 0) {
    y += vy;
    vy += gravity;
    frames++;
  }

  const distance = jumpLengthInTiles * player.tileSize;
  return distance / frames;
}

function scanLevelOnPlay() {
  player.collectedCoins = 0;
  player.coinsInLevel = 0;
  // enemies
  const tiles = mode == "play" ? player.tiles : editor.map.tiles;
  for (let i = 0; i < tiles.length; i++) {
    const raw = tiles[i];
    const tileId = raw >> 4;
    if (tileId != 0 && typeIs(tileId, "enemy")) {
      const ty = Math.floor(i / editor.map.w);
      const tx = i % editor.map.w;
      const worldY = ty * player.tileSize;
      const worldX = tx * player.tileSize;
      const enemy = {
        x: worldX,
        y: worldY,
        vx: 0,
        vy: 0,
        tileId: tileId,
        speed: 5,
        direction: 1,
      };
      enemies.push(enemy);
    } else if (tileId !== 0 && mechanicsHas(tileId, "movingBlock")) {
      const ty = Math.floor(i / editor.map.w);
      const tx = i % editor.map.w;
      const worldY = ty * player.tileSize;
      const worldX = tx * player.tileSize;
      player.tiles[i] = 0;
      player.movingBlocks.push({
        image: editor.tileset[tileId]?.images[raw & 15],
        x: worldX,
        y: worldY,
        w: player.tileSize,
        h: player.tileSize,
        vx: 2,
        vy: 0,
        startX: worldX,
        startY: worldY,
        direction: 1,
      });
    } else if (tileId !== 0 && mechanicsHas(tileId, "coin")) {
      player.coinsInLevel++;
    }
  }
  updateDisplay();
}

export function updatePhysicsConstants() {
  const ratio = player.tileSize / 64;
  const jumpInfo = getJumpHeight(
    player.jumpHeight + 0.3,
    player.yInertia,
    player.tileSize,
  );
  player.jump = jumpInfo.max;
  player.minJump = jumpInfo.min;
  player.speed = getJumpSpeed(
    player.jumpWidth - 1,
    player.jump,
    player.yInertia,
    player.tileSize,
  );
  player.x = editor.playerSpawn.x * player.tileSize;
  player.y = editor.playerSpawn.y * player.tileSize;
  player.vy = 0;
  player.vx = 0;
  player.w = player.tileSize;
  player.h = player.tileSize;
  player.hitboxW = 0.8 * player.tileSize;
  player.hitboxH = 0.95 * player.tileSize;
  player.stopThreshold = 0.4 * ratio;
}

export function initPlatformer() {
  toggleEditorUI(false);
  player.tiles = new Uint16Array(editor.map.tiles);
  player.movingBlocks = [];
  player.toggledTile = true;
  player.lastCheckpointSpawn = { x: 0, y: 0 };
  player.collectedCoinList = [];
  player.triggerTimeouts = [];
  updatePhysicsConstants();
  scanLevelOnPlay();
}

export function killPlayer() {
  if (mode == "editor") return;
  ((player.toggledTile = true), (player.vy = 0));
  player.vx = 0;
  player.died = true;
  player.dieCameraTimer = player.dieCameraTime;
  player.dieCameraStart = { x: player.cam.x, y: player.cam.y };
  if (
    player.lastCheckpointSpawn.y !== 0 &&
    player.lastCheckpointSpawn.x !== 0
  ) {
    player.x = player.lastCheckpointSpawn.x * player.tileSize;
    player.y = player.lastCheckpointSpawn.y * player.tileSize;
  } else {
    player.x = editor.playerSpawn.x * player.tileSize;
    player.y = editor.playerSpawn.y * player.tileSize;
  }

  input.keys[" "] = false;
  playSound("/assets/audio/death.wav");
  playSound("/assets/audio/deathmusic.wav");
}

const tileMaskCache = new Map();

function checkPixelCollsion(tile, tx, ty, px, py, pw, ph) {
  const tileId = tile;
  let mask = tileMaskCache.get(tile);
  if (!mask) {
    const tile = editor.tileset[tileId >> 4];
    if (!tile) return false;
    let img;
    if (tile.images && tile.images.length > 0) {
      // calculate the frame
      if (tile.type == "rotation") {
        img = tile.images[tileId & 3];
      } else {
        img = tile.images[0];
      }
    } else {
      img = tile.image;
    }
    if (!img) return false;

    const c = document.createElement("canvas");
    c.width = img.height || img.naturalHeight;
    c.height = img.width || img.naturalWidth;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    mask = { w: c.width, h: c.height, data: data };
    tileMaskCache.set(tileId, mask);
  }

  const tileWorldX = tx * player.tileSize;
  const tileWorldY = ty * player.tileSize;

  const intersectionLeft = Math.max(px, tileWorldX);
  const intersectionTop = Math.max(py, tileWorldY);
  const intersectionRight = Math.min(px + pw, tileWorldX + player.tileSize);
  const intersectionBottom = Math.min(py + ph, tileWorldY + player.tileSize);

  if (
    intersectionLeft >= intersectionRight ||
    intersectionTop >= intersectionBottom
  )
    return false;

  for (let y = intersectionTop; y < intersectionBottom; y += 2) {
    for (let x = intersectionLeft; x < intersectionRight; x += 2) {
      const u = (x - tileWorldX) / player.tileSize;
      const v = (y - tileWorldY) / player.tileSize;

      const localX = Math.floor(u * mask.w);
      const localY = Math.floor(v * mask.h);

      if (localX < 0 || localX >= mask.w || localY < 0 || localY >= mask.h)
        continue;

      const index = (localY * mask.w + localX) * 4 + 3;

      if (mask.data[index] > 10) {
        return true;
      }
    }
  }
  return false;
}

function fillSelection(startX, startY, endX, endY, tileId) {
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const idx = y * editor.width + x;
      calcAdjacentAdjacency(idx, tileId, player.tiles);
    }
  }
}

function handleTriggers(tx, ty) {
  const trigger = player.triggers.find((f) => f.x == tx && f.y == ty);
  if (!trigger) return;
  player.standingOnTrigger = true;

  const executeTriggerSteps = (trigger, startIndex = 0) => {
    for (let i = startIndex; i < trigger.execute.length; i++) {
      const step = trigger.execute[i];
      if (!step) return;
      if (step.type == "toggleBlocks") {
        player.toggledTile = !player.toggledTile;
        continue;
      }
      if (step.type == "teleport") {
        if (step.x == undefined || step.y == undefined) continue;
        teleportPlayer(step.x, step.y, step.instant || false);
        continue;
      }
      if (step.type == "rotate") {
        if (!step.x || !step.y || !step.beforeRotation) return;

        rotateTile(step.x, step.y, step.beforeRotation);

        continue;
      }
      if (step.type == "change") {
        if (step.x == undefined || step.y == undefined) return;
        if (step.block !== undefined) {
          const idx = step.y * editor.width + step.x;
          calcAdjacentAdjacency(idx, step.block, player.tiles);
          player.tiles[idx] = step.block << 4;
        }
        if (step.rotate !== undefined) {
          rotateTile(step.x, step.y, step.rotate);
        }
        if (step.rotation !== undefined) {
          rotateTile(step.x, step.y, step.rotate);
        }
      }
      if (step.type == "if") {
        if (step.condition === undefined) return;
        const cond = step.condition;
        let isTrue = false;

        if (cond.subject === "BLOCK") {
          const idx = cond.y * editor.map.w + cond.x;
          if (cond.operator === "IS") {
            if (cond.property === "TYPE") {
              isTrue = typeIs(player.tiles[idx] >> 4, cond.value);
            }
            if (cond.property === "TILEID") {
              isTrue = player.tiles[idx] >> 4 === cond.value;
            }
            if (cond.property === "ROTATION") {
              isTrue = player.tiles[idx] & (3 === cond.value);
            }
          }
        }
        if (!isTrue) {
          // skip to the end or the else statement
          for (let x = i; x < trigger.execute.length; x++) {
            if (
              trigger.execute[x].type === "else" ||
              trigger.execute[x].type === "end"
            ) {
              executeTriggerSteps(trigger, x);
              return;
            }
          }
        } else {
          player.skipElse = true;
        }
      }
      if (step.type == "else") {
        if (player.skipElse) {
          // if condition was true, skip this one
          for (let x = i; x < trigger.execute.length; x++) {
            if (trigger.execute[x].type === "end") {
              executeTriggerSteps(trigger, x);
              return;
            }
          }
        }
      }
      if (step.type == "fill") {
        if (
          step.startX === undefined ||
          step.startY === undefined ||
          step.endX === undefined ||
          step.endY === undefined ||
          step.block === undefined
        )
          return;
        const minX = Math.min(step.startX, step.endX);
        const maxX = Math.max(step.startX, step.endX);
        const minY = Math.min(step.startY, step.endY);
        const maxY = Math.max(step.startY, step.endY);

        fillSelection(minX, minY, maxX, maxY, step.block);
      }
      if (step.type == "end") {
        player.skipElse = false;
      }
      if (step.type == "updateBlock") {
        if (
          step.x == undefined ||
          step.y == undefined ||
          step.block == undefined
        )
          return;
        const idx = step.y * editor.width + step.x;
        calcAdjacentAdjacency(idx, step.block, player.tiles);
        player.tiles[idx] = step.block << 4;
        continue;
      }
      if (step.type == "delay") {
        if (step.time === undefined) continue;
        const ms = step.time;

        const tid = setTimeout(() => {
          const index = player.triggerTimeouts.indexOf(tid);
          if (index !== -1) player.triggerTimeouts.splice(index, 1);
          executeTriggerSteps(trigger, i + 1);
        }, ms);
        player.triggerTimeouts.push(tid);
        return;
      }
    }
  };
  executeTriggerSteps(trigger, 0);
}

function teleportPlayer(tx, ty, instant) {
  if (instant) {
    player.x = tx * player.tileSize;
    player.y = ty * player.tileSize;
  } else {
    player.vy = 0;
    player.vx = 0;
    player.died = true;
    player.dieCameraTimer = player.dieCameraTime;
    player.dieCameraStart = { x: player.cam.x, y: player.cam.y };
    player.x = tx * player.tileSize;
    player.y = ty * player.tileSize;
  }
}

function rotateTile(tx, ty, amount) {
  const idx = ty * editor.width + tx;
  const raw = player.tiles[idx];
  const rotation = raw & 3;
  const newRotation = (rotation + amount) % 4;
  if (typeIs(raw >> 4, "rotation")) {
    player.tiles[idx] = ((raw >> 4) << 4) + newRotation;
  }
}
function mechanics(dt, tileIdx, tileId, tx, ty, x, y, w, h) {
  const tiles = mode == "play" ? player.tiles : editor.map.tiles;
  const mechanics = editor.tileset[tileId]?.mechanics;
  if (!mechanics) return;
  if (mechanics.includes("killOnTouch")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      killPlayer();
    }
  }
  if (mechanics.includes("end")) {
    if (player.requireCoins && player.collectedCoins == player.coinsInLevel) {
      endLevel();
    } else if (!player.requireCoins) {
      endLevel();
    } else {
      killPlayer();
    }
  }
  if (mechanics.includes("bouncePad")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx;
      const bounceTile = tiles[idx];
      if ((bounceTile & 15) == 0) {
        player.vy = -getJumpHeight(
          player.bouncePadHeight,
          player.yInertia,
          player.tileSize,
        ).max;
      } else if ((bounceTile & 15) == 1) {
        player.vx = -getJumpHeight(
          player.bouncePadHeight,
          player.xInertia,
          player.tileSize,
        ).max;
      } else if ((bounceTile & 15) == 2) {
        player.vy = getJumpHeight(
          player.bouncePadHeight,
          player.yInertia,
          player.tileSize,
        ).max;
      } else if ((bounceTile & 15) == 3) {
        player.vx = getJumpHeight(
          player.bouncePadHeight,
          player.xInertia,
          player.tileSize,
        ).max;
      }
      player.limitJumpControl = true;
    }
  }
  if (mechanics.includes("checkpoint")) {
    if (
      player.lastCheckpointSpawn.x != tx &&
      player.lastCheckpointSpawn.y != ty
    ) {
      playSound("/assets/audio/checkpoint.wav");
    }
    player.lastCheckpointSpawn = { x: tx, y: ty };
  }
  if (mechanics.includes("coin")) {
    if (checkPixelCollsion(tiles[tileIdx], tx, ty, x, y, w, h)) {
      const idx = ty * editor.map.w + tx;
      player.collectedCoins++;
      player.collectedCoinList.push(idx);
      playSound("/assets/audio/coin.wav", 0.25);
      updateDisplay();
    }
  }
  if (mechanics.includes("dissipate")) {
    let dissipation = player.dissipations.find((f) => f.tileIdx == tileIdx);
    if (dissipation) {
      if (dissipation.timer > dissipation.timeToDissipate) {
        dissipation.timer -= dt;
      } else if (dissipation.timer <= 0) {
        dissipation.timer = dissipation.timeToReturn;
      }
    } else {
      // initialize the dissipation
      dissipation = {
        timeToDissipate: editor.dissipateTime,
        timeToReturn: editor.dissipateTime + editor.dissipateDelay,
        timer: editor.dissipateTime + editor.dissipateDelay,
        tileIdx: tileIdx,
      };
      player.dissipations.push(dissipation);
    }
  }
  if (mechanics.includes("trigger") && !player.standingOnTrigger) {
    handleTriggers(tx, ty);
  }
}

function checkCollision(dt, x, y, w, h, simulate = false) {
  const tiles = mode == "play" ? player.tiles : editor.map.tiles;
  const startX = Math.floor(x / player.tileSize);
  const endX = Math.floor((x + w - 0.01) / player.tileSize);
  const startY = Math.floor(y / player.tileSize);
  const endY = Math.floor((y + h - 0.01) / player.tileSize);

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      if ((px < 0 || px >= editor.map.w || py < 0)) return true;
      const idx = py * editor.map.w + px;
      const tileId = tiles[idx] >> 4;

      const oldX = player.x;
      const oldY = player.y;

      if (!player.collectedCoinList.includes(idx) && !simulate)
        mechanics(dt, idx, tileId, px, py, x, y, w, h);

      if (player.x !== oldX || player.y !== oldY) return false;
      if (tileId !== 0) {
        let skipCollision = false
        if (mechanicsHas(tileId, "trigger")) {
          touchingTrigger = true;
        }
        if (mechanicsHas(tileId, "noCollision")) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "killOnTouch")) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "hidden")) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "bouncePad")) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "noCollision")) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "swapTrigger1") && player.toggledTile) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "pixelCollision")) {
          skipCollision = !checkPixelCollsion(tiles[idx], px, py, x, y, w, h);
        }
        if (mechanicsHas(tileId, "swapTrigger2") && !player.toggledTile) {
          skipCollision = true
        }
        if (mechanicsHas(tileId, "dissipate")) {
          const dissipation = player.dissipations.find(
            (d) => d.tileIdx === idx,
          );
          if (
            dissipation &&
            dissipation.timer <= dissipation.timeToDissipate &&
            dissipation.timer > 0
          ) {
            skipCollision = true
          }
        }
        if (player.collectedCoinList.includes(idx)) skipCollision = true
        if (!editor.tileset[tileId]) {
          skipCollision = true
        }

        if (!skipCollision) {
          return true;
        }
        continue
      }
    }
  }

  for (const block of player.movingBlocks) {
    if (aabbIntersect(x, y, w, h, block.x, block.y, block.w, block.h)) {
      return true
    }
  }


  return false;
}

function getMovingBlockHit(px, py, pw, ph) {
  let best = null;

  for (const block of player.movingBlocks) {
    if (!aabbIntersect(px, py, pw, ph, block.x, block.y, block.w, block.h))
      continue;

    const overlapLeft = px + pw - block.x;
    const overlapRight = block.x + block.w - px;
    const overlapTop = py + ph - block.y;
    const overlapBottom = block.y + block.h - py;

    const penX = Math.min(overlapLeft, overlapRight);
    const penY = Math.min(overlapTop, overlapBottom);

    const hit = {
      block,
      axis: penX < penY ? "x" : "y",
      penX,
      penY,
      nx: px + pw * 0.5 < block.x + block.w * 0.5 ? -1 : 1,
      ny: py + ph * 0.5 < block.y + block.h * 0.5 ? -1 : 1,
    };

    if (
      !best ||
      Math.min(hit.penX, hit.penY) < Math.min(best.penX, best.penY)
    ) {
      best = hit;
    }
  }

  return best;
}

function updateMovingBlocks(dt) {
  player.onMovingPlatform = false;
  let alreadyMovedByPlatform = false;
  for (const block of player.movingBlocks) {
    const dx = block.vx * dt;
    const dy = block.vy * dt;

    const offX = (player.w - player.hitboxW) / 2;
    const offY = player.h - player.hitboxH;
    const px = player.x + offX;
    const py = player.y + offY;
    const pw = player.hitboxW;
    const ph = player.hitboxH;

    const standEps = Math.max(1, Math.abs(dy) + 0.25);
    const edgeEps = 0.5;

    const feet = py + ph;
    const isStandingOn =
      Math.abs(feet - block.y) <= standEps &&
      px + pw > block.x + edgeEps &&
      px < block.x + block.w - edgeEps &&
      player.vy >= 0;

    block.x += dx;
    block.y += dy;

    if (isStandingOn) {
      player.onMovingPlatform = true;
      if (!alreadyMovedByPlatform) {
        player.x += dx;
        alreadyMovedByPlatform = true;
      }

      player.y = block.y - ph - offY - 0.01;

      player.grounded = true;
      player.vy = 0;
      player.coyoteTimer = player.coyoteTime;
    }

    const newPx = player.x + offX;
    const newPy = player.y + offY;

    const hit = getMovingBlockHit(newPx, newPy, pw, ph);
    if (!isStandingOn && hit && hit.block === block) {
      if (hit.axis === "x") {
        if (hit.nx < 0) {
          player.x = block.x - pw - offX - 0.01;
        } else {
          player.x = block.x + block.w - offX + 0.01;
        }
      } else {
        if (hit.ny < 0) {
          player.y = block.y - ph - offY - 0.01;
          player.vy = hit.block.vy;
          player.grounded = true;
        } else {
          player.y = block.y + block.h - offY + 0.01;
          if (player.vy < 0) player.vy = 0;
        }
      }

      const tileHit = checkCollision(
        dt,
        player.x + offX,
        player.y + offY,
        pw,
        ph,
      );

      const margin = 2;
      let isSquished = false;

      if (hit.axis == "x" && hit.block.vx !== 0) {
        isSquished = checkCollision(
          dt,
          player.x + offX,
          player.y + offY + margin,
          pw,
          ph - margin * 2,
          true,
        );
      } else if (hit.axis === "y" && hit.block.vx !== 0) {
        isSquished = checkCollision(
          dt,
          player.x + offX + margin,
          player.y + offY,
          pw - margin * 2,
          ph,
          true,
        );
      }

      // only kill the player if the they're being squished, not just pushed into a wall by standing on the platform
      if (isSquished) {
        killPlayer();
      }
    }
  }
}

function limitControl(time, multiplier) {
  if (multiplier == 1) {
    player.controlTimer = 0;
    player.controlMultiplier = 0;
  }

  if (time > player.controlTimer) {
    player.controlTimer = time;
    player.controlMultiplier = multiplier;
  }
}

let lastJumpInput = false;
let touchingTrigger = false;
let walljumpControlLimited = false;

function updatePhysics(dt) {
  if (player.coyoteTimer > 0) player.coyoteTimer -= dt;
  if (player.jumpBufferTimer > 0) player.jumpBufferTimer -= dt;

  // determine whether jump was just pressed down
  let isJumping = false;
  if (key("up") || input.jumpButton) {
    if (!lastJumpInput) {
      player.jumpBufferTimer = player.jumpBuffer;
      lastJumpInput = true;
      isJumping = true;
    }
  } else {
    lastJumpInput = false;
    isJumping = false;
  }

  if (player.controlTimer > 0) {
    player.controlTimer -= dt;
  } else {
    player.controlMultiplier = 1;
  }

  const gravity = (0.7 * player.yInertia + 0.5) * (player.tileSize / 64);
  if (!player.onMovingPlatform) {
    player.vy += gravity * dt;
  }

  if (player.grounded) {
    player.limitJumpControl = false;
  }

  if (player.vy > player.tileSize * 0.8) {
    player.vy = player.tileSize * 0.8;
  }

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = -player.jump;
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
    player.grounded = false;

    playSound("/assets/audio/jump.wav", 0.1);
  }
  const jumpControl = player.decreaseAirControl && !player.grounded ? 1 : 1;
  const currentControl = jumpControl * player.controlMultiplier;
  let activeInput = false;

  const scaledXInertia = player.xInertia * (player.tileSize / 64);

  let targetVx = 0;

  if (Math.abs(input.joystickX)) {
    activeInput = true;
    targetVx = player.speed * input.joystickX;
  } else if (key("left") && !key("right")) {
    activeInput = true;
    targetVx = -player.speed;
  } else if (key("right") && !key("left")) {
    activeInput = true;
    targetVx = player.speed;
  }

  function slowDown() {
    if (player.physicsVersion === 2) {
      const slidiness = Math.max(player.slidiness, 0.05);
      const midairSlidiness = Math.max(slidiness - 0.4, 0.2);
      const outSlidiness = player.grounded ? slidiness : midairSlidiness;
      if (player.vx < 0) {
        player.vx += scaledXInertia * outSlidiness * dt;
        if (player.vx > 0) player.vx = 0;
      } else if (player.vx > 0) {
        player.vx -= scaledXInertia * outSlidiness * dt;
        if (player.vx < 0) player.vx = 0;
      }
      if (Math.abs(player.vx) < player.stopThreshold) {
        player.vx = 0;
      }
    } else {
      if (player.vx < 0) {
        player.vx += scaledXInertia * 0.45 * dt;
        if (player.vx > 0) player.vx = 0;
      } else if (player.vx > 0) {
        player.vx -= scaledXInertia * 0.45 * dt;
        if (player.vx < 0) player.vx = 0;
      }
      if (Math.abs(player.vx) < player.stopThreshold) {
        player.vx = 0;
      }
    }
  }

  const inputDir = Math.sign(targetVx);

  if (
    Math.abs(player.vx) < Math.abs(targetVx) ||
    Math.abs(player.vx) === Math.abs(targetVx)
  ) {
    player.vx += inputDir * scaledXInertia * currentControl * dt;
  } else {
    slowDown();
  }

  const offX = (player.w - player.hitboxW) / 2;
  const offY = player.h - player.hitboxH;

  player.x += player.vx * dt;
  touchingTrigger = false;

  const tileHitX = checkCollision(
    dt,
    player.x + offX,
    player.y + offY,
    player.hitboxW,
    player.hitboxH,
  );
  if (tileHitX) {
    let dir = 0
    if (player.vx > 0) {
      dir = -1
    } else if (player.vx < 0) {
      dir = 1
    } else {
      const centerX = player.x + offX + player.hitboxW / 2
      const relativeX = centerX % player.tileSize
      dir = relativeX > player.tileSize / 2 ? -1 : 1
    }

    let maxPush = 0.5
    while (checkCollision(dt, player.x + offX + (dir * maxPush), player.y + offY, player.hitboxW, player.hitboxH, true) && maxPush < player.tileSize) {
      maxPush *= 2
    }

    let minPush = 0
    for (let i = 0; i < 10; i++) {
      let mid = (minPush + maxPush) / 2
      if (checkCollision(dt, player.x + offX + (dir * mid), player.y + offY, player.hitboxW, player.hitboxH, true)) {
        minPush = mid
      } else {
        maxPush = mid
      }
    }

    player.x += (dir * maxPush) + (dir * 0.01)
    player.vx = 0
  }

  player.y += player.vy * dt;
  player.grounded = false;

  const tileHitY = checkCollision(
    dt,
    player.x + offX + 0.03,
    player.y + offY,
    player.hitboxW - 0.06,
    player.hitboxH,
  );
  if (tileHitY) {
    let dir = 0
    if (player.vy >= 0) {
      dir = -1
    } else if (player.vy < 0) {
      dir = 1
    }

    let maxPush = 0.5
    while (checkCollision(dt, player.x + offX + 0.05, player.y + offY + (dir * maxPush), player.hitboxW - 0.1, player.hitboxH, true) && maxPush < player.tileSize) {
      maxPush *= 2
    }

    let minPush = 0
    for (let i = 0; i < 10; i++) {
      let mid = (minPush + maxPush) / 2
      if (checkCollision(dt, player.x + offX + 0.05, player.y + offY + (dir * mid), player.hitboxW - 0.1, player.hitboxH, true)) {
        minPush = mid
      } else {
        maxPush = mid
      }
    }
    player.y += (dir * maxPush) + (dir * 0.01)

    if (player.vy >= 0) {
      player.grounded = true
      player.coyoteTimer = player.coyoteTime
    }
    player.vy = 0
  } else if (!player.onMovingPlatform) {
    player.grounded = false;
  }

  if (
    player.vy < -player.minJump &&
    !key("up") &&
    !input.jumpButton &&
    !player.limitJumpControl &&
    !player.grounded
  ) {
    player.vy = -player.minJump;
  }


  if (player.y > editor.map.h * player.tileSize) {
    killPlayer();
  }

  const touchingLeft =
    checkCollision(
      dt,
      player.x + offX - 2,
      player.y + offY + 2,
      player.hitboxW,
      player.hitboxH - 4,
      true,
    )
  const touchingRight =
    checkCollision(
      dt,
      player.x + offX + 2,
      player.y + offY + 2,
      player.hitboxW,
      player.hitboxH - 4,
      true,
    )

  if (!touchingTrigger) {
    player.standingOnTrigger = false;
  }

  // coyote timer
  if (touchingLeft) {
    player.wallCoyoteTimer = player.wallCoyoteTime;
    player.lastWallSide = -1;
  } else if (touchingRight) {
    player.wallCoyoteTimer = player.wallCoyoteTime;
    player.lastWallSide = 1;
  } else if (player.wallCoyoteTimer > 0) {
    player.wallCoyoteTimer -= dt;
  }

  if (player.grounded) limitControl(0, 1);

  // walljump
  if (
    !player.grounded &&
    player.wallJump !== "none" &&
    key("any") &&
    player.jumpBufferTimer > 0 &&
    player.wallCoyoteTimer > 0
  ) {
    if (player.wallJump == "off") {
      if (
        player.lastWallSide == 1 &&
        (key("right") || key("up") || input.jumpButton)
      ) {
        player.vx = -player.speed;
        player.x -= 2.1;
      } else if (
        player.lastWallSide == -1 &&
        (key("left") || key("up") || input.jumpButton)
      ) {
        player.vx = player.speed;
        player.x += 2.1;
      }
      player.vy = -player.jump;
      player.jumpBufferTimer = 0;
      player.lastWallSide = 0;
      player.wallCoyoteTimer = 0;
      player.airControl = true;
      limitControl(23.5, 0.0);
      playSound("/assets/audio/jump.wav", 0.1);
    } else if (player.wallJump == "up") {
      player.vx =
        player.lastWallSide == -1 ? player.speed * 1.2 : -player.speed * 1.2;
      player.vy = -player.jump;
      player.jumpBufferTimer = 0;
      player.lastWallSide = 0;
      player.wallCoyoteTimer = 0;
      playSound("/assets/audio/jump.wav", 0.1);
    }
  }

  if (player.wallJump == "off" && !player.grounded && !walljumpControlLimited) {
    if (touchingLeft || touchingRight) {
      limitControl(10, 0);
      walljumpControlLimited = true;
    } else {
      walljumpControlLimited = false;
    }
  }
}

function aabbIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function handleEnemyCollision(enemy, dt) {
  const offX = (player.w - player.hitboxW) / 2;
  const offY = player.h - player.hitboxH;
  const px = player.x + offX;
  const py = player.y + offY;
  const pw = player.hitboxW;
  const ph = player.hitboxH;

  const ex = enemy.x;
  const ey = enemy.y;
  const ew = player.tileSize;
  const eh = player.tileSize;

  if (!aabbIntersect(px, py, pw, ph, ex, ey, ew, eh)) return false;

  if (py < ey) {
    // player stomped on enemy
    player.vy = -getJumpHeight(5, player.yInertia, player.tileSize).max;
    return true;
  } else {
    killPlayer();
  }
  return false;
}

function updateEnemyPhysics(dt) {
  const gravity = 0.7 * player.yInertia + 0.5;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.vy += gravity * dt;
    enemy.vx = enemy.speed * enemy.direction;
    enemy.x += enemy.vx * dt;
    if (
      checkCollision(dt, enemy.x, enemy.y, player.tileSize, player.tileSize)
    ) {
      if (enemy.vx > 0) {
        const hitright = enemy.x + player.tileSize;
        enemy.x =
          Math.floor(hitright / player.tileSize) * player.tileSize -
          player.tileSize;
        enemy.direction *= -1;
      } else if (enemy.vx < 0) {
        const hitLeft = enemy.x;
        enemy.x = (Math.floor(hitLeft / player.tileSize) + 1) * player.tileSize;
        enemy.direction *= -1;
      }
      enemy.vx = 0;
    }

    enemy.y += enemy.vy * dt;
    enemy.grounded = false;

    if (
      checkCollision(dt, enemy.x, enemy.y, player.tileSize, player.tileSize)
    ) {
      if (enemy.vy > 0) {
        const hitBottom = enemy.y + player.tileSize;
        const tileTop =
          Math.floor(hitBottom / player.tileSize) * player.tileSize;
        enemy.y = tileTop - player.tileSize;
        enemy.grounded = true;
      } else if (enemy.vy < 0) {
        enemy.y = (Math.floor(enemy.y / player.tileSize) + 1) * player.tileSize;
      }
      enemy.vy = 0;
    }

    if (enemy.y > editor.map.h * player.tileSize) {
      enemies.splice(i, 1);
    }
    if (handleEnemyCollision(enemy)) {
      enemies.splice(i, 1);
    }
  }
}

export function platformerLoop(dt) {
  const { colorTheme } = editor;
  pollGamepad();
  let timeScale = dt * 60;

  player.dissipations.forEach((dissipation) => {
    if (dissipation.timer > 0) {
      dissipation.timer -= timeScale;
    }
  });
  if (!player.died) {
    updateMovingBlocks(timeScale);
    updatePhysics(timeScale);
  }
  updateEnemyPhysics(timeScale);
  // don't update the camera if the player is in the middle section of the screen
  if (!player.died) {
    player.cam.x = getCameraCoords().x;
    player.cam.y = getCameraCoords().y;
  } else {
    // camera animation to respawn point
    if (player.dieCameraTimer > 0) {
      const progress =
        1 - Math.max(0, player.dieCameraTimer) / player.dieCameraTime;
      const ease = -(Math.cos(Math.PI * progress) - 1) / 2;
      const mapW = editor.map.w * player.tileSize;
      const mapH = editor.map.h * player.tileSize;
      ("#C29A62");
      let targetX = getCameraCoords().x;
      let targetY = getCameraCoords().y;

      player.cam.x =
        player.dieCameraStart.x + (targetX - player.dieCameraStart.x) * ease;
      player.cam.y =
        player.dieCameraStart.y + (targetY - player.dieCameraStart.y) * ease;
      player.dieCameraTimer -= timeScale;
    } else {
      player.died = false;
    }
  }

  if (player.cam.y < 0) {
    player.cam.y = 0;
  } else if (player.cam.y > editor.map.h * player.tileSize - canvas.height) {
    player.cam.y = editor.map.h * player.tileSize - canvas.height;
  }

  if (player.cam.x < 0) {
    player.cam.x = 0;
  } else if (player.cam.x > editor.map.w * player.tileSize - canvas.width) {
    player.cam.x = editor.map.w * player.tileSize - canvas.width;
  }

  ctx.fillStyle = colorTheme.bgLevel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMap(player.tileSize, player.cam);
  if (!player.died) {
    drawPlayer(timeScale);
  }
  drawEnemies(timeScale);
  drawMovingTiles(timeScale);
}

function logCurrentMapAsJSON() {
  console.log(
    createMap(editor.map.w, editor.map.h, Array.from(editor.map.tiles)),
  );
}
