const serverUrl = window.location.origin
async function getLevel(user = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/browse`)
    return levels.json()
  } catch (e) {
    console.error(e)
  }
}

const overlay = document.querySelector(".overlay")
let deletedLevelNumber

function showDeleteOverlay(levelNumber) {
  deletedLevelNumber = levelNumber
  overlay.style.display = "flex"
}

function deleteLevel(levelId = deletedLevelNumber) {
  const payload = {}
  payload.levelId = levelId
  console.log(payload)

  fetch(`${serverUrl}/api/delete`, {
    method: "DELETE",
    credentials: "include",
    body: JSON.stringify(payload)
  })
    .then(res => 
      window.location.reload()
    )
}


const levelsElement = document.querySelector(".levels")
getLevel(1).then(levels => {
  levelsElement.innerHTML = ''
  levels.forEach(level => {
    const levelElement = document.createElement("a")
    levelElement.href = `/level/${level.id}`
    let tagsHtml = ''
    for(let i = 0; i < level.tags.length || i < 2; i++) {
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

    const deleteButton = document.createElement("button")
    deleteButton.classList.add("quick-action")
    const p = document.createElement("p")
    p.innerText = "delete"
    deleteButton.appendChild(p)
    const img = document.createElement("img")
    img.src = `/assets/icons/delete.svg`
    deleteButton.appendChild(img)

    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()
      showDeleteOverlay(level.id)
    })
    
    const body = `
      <div class="image">
        ${imageHtml}
      </div>
      <div class="name-and-rating">
        <h2 class="name my-levels">${level.name}</h2>
      </div>
      <div class="quick-actions">
        <a href="/editor/${level.id}" id="edit" class="quick-action">
          <p>edit</p>
          <img src="/assets/icons/edit.svg">
        </a>
        <p>|</p>
        <a href="/level/${level.id}" id="view" class="quick-action">
          <p>view</p>
          <img src="/assets/icons/view.svg">
        </a>
        <p>|</p>
      </div>
      
    `
    levelElement.classList.add("level")
    levelElement.innerHTML = body
    levelsElement.append(levelElement)
    const quickActions = levelElement.querySelector(".quick-actions")
    quickActions.appendChild(deleteButton)
  })
})
