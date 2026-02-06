export function toggleEditorUI(on) {
  const grid = document.querySelector(".grid")
  if (on) {
    grid.classList.add("grid-uihidden")
  } else {
    grid.classList.remove("grid-uihidden")
  }
}