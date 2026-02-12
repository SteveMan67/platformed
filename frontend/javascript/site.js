import { initEditor } from "./editor.js";
import { initPlatformer, platformerLoop } from "./platformer.js";
import { splitStripImages } from "./file-utils.js";
import { loadTileset } from "./file-utils.js";
import { loadPlayerSprites } from "./file-utils.js";
import { levelEditorLoop } from "./editor.js";
import { addEventListeners, addTileSelection, setInputEventListeners, toggleEditorUI } from "./ui.js";
import { state } from "./state.js"

const { editor } = state
export let mode = "editor"

export const inEditor = !window.location.pathname.startsWith("/level")

export function endLevel() {
  mode = "editor"
  setTimeout(initEditor, 1)
  playSound("./assets/audio/victory.wav")
}

export const input = {
  x: 0,
  y: 0,
  down: false,
  keys: {}
}

export function setMode(desiredMode) {
  if (desiredMode === "play" || inEditor) {
    toggleEditorUI(false)
    initPlatformer()
  } else {
    toggleEditorUI(true)
    initEditor()
  }
  mode = desiredMode
}

let lastTime = 0

function engineLoop(timestamp) {
  const dt = deltaTime(timestamp)
  if (mode === "play") {
    platformerLoop(dt)
  } else {
    levelEditorLoop(dt)
  }
  requestAnimationFrame(engineLoop)
} 

function deltaTime(timestamp) {
  if (!timestamp) timestamp = performance.now()
  if (lastTime === 0) lastTime = timestamp
  let seconds = (timestamp - lastTime) / 1000
  if (!isFinite(seconds) || seconds < 0) seconds = 0
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
  setInputEventListeners()
  loadTileset(editor.tilesetPath).then(({ tileset, characterImage }) => {
    editor.tileset = splitStripImages(tileset)
    loadPlayerSprites(characterImage)
    if (inEditor) {
      addTileSelection()
      addEventListeners()
    }
    engineLoop()
  })
}

export function playSound(fileLocation, randomness = 0) {
    let sfx = document.createElement("audio")
    let source = document.createElement("source")
    source.src = fileLocation
    sfx.appendChild(source)
    sfx.playbackRate = getRandomArbitrary(1 - randomness, 1 + randomness)
    sfx.play()
    sfx.addEventListener("ended", killSound(sfx))
}

function killSound(sfx) {
    sfx.remove()
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
