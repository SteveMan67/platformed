const loginForm = document.getElementById('login-form')
const serverUrl = window.location.origin

const url = new URLSearchParams(window.location.search)
const redirectUrl = url.get('redirect')
const code = url.get('code')
console.log(code)

if (code) {
  fetch(`${serverUrl}/api/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      provider: "hack-club",
      redirect_uri: `${window.location.origin}/login`
    })
  })
    .then(res => {
      console.log(res)
      if (res.ok) {
        console.log("req ok")
        window.location.href = redirectUrl ? redirectUrl : "/"
      }
    })
}


const hackClubAuth = document.querySelector(".hack-club-oauth")
const CLIENT_ID = 'bf7d0bd81b456fe6c1fce13daf452ad7'

hackClubAuth.href = `https://auth.hackclub.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}&response_type=code&scope=${encodeURIComponent("openid name profile email")}`

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
      window.location.href = redirectUrl ? redirectUrl : "/"

    } else {
      const text = await res.text()
      getErrorText(res)
    }
  }
})