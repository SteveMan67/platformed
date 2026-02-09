const loginForm = document.getElementById('login-form')
const serverUrl = "https://platformed.jmeow.net"

try {
  fetch(`${serverUrl}/api/ping`, {method: "POST"}).then(res => console.log(res.body))
} catch {
  alert("Failed to connect to server.")
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const form = e.target;
  const payload = {
    username: form.username.value,
    password: form.password.value
  }

  const url = `${serverUrl}/api/register`
  console.log(JSON.stringify(payload))
  const res = await fetch(url, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  
  if (res.ok) {
    window.location.href = '/frontend/editor.html'
  } else {
    const text = await res.text()
    alert(`Login failed: ${text}`)
  }
})