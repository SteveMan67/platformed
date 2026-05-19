import { play } from "/javascript/api.js"
import { updateCanvasSize } from "/javascript/renderer.js"
import { mobile } from "/javascript/ui.js"
import { input } from "/javascript/site.js"

const serverUrl = window.location.origin
async function getLevel(level = 1) {
  try {
    const raw = await fetch(`${serverUrl}/api/level?levelId=${level}`)
    const levels = await raw.json()

    const approvalWrapper = document.querySelector(".thumbs-up-wrapper")
    const disapprovalWrapper = document.querySelector(".thumbs-down-wrapper")

    console.log(levels)

    console.log(levels.current_user_rating)

    if (levels.current_user_rating) {
      approvalWrapper.classList.add("clicked")
    } else if (levels.current_user_rating === false) {
      disapprovalWrapper.classList.add("clicked")
    }

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
    <div class="svg edit"></div>
  `
  const insertPlace = document.querySelector(".approval-wrapper")
  insertPlace.appendChild(b)
  if (owned) {
    const metadataA = document.createElement("a")
    metadataA.href = `/meta/${levelId}`
    metadataA.classList.add("settings")

    metadataA.innerHTML = `
      <div class="svg settings"></div>
    `
    insertPlace.appendChild(metadataA)
  }
}

const levelName = document.querySelector(".name")
const username = document.querySelector(".username")
const approvalPercentage = document.querySelector(".approval-percentage")
const description = document.querySelector(".description")
const plays = document.querySelector(".plays")
const finishes = document.querySelector(".finishes")

const fullscreenControl = document.querySelector(".fullscreen-control")
const game = document.querySelector(".game")
const elem = document.documentElement
const winScreen = document.querySelector(".win-screen")
const playAgain = document.querySelector(".play-again")

const mobileControls = document.querySelector(".mobile-controls")
const joystick = document.querySelector(".knob")
const joystickHitbox = document.querySelector(".joystick")

let joystickActive = false
let startX = 0
let startY = 0

playAgain.addEventListener("click", () => {
  winScreen.classList.add("hidden")
  window.dispatchEvent(new CustomEvent("level:restart"))
})

window.addEventListener("level:finished", () => {
  winScreen.classList.remove("hidden")
})

joystickHitbox?.addEventListener("touchstart", (e) => {
  e.preventDefault()
  joystickActive = true
  startX = e.targetTouches[0].screenX
  startY = e.targetTouches[0].screenY
  joystick.style.transition = "none"
})


joystickHitbox?.addEventListener("touchmove", (e) => {
  e.preventDefault()
  if (!joystickActive) return
  const maxDistance = 50

  let dx = e.targetTouches[0].screenX - startX
  let dy = e.targetTouches[0].screenY - startY

  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > maxDistance) {
    dx = (dx / distance) * maxDistance
    dy = (dy / distance) * maxDistance
  }

  input.joystickX = Math.floor(dx / 50 * 100) / 100

  joystick.style.transform = `translate(calc(${dx}px - 50%), calc(${dy}px - 50%))`
})

function resetJoystick() {
  joystickActive = false
  joystick.style.transition = "transform 200ms ease-out"
  joystick.style.transform = ``
  input.joystickX = 0
}

joystickHitbox.addEventListener("touchend", resetJoystick)
joystickHitbox.addEventListener("touchcancel", resetJoystick)

const jumpButton = document.querySelector(".jump")

jumpButton.addEventListener("touchstart", (e) => {
  input.jumpButton = true
})

jumpButton.addEventListener("touchend", () => {
  input.jumpButton = false
})

jumpButton.addEventListener("touchcancel", () => {
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

fetch(`${serverUrl}/api/me`)
  .then(res => {
    if (!res.ok) {
      const link = document.querySelector(".link-button.my-levels")
      link.href = `/login?redirect=${encodeURIComponent(`level/${levelNum}`)}`
      link.innerText = "Sign In"
    }
  })


getLevel(levelNum).then(level => {
  if (!level || !levelNum || level.error) {
    window.location.href = "/"
  } else {
    levelName.innerHTML = level.name
    username.innerHTML = level.username
    approvalPercentage.innerHTML = `${Math.floor(level.approval_percentage)}%`
    description.innerHTML = level.escription
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
