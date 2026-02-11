const serverUrl = "http://localhost:1010"
async function getLevel(level = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/level?levelId=${level}`)
    return levels.json()
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
  if (!level) {
    window.location.href = "/"
  } else {
    console.log(level[0])
    levelName.innerHTML = level[0].name
    approvalPercentage.innerHTML = `${level[0].approval_percentage}%`
    description.innerHTML = level[0].description
    plays.innerHTML = level[0].total_plays
    finishes.innerHTML = level[0].finished_plays
  }
})