const levelName = document.getElementById("level-name")
const visibilityElement = document.getElementById("visibility")
const descriptionElement = document.getElementById("description")
const updateButton = document.getElementById("update")

const backToLevel = document.getElementById("back-to-level")

const serverUrl = window.location.origin

let levelNum
try {
  levelNum = Number(window.location.href.match(/\/meta\/(\d+)(?:[\/?#]|$)/)[1])
} catch {
  // window.location.href = "/"
  console.log("no level number")
}

console.log(levelNum)

if (levelNum) {
  backToLevel.href = `/level/${levelNum}`
}

function udpateLevelMeta() {
  const payload = {
    name: levelName.value,
    public: visibilityElement.value == "public" ? true : false,
    description: descriptionElement.value,
  }

  fetch(`${serverUrl}/api/edit`, {
    method: "PATCH",
    body: payload,
    credentials: "include"
  }) 
}

updateButton.addEventListener("click", () => {
  udpateLevelMeta()
  window.location.href = `/level/${levelNum}`
})