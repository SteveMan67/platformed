import { initEditor } from "./editor.js";
import { initPlatformer, platformerLoop } from "./platformer.js";
import { splitStripImages } from "./file-utils.js";
import { loadTileset } from "./file-utils.js";
import { loadPlayerSprites } from "./file-utils.js";
import { levelEditorLoop } from "./editor.js";
import { addEventListeners, addTileSelection, setInputEventListeners, toggleEditorUI } from "./ui.js";
import { state } from "./state.js"
import { play } from "./api.js";
import { drawMinimap } from "./renderer.js";

const { editor } = state
export let mode = "editor"

export const inEditor = !window.location.pathname.startsWith("/level")

export function endLevel() {
  mode = inEditor ? "editor" : "play"
  setTimeout(inEditor ? initEditor : initPlatformer, 1)
  playSound("/assets/audio/victory.wav")

  try {
    const levelNum = Number(window.location.href.match(/\/level\/(\d+)/)[1])
    if (levelNum) {
      play(levelNum, true)
    }
  } catch {
    setMode("editor")
  }
}

export const input = {
  x: 0,
  y: 0,
  down: false,
  rightClick: false,
  jumpButton: false,
  joystickX: 0,
  keys: {}
}

export function setMode(desiredMode) {
  if (desiredMode === "play" && inEditor) {
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
    return !!(input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"] || input.jumpButton)
  } else if (key === "down") {
    return !!(input.keys['s'] || input.keys['ArrowDown'])
  } else if (key === "any") {
    return !!(input.keys["d"] || input.keys["ArrowRight"] || input.keys["a"] || input.keys["ArrowLeft"] || input.keys[" "] || input.keys["w"] || input.keys["ArrowUp"]) || input.jumpButton
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
    if (mode == "play") {
      initPlatformer()
    } else {
      initEditor()
      drawMinimap()
    }
    engineLoop()
  })
}

const Audiocontext = window.AudioContext
const audioCtx = new Audiocontext();

const soundbuffers = new Map();
const activeFetches = new Map()

preloadSound("/assets/audio/jump.wav")
preloadSound("/assets/audio/coin.wav")
preloadSound("/assets/audio/checkpoint.wav")
preloadSound("/assets/audio/death.wav")
preloadSound("/assets/audio/victory.wav")
preloadSound("/assets/audio/deathmusic.wav")

async function preloadSound(url) {
  if (soundbuffers.has(url)) return soundbuffers.get(url)
  if (activeFetches.has(url)) return activeFetches.get(url)

  const loadPromise = fetch(url)
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      soundbuffers.set(url, audioBuffer)
      return audioBuffer
    })
    .catch(err => console.error(`Audio load failed: ${url}`, err))

  activeFetches.set(url, loadPromise)
  return loadPromise
}

export function playSound(url, randomness = 0) {
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const buffer = soundbuffers.get(url)
  if (!buffer) {
    preloadSound(url)
    return
  }

  const source = audioCtx.createBufferSource()
  source.buffer = buffer

  if (randomness > 0) {
    const rate = 1 + (Math.random() * randomness * 2 - randomness)
    source.playbackRate.value = rate
  }

  const gainNode = audioCtx.createGain()

  source.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  source.start(0)
}