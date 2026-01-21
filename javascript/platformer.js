const canvas = document.querySelector("canvas")
const ctx = canvas.getContext('2d')
const rect = canvas.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height

function decodeRLE(rle) {
  const out = []
  for (let i = 0; i < rle.length; i++) {
    const pair = rle[i]
    if (Array.isArray(pair)) {
      const tile = pair[0]
      const count = pair[1]
      for (let j = 0; j < count; j++) out.push(tile)
    } else {
      out.push(pair)
    }
  }
}

function loadMap(path) {
  return fetch(path)
    .then(response => response.json())
    .then(json => {
      const layer = json.layers.find(l => l.type === "tilelayer")
      const raw = decodeRLE(json.data)
      if (raw.length !== json.width * json.height) {
        console.warn('readData: data length not expected value', raw.length, json.width * json.height)
      }
      const tiles = new Uint16Array(raw)
      const map = {
        tiles, 
        w: json.width,
        h: json.height
      }
      return map
    })
}

function createMap(width, height, data) {
  const json = {}
  json.width = width
  json.height = height
  json.layers = []
  let mapLayer = {
    "type": "tilelayer",
    "name": "level",
    "data": data
  }
  json.layers.push(mapLayer)
  return json
}

function main() {

}