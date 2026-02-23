const serverUrl = window.location.origin

const serverURL = window.location.origin

export async function uploadLevel(dataList) {
  const payload = {}
  dataList.forEach(datapoint => {
    payload[datapoint[0]] = datapoint[1]
  })

  const upload = await fetch(`${serverURL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  const levelId = await upload.json()
  return levelId.levelId
}

export function play(levelId, finished) {
  const payload = { levelId: levelId, finished: finished }

  fetch(`${serverUrl}/api/play`, {
    method: "POST",
    body: JSON.stringify(payload)
  })
}
