const levelName = document.getElementById("level-name")
const visibilityElement = document.getElementById("visibility")
const descriptionElement = document.getElementById("description")
const updateButton = document.getElementById("update")

const backToLevel = document.getElementById("back-to-level")

const serverUrl = window.location.origin

let levelNum
try {
  levelNum = Number(window.location.href.match(/\/meta\/(\d+)(?:[\/?#]|$)/)[1])
  handleLevelLoad()
} catch {
  // window.location.href = "/"
  console.log("no level number")
}

async function handleLevelLoad() {
  const levelMeta = await fetchLevelMeta(levelNum)
  const me = await getMe()
  const levelMetaJson = await levelMeta.json()
  levelName.value = levelMetaJson.name
  visibilityElement.value = levelMetaJson.public ? "public" : "private"
  descriptionElement.value = levelMetaJson.description
  if (await me !== levelMetaJson.owner) {
    console.log(me, levelMetaJson)
    window.location.href = "/"
  }
}
console.log(levelNum)

if (levelNum) {
  backToLevel.href = `/level/${levelNum}`
}

async function fetchLevelMeta(levelNum) {
  const levelData = await fetch(`${serverUrl}/api/level?levelId=${levelNum}`, {
    credentials: "include",
    method: "GET",
  })
  return levelData
}

async function getMe() {
  const raw = await fetch(`${serverUrl}/api/me`, {
    credentials: "include",
  })
  const response = await raw.json()
  const user = response.user
  return user
}

async function udpateLevelMeta() {
  const payload = {
    name: levelName.value,
    public: visibilityElement.value == "public" ? true : false,
    description: descriptionElement.value,
    levelId: levelNum
  }
  console.log(payload)
  return await fetch(`${serverUrl}/api/edit`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    credentials: "include"
  })
}

updateButton.addEventListener("click", () => {
  udpateLevelMeta().then(level => {
    window.location.href = `/level/${levelNum}`
  })
})