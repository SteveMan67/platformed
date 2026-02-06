import { initEditor } from "./editor.js";
import { initPlatformer, loadPlayerSprites, loadTileset, platformerLoop, splitStripImages } from "./platformer.js";
import { levelEditorLoop } from "./editor.js";
import { addTileSelection, toggleEditorUI } from "./ui.js";
import { canvas } from "./renderer.js";

export let mode = "editor"

export const state = {
  player: {
    dieCameraTime: 30, // frames
    dieCameraTimer: 30,
    dieCameraStart: {},
    died: false,
    collectedCoins: 0,
    collectedCoinList: [],
    cam: {x: 0, y: 0},
    vy: 0,
    vx: 0, 
    jumpHeight: 2.5,
    yInertia: 1,
    jumpWidth: 7,
    xInertia: 1.5,
    bouncePadHeight: 8,
    x: 0, 
    y: 0,
    w: 30,
    h: 30,
    stopThreshold: 0.4,
    grounded: false,
    coyoteTime: 5,
    coyoteTimer: 0,
    wallCoyoteTime: 10,
    wallCoyoteTimer: 0,
    lastWallSide: 0,
    jumpBuffer: 10,
    jumpBufferTimer: 0,
    tileSize: 64,
    lastCheckpointSpawn: {x: 0, y: 0},
    facingLeft: 1,
    AnimationFrame: 0,
    AnimationFrameCounter: 0,
    wallJump: "up",
    decreaseAirControl: true,
    autoJump: false,
    controlTimer: 0,
    controlMultiplier: 1,
    dissipations: [] // each item has a timeToDissapate, timeToReturn, timer, and tileIdx
  },
  editor: {
    cam: {
      x: 0,
      y: 0
    },
    currentRotation: 0,
    playerSpawn: {x: 0, y: 0},
    tileSize: 32,
    selectedTile: 1,
    lastSelectedTiles: [2, 1], // [1] is the current selected tile
    map: {
      w: 100,
      h: 50,
      tiles: new Uint16Array(100 * 50)
    },
    width: 100,
    height: 50,
    tileset: [],
    limitedPlacedTiles: [],
    tilesetPath: "./assets/medium.json",
    dissipateTime: 2 * 60,
    dissipateDelay: 2 * 60,
  },
}

export function endLevel() {
  mode = "editor"
  setTimeout(initEditor, 1)
}


export const input = {
  x: 0,
  y: 0,
  down: false,
  keys: {}
}
export function setMode(desiredMode) {
  mode = desiredMode
  if (mode === "platformer") {
    toggleEditorUI(false)
    initPlatformer()
  } else {
    toggleEditorUI(true)
    initEditor()
  }
}

let timestamp = 0
let lastTime = 0

function engineLoop() {
  const dt = deltaTime(timestamp)
  if (mode === "play") {
    platformerLoop(dt)
  } else {
    levelEditorLoop(dt)
  }
  requestAnimationFrame(engineLoop, timestamp)
}

engineLoop()

export function deltaTime(timestamp) {
  if (!timestamp) timestamp = performance.now()
  if (lastTime === 0) lastTime = timestamp
  const seconds = (timestamp - lastTime) / 1000
  lastTime = timestamp
  return Math.min(seconds, 0.1)
}

export function key(key) {
  if (key === "right") {
    return !!(input.keys["d"] || input.keys["ArrowRight"])
  } else if (key === "left") {
    return !!(input.keys["a"] || input.keys["ArrowLeft"])
  } else if (key === "up") {
    return !!(input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"])
  } else if (key === "down") {
    return !!(input.keys['s'] || input.keys['ArrowDown'])
  } else if (key === "any") {
    return !!(input.keys["d"] || input.keys["ArrowRight"] || input.keys["a"] || input.keys["ArrowLeft"] || input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"])
  } else {
    return false
  }

}
export function init() {
  window.addEventListener('keydown', e => input.keys[e.key] = true)
  window.addEventListener('keyup', e => input.keys[e.key] = false)

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect()
    input.x = e.clientX - rect.left
    input.y = e.clientY - rect.top
  })
  canvas.addEventListener('mousedown', () => input.down = true)
  canvas.addEventListener('mouseup', () => input.down = false)

  loadTileset(editor.tilesetPath).then(({ tileset, characterImage }) => {
    editor.tileset = splitStripImages(tileset)
    loadPlayerSprites(characterImage)
    addTileSelection()
    engineLoop()
  })
}

init();

