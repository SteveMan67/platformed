import { play } from "/javascript/api.js"
import { updateCanvasSize } from "/javascript/renderer.js"

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
    approvalPercentage.innerHTML = `${level.approval_percentage}%`
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