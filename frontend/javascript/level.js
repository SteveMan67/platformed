const serverUrl = "http://localhost:1010"
async function getLevel(level = 1) {
  try {
    const raw = await fetch(`${serverUrl}/api/level?levelId=${level}`)
    const levels = raw.json()
    console.log(levels)

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
  if (!level) {
    window.location.href = "/"
  } else {
    console.log(level[0])
    levelName.innerHTML = level.name
    approvalPercentage.innerHTML = `${level.approval_percentage}%`
    description.innerHTML = level.description
    plays.innerHTML = level.total_plays
    finishes.innerHTML = level.finished_plays
  }
})