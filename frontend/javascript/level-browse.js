const serverUrl = "http://localhost:1010"
async function getLevels(page = 1) {
  try {
    const levels = await fetch(`${serverUrl}/api/browse`)
    return levels.json()
  } catch (e) {
    console.error(e)
  }
}


const levelsElement = document.querySelector(".levels")
getLevels(1).then(levels => {

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

    const body = `
      <img src="${level.image_url}" alt="No Image Provided">
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
})