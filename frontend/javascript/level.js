import { play } from "/javascript/api.js"
import { updateCanvasSize } from "/javascript/renderer.js"
import { mobile } from "/javascript/ui.js"
import { input } from "/javascript/site.js"

const serverUrl = window.location.origin
async function getLevel(level = 1) {
  try {
    const raw = await fetch(`${serverUrl}/api/level?levelId=${level}`)
    const levels = raw.json()
    window.dispatchEvent(new CustomEvent('level:loaded', { detail: levels }))
    return await levels
  } catch (e) {
    console.error(e)
  }
}

function addEditButton(owned, levelId) {
  const b = document.createElement('a')
  b.href = `/editor/${levelId}`
  b.classList.add("edit")
  const text = owned ? "Edit" : "Remix"
  b.innerHTML = `
    <p>${text}</p>
    <img src="/assets/icons/edit-light.svg">
  `
  const insertPlace = document.querySelector(".approval-wrapper")
  insertPlace.appendChild(b)
  if (owned) {
    const metadataA = document.createElement("a")
    metadataA.href = `/meta/${levelId}`
    metadataA.classList.add("settings")

    metadataA.innerHTML = `
      <img src="/assets/icons/settings.svg">
    `
    insertPlace.appendChild(metadataA)
  }
  console.log(b)
}

const levelName = document.querySelector(".name")
const approvalPercentage = document.querySelector(".approval-percentage")
const description = document.querySelector(".description")
const plays = document.querySelector(".plays")
const finishes = document.querySelector(".finishes")

const fullscreenControl = document.querySelector(".fullscreen-control")
const game = document.querySelector(".game")
const elem = document.documentElement

const mobileControls = document.querySelector(".mobile-controls")
const joystick = document.querySelector(".knob")

let joystickActive = false
let startX = 0
let startY = 0

joystick.addEventListener("touchstart", (e) => {
  e.preventDefault()
  joystickActive = true
  startX = e.touches[0].screenX
  startY = e.touches[0].screenY
  joystick.style.transition = "none"
})


joystick.addEventListener("touchmove", (e) => {
  e.preventDefault()
  if (!joystickActive) return
  const maxDistance = 50

  let dx = e.touches[0].screenX - startX
  let dy = e.touches[0].screenY - startY

  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > maxDistance) {
    dx = (dx / distance) * maxDistance
    dy = (dy / distance) * maxDistance
  }

  input.joystickX = Math.floor(dx / 50 * 100) / 100
  console.log(Math.floor(dx / 50 * 100) / 100)

  joystick.style.transform = `translate(calc(${dx}px - 50%), calc(${dy}px - 50%))`
})

function resetJoystick() {
  joystickActive = false
  joystick.style.transition = "transform 200ms ease-out"
  joystick.style.transform = ``
  input.joystickX = 0
}

joystick.addEventListener("touchend", resetJoystick)
joystick.addEventListener("touchcancel", resetJoystick)

const jumpButton = document.querySelector(".jump")

jumpButton.addEventListener("touchstart", (e) => {
  e.preventDefault()
  input.jumpButton = true
})

window.addEventListener("touchend", () => {
  input.jumpButton = false
})

window.addEventListener("touchcancel", () => {
  input.jumpButton = false
})

if (mobile()) {
  mobileControls.classList.remove("hidden")
}



fullscreenControl.addEventListener("click", (e) => {
  game.classList.toggle("fullscreen")
  if (game.classList.contains("fullscreen")) {
    const reqFullscreen = elem.requestFullscreen || elem.webkitRequestFullscreen
    if (reqFullscreen) {
      reqFullscreen.call(elem).catch(err => {
        console.error(`error trying to go fullscreen: ${err.message}`)
      })
    }
  } else {
    document.exitFullscreen()
  }

  updateCanvasSize()
})

let levelNum
try {
  levelNum = Number(window.location.href.match(/\/level\/(\d+)/)[1])
} catch {
  levelNum = -1
}

getLevel(levelNum).then(level => {
  console.log(level)
  if (!level || !levelNum || level.error) {
    window.location.href = "/"
  } else {
    levelName.innerHTML = level.name
    approvalPercentage.innerHTML = `${Math.floor(level.approval_percentage)}%`
    description.innerHTML = level.description
    plays.innerHTML = level.total_plays
    finishes.innerHTML = level.finished_plays
    addEditButton(level.owned || false, level.id)
    play(levelNum, false)
  }
})

window.addEventListener("resize", () => {
  updateCanvasSize()
})

const approvalButton = document.getElementById("thumbs-up")
const disapprovalButton = document.getElementById("thumbs-down")
const approvalWrapper = document.querySelector(".thumbs-up-wrapper")
const disapprovalWrapper = document.querySelector(".thumbs-down-wrapper")
console.log(approvalButton, disapprovalButton)

async function rateLevel(ratedGood) {
  await fetch(`${serverUrl}/api/rate?levelId=${levelNum}&rating=${ratedGood}`, {
    credentials: "include"
  })
}

approvalButton.addEventListener("click", () => {
  approvalWrapper.classList.add("clicked")
  disapprovalWrapper.classList.remove("clicked")

  rateLevel(true)
})


disapprovalButton.addEventListener("click", () => {
  disapprovalWrapper.classList.add("clicked")
  approvalWrapper.classList.remove("clicked")

  rateLevel(false)
})