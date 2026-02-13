const loginForm = document.getElementById('login-form')
const serverUrl = window.location.hostname

try {
  fetch(`${serverUrl}/api/ping`, {method: "POST"}).then(res => console.log(res.body))
} catch {
  alert("Failed to connect to server.")
}

const errorText = document.querySelector(".error-text")
function getErrorText(response) {
  const status = response.status
  console.log(status)
  let errorDisplay
  if (status == 404) {
    errorDisplay = "No username or password provided"
  } else if (status == 401) {
    errorDisplay = "Invalid Username/Password"
  } else if (status == 400) {
    errorDisplay = "Server Error"
  } else {
    errorDisplay = "Request Failed"
  }
  addError(errorDisplay)
}

function addError(error) {
  errorText.innerHTML = error
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const form = e.target;
  console.log(!form.username.value, !form.password.value)
  if (!form.username.value) {
    addError("No username provided")
  } else if (!form.password.value) {
    addError("No password provided")
  } else {
    const payload = {
      username: form.username.value,
      password: form.password.value
    }
  
    const url = `${serverUrl}/api/login`
    console.log(JSON.stringify(payload))
    const res = await fetch(url, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    
    if (res.ok) {
      console.log("request ok")
      window.location.href = `/editor`
    } else {
      const text = await res.text()
      getErrorText(res)
    }
  }
})