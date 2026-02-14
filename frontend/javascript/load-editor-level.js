import { loadMapFromData, loadOwnerData } from './file-utils.js'
import { init } from '/javascript/site.js'
import { state } from '/javascript/state.js'
const { user } = state

const serverUrl = window.location.origin

// fetch the level if there is a level in the 

async function getLevel(level) {
  try {
    const raw = await fetch(`${serverUrl}/api/level?levelId=${level}`)
    const levels = raw.json()
    window.dispatchEvent(new CustomEvent('level:loaded', { detail: levels }))
    return await levels
  } catch {
  }
}

fetch(`${serverUrl}/api/me`)
.then(res => res.json())
  .then(res => {
    console.log(res.user)
    user.id = res.user
  })

let levelNum

try {
  levelNum = Number(window.location.href.match(/\/editor\/(\d+)(?:[\/?#]|$)/)[1])
} catch {
  levelNum = 1
}

getLevel(levelNum).then(level => {
  if (level && levelNum && level.error == null) {
    const levelData = level.data
    loadMapFromData(levelData)
    loadOwnerData(level)
  } else if (level && level.error) {
    console.log(level.error)
  }
  init()
})
