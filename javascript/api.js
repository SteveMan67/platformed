const serverURL = window.location.hostname

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
    .then(response => {
      console.log(response)
    })
}