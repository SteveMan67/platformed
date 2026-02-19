const serverUrl = window.location.origin
async function getLevel(page = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/browse`)
    return levels.json()
  } catch (e) {
    console.error(e)
  }
}

function addLevels(levels) {
  levelsElement.innerHTML = ''
  levels.forEach(level => {
    const levelElement = document.createElement("a")
    levelElement.href = `/level/${level.id}`
    let tagsHtml = ''
    for (let i = 0; i < level.tags.length || i < 2; i++) {
      tagsHtml += `<p class="tag">${level.tags[i]}</p>`
    }
    if (!level.tags.length) {
      tagsHtml = ''
    }

    let imageHtml
    if (level.image_url == "") {
      imageHtml = `
        <div class="no-image">
          <p>No Image Provided</p>
        </div>
      `
    } else {
      imageHtml = `<img src="${level.image_url}" alt="No Image Provided">`
    }

    const body = `
      <div class="image">
        ${imageHtml}
      </div>
      <div class="name-and-rating">
        <h2 class="name">${level.name}</h2>
        <div class="approval-rating-wrapper">
          <p class="approval-rating">${level.approval_percentage}%</p>
          <img src="./assets/icons/thumbs-up.svg" alt="">
        </div>
      </div>
      <div class="tags-and-plays">
        <div class="tags">
          ${tagsHtml}
        </div>
        <div class="plays">
          <p class="plays-finishes"><span class="plays">${level.total_plays}</span>/<span class="finishes">${level.finished_plays}</span>
          </p>
        </div>
      </div>
    `
    levelElement.classList.add("level")
    levelElement.innerHTML = body
    levelsElement.append(levelElement)
  })
}

const levelsElement = document.querySelector(".levels")
getLevel(1).then(levels => {
  levels = new Array(levels)
  levelsElement.innerHTML = ''
  console.log(levels)
  addLevels(levels[0])
})

const search = document.getElementById("search")

search.addEventListener("input", async (e) => {
  if (search.value == "") {
    const raw = await fetch(`${serverUrl}/api/browse`)
    const levels = await raw.json()
    addLevels(levels)
  } else {
    const raw = await fetch(`${serverUrl}/api/search?search=${search.value}`)
    const levels = await raw.json()
    addLevels(levels)
  }
})

const myLevelsbutton = document.getElementById("my-levels")

fetch(`${serverUrl}/api/me`)
  .then(res => res.json())
  .then(user => {
    if (user.user) {

    }
  })
  .catch(e => {
    console.log("caught error")
    myLevelsbutton.innerText = "Sign In"
    myLevelsbutton.href = "/login"
  })