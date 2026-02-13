const serverUrl = window.location.hostname
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

const levelName = document.querySelector(".name")
const approvalPercentage = document.querySelector(".approval-percentage")
const description = document.querySelector(".description")
const plays = document.querySelector(".plays")
const finishes = document.querySelector(".finishes")


const levelNum = Number(window.location.href.match(/\/level\/(\d+)/)[1])

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
  }
})