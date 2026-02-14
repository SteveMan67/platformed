import postgres from "postgres"
import { authenticate, type SessionCookie } from "./auth.ts"

// CORS stuf

async function readJson(req: Request) {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text)
  } catch (e) {
    return new Response("Bad Request: invalid JSON", { status: 400 })
  }
}


function withCors(respInit: ResponseInit, CORS: any) {
  const headers = new Headers()

  if (respInit.headers) {
    const h = respInit.headers as any
    if (h instanceof Headers) {
      for (const [k, v] of h.entries()) headers.append(k, v)
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) headers.append(k, v)
    } else {
      for (const k of Object.keys(h)) headers.append(k, String(h[k]))
    }
  }
  for (const [k, v] of Object.entries(CORS)) {
    headers.set(k, v)
  }
  return { ...respInit, headers }
}

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:4321/postgres"
const sql = postgres(DATABASE_URL)

function getCookies(reqest: Request) {
  const cookieHeader = reqest.headers.get("Cookie") ?? ""
  const cookies: Record<string, string> = {}
  cookieHeader.split(";").forEach(c => {
    const [key, ...v] = c.split("=")
    if (key) cookies[key.trim()] = v.join("=").trim()
  })
  return cookies
}

const server = Bun.serve({
  port: 1010,
  routes: {

    // --- login page --
    "/login": async (req) => {
      const token = req.cookies.get("token") || ""
      const sessionId = req.cookies.get("session-id") || ""
      console.log(sessionId || "not found")
      console.log(await authenticate({ sessionId: sessionId, token: token }))
      if (sessionId != "" && token != "" && await authenticate({ sessionId: sessionId, token: token })) {
        console.log("user already authenticated")
        return new Response(Bun.file("./frontend/index.html"))
      } else {
        return new Response(Bun.file("./frontend/login.html"))
      }
    },
    // -- editor page --
    "/editor": async () => {
      return new Response(Bun.file("./frontend/editor.html"))
    },
    "/register": async () => {
      return new Response(Bun.file("./frontend/register.html"))
    },
    "/myLevels": async (req) => {
      const token = req.cookies.get("token") || ""
      const sessionId = req.cookies.get("session-id") || ""
      console.log(sessionId || "not found")
      console.log(await authenticate({ sessionId: sessionId, token: token }))
      if (sessionId != "" && token != "" && await authenticate({ sessionId: sessionId, token: token })) {
        console.log("user already authenticated")
        return new Response(Bun.file("./frontend/user.html"))
      } else {
        return new Response(Bun.file("./frontend/login.html"))
      }
    },
    "/myLevels/level": (req) => {
      return new Response(Bun.file("./frontend/level-meta.html"))
    },
    "/level": () => {
      return new Response(Bun.file("./frontend/level.html"))
    },
    "/": async () => {
      return new Response(Bun.file("./frontend/index.html"))
    },
  },
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = url.pathname

    const ALLOWED_ORIGINS = ['http://localhost:5501', 'http://localhost:5500', "http://127.0.0.1:5501", "localhost:1010"]
    const origin = req.headers.get('Origin') || req.headers.get('origin');
    const corsOrigin = ALLOWED_ORIGINS.includes(origin as string) ? origin : 'null';
    const CORS = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    if (pathname.startsWith("/editor")) {
      return new Response(Bun.file("frontend/editor.html"))
    }

    if (req.method == "OPTIONS") {
      return new Response(null, withCors({ status: 204 }, CORS))
    }

    if (pathname == "/level" || pathname.startsWith("/level/")) {
      console.log(pathname)
      return new Response(Bun.file("./frontend/level.html"))
    }

    // --- health ---
    if (pathname == "/api/ping") {
      return new Response("pong", withCors({ status: 200 }, CORS))
    }

    // --- login ---
    if (pathname == "/api/login" && req.method == "POST") {
      try {
        const { username, password } = await req.json()
        const deleteOldSessions = await sql`
          DELETE FROM sessions WHERE expires_at < NOW()
        `
        if (!username) {
          return new Response("No username provided", withCors({ status: 400 }, CORS))
        }
        if (!password) {
          return new Response("No password provided", withCors({ status: 400 }, CORS))
        }
        const rows = await sql`select id, password_hash from users where username = ${username} limit 1`
        const user = rows[0]
        if (!user || !user.id) return new Response("Username does not exist", withCors({ status: 404 }, CORS))

        const valid = await Bun.password.verify(password, user.password_hash)
        if (!valid) {
          return new Response("Invalid credentials", withCors({ status: 401 }, CORS))
        }

        // add cookie to sessions and set the cookie in the response header
        const uuid = crypto.randomUUID()
        const hashedCookie = await Bun.password.hash(uuid)

        console.log(`token: ${uuid}`)
        console.log(`hashed token: ${hashedCookie}`)
        const expirationTime = Date.now() + (60 * 60 * 24 * 14 * 1000)
        console.log(expirationTime)
        const sessionId = await sql`
          insert into sessions(token_hash, expires_at, user_id) 
          values (${hashedCookie}, ${expirationTime}, ${user.id})
          returning id
        `
        const headers = new Headers()
        headers.append("Set-Cookie", `session-id=${sessionId[0].id}; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`)
        headers.append("Set-Cookie", `token=${uuid}; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`)

        return new Response("Login successful", withCors({ status: 200, headers: headers }, CORS))

      } catch (e) {
        ``
        console.error(e)
        return new Response("Bad Request", withCors({ status: 400 }, CORS))
      }

    }

    // --- add new user ---
    if (pathname == "/api/register" && req.method == "POST") {
      try {
        const { username, password, email } = await req.json()
        if (username && password) {
          const uuid = crypto.randomUUID()
          const hashedCookie = await Bun.password.hash(uuid)

          // handle duplicate usernames 
          const duplicateUsernames = await sql`SELECT username FROM users WHERE username = ${username}`
          if (duplicateUsernames[0]) {
            return new Response("Username Already Exists", withCors({ status: 409 }, CORS))
          }
          // insert user into users
          const hashedPassword = await Bun.password.hash(password)
          const userId = await sql`
            INSERT INTO users (username, password_hash)
            VALUES(${username}, ${hashedPassword})
            RETURNING id
          `
          // set their session cookie so they don't have to log in after registering
          const expiresAt = Date.now() + (60 * 60 * 24 * 14 * 1000)
          const sessionId = await sql`
            INSERT INTO sessions(token_hash, expires_at, user_id) 
            VALUES(${hashedCookie}, ${expiresAt}, ${userId[0].id})
            RETURNING id
          `


          const headers = new Headers()
          headers.append("Set-Cookie", `session-id=${sessionId[0].id}; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`)
          headers.append("Set-Cookie", `token=${uuid}; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`)

          return new Response("Sucessful Register", withCors({ status: 200, headers: headers }, CORS))
        }
      } catch (e) {
        console.error(e)
        return new Response("Bad Response", withCors({ status: 400 }, CORS))
      }
    }

    // --- return who is logged in --- 
    if (pathname == "/api/me") {
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (sessionId && token) {
        const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
        const authorized = await authenticate(sessionCookie)
        if (typeof authorized == 'number') {
          return new Response(JSON.stringify({ user: authorized }), { status: 200, headers: { "Content-Type": "application/json" } })
        }
      }
      return new Response("Authentication Failed", { status: 401 })
    }

    // --- get a specific level ---
    if (pathname == "/api/level") {
      const match = url.search.match(/levelId=(\d+)/)
      const levelId = match ? Number(match[1]) : undefined
      if (levelId) {
        const level = await sql`select id, data, name, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels where id = ${levelId} limit 1`
        if (!level[0] || level.length === 0) {
          return new Response(JSON.stringify({ error: "Level not found" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
        }
        return new Response(JSON.stringify(level[0]), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      } else {
        return new Response(JSON.stringify({ error: "Must specify a level id with the levelId parameter" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    // --- level browse ---
    if (pathname == "/api/browse") {
      const match = url.search.match(/page=(\d+)/)
      const page = match ? Number(match[1]) : 1
      if (page) {
        const levels = await sql`select id, name, created_at, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels
        WHERE public = true 
        limit 50 offset ${(page - 1) * 50}`
        return new Response(JSON.stringify(levels), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    // --- upload level --- 
    if (pathname == "/api/upload" && req.method == "POST") {
      const raw = await req.json()
      const level = raw.data
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        console.log(cookies)
        console.log(`sessionId = ${sessionId} & token = ${token}`)
        return new Response("Unauthorized logic", withCors({ status: 401 }, CORS))
      }
      const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
      const authorized = await authenticate(sessionCookie)
      if (authorized) {
        const user = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} 
        `
        const name = raw.name ? raw.name : "My New Level"
        const createdAt = Date.now()
        const width = raw.data.width ? raw.data.width : 100
        const height = raw.data.height ? raw.data.height : 50
        const owner = user[0].user_id
        const tags = raw.tags ? raw.tags : []
        const imageUrl = raw.image_url ? raw.image_url : ""
        const description = raw.description ? raw.description : ""
        const levelStyle = raw.level_style ? raw.level_style : ""
        const insertInto = await sql`
          INSERT INTO levels (name, data, owner, created_at, width, height, tags, image_url, description, level_style)
          VALUES (${name}, ${level}, ${Number(owner)}, ${createdAt}, ${width}, ${height}, ${tags}, ${imageUrl}, ${description}, ${levelStyle})
        `
        return new Response("Level Added", withCors({ status: 200 }, CORS))
      } else {
        return new Response("Invalid Auth", withCors({ status: 401 }, CORS))
      }
    }

    // --- delete level ---
    if (pathname == "/api/delete" && req.method == "DELETE") {
      const raw = await req.json()
      const levelId = raw.levelId
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        return new Response("Unauthorized logic", withCors({ status: 401 }, CORS))
      }
      const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
      if (await authenticate(sessionCookie)) {
        const user = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} 
        `
        const levelOwner = await sql`
          SELECT owner FROM levels WHERE id = ${levelId}
        `
        if (!levelOwner.length) {
          return new Response("Level does not exist", withCors({ status: 404 }, CORS))
        }
        if (levelOwner[0].owner != user[0].user_id) {
          return new Response("Unauthorized", withCors({ status: 401 }, CORS))
        }
        const deleteLevel = await sql`
          DELETE FROM levels WHERE id = ${levelId}
        `
        return new Response("Level Deleted Sucessfully", withCors({ status: 200 }, CORS))
      }
    }

    if (pathname == "/api/play") {
      const raw = await req.json()
      const levelId = raw.levelId

      if (raw.finished) {
        const incrementCounter = await sql`
          UPDATE levels SET finished_plays = finished_plays + 1 where id = ${levelId} LIMIT 1
        `
      }
    }

    // --- Edit a Level
    if (pathname == "/api/edit" && req.method == "PATCH") {
      const raw = await readJson(req)
      console.log(raw)
      const levelId = raw.levelId
      if (!levelId) {
        return new Response("Must provide level id", { status: 400 })
      }

      const allowedTags = new Set([
        "name", "data", "width", "height", "tags", "image_url", "description", "level_style"
      ])

      const updateData: Record<string, any> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (allowedTags.has(k)) {
          updateData[k] = v
        }
      }

      console.log(updateData)

      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        return new Response("Unable to Authenticate", withCors({ status: 401 }, CORS))
      }
      const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
      const user = await authenticate(sessionCookie)
      if (typeof user == 'number') {
        const update = await sql`
          UPDATE levels
          SET ${sql(updateData)}
          WHERE id = ${levelId} AND owner = ${user}
        `
        return new Response("Updated Successfully", { status: 200 })
      } else {
        return new Response("Incorrect Authorization", withCors({ status: 200, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }
    // ADD fetch levels per user  

    if (pathname == "/api/myLevels" && req.method == "GET") {
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        console.log(cookies)
        console.log(`sessionId = ${sessionId} & token = ${token}`)
        return new Response("Unauthorized logic", withCors({ status: 401 }, CORS))
      }
      const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
      const authorized = await authenticate(sessionCookie)
      console.log(authorized, sessionCookie)
      if (authorized) {
        const rows = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId}
        `

        const level = await sql`select id, name, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels where owner = ${authorized} limit 1`
        if (!level[0] || level.length === 0) {
          return new Response(JSON.stringify({ error: "Level not found" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
        }
        return new Response(JSON.stringify(level[0]), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      } else {
        return new Response(JSON.stringify({ error: "Must specify a level id with the user parameter" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    try {
      const url = `./frontend${pathname}`
      const file = Bun.file(url)

      const extension = String(pathname.split('.').pop()) || ""
      let mime = "application/octet-stream"
      switch (extension) {
        case "css":
          mime = "text/css; charset=utf-8"
          break
        case "js":
          mime = "application/javascript; charset=utf-8"
          break
        case "html":
          mime = "text/html; charset=utf-8"
          break
        case "png":
          mime = "image/png"
          break
        case "svg":
          mime = "image/svg+xml"
          break
        case "json":
          mime = "application/json; charset=utf-8"
          break
      }
      return new Response(file, withCors({ status: 200, headers: { "Content-Type": mime } }, CORS))
    } catch {
    }
    return new Response("Not Found", withCors({ status: 404 }, CORS))
  }
})


console.log(`listening on http://localhost:${server.port}`)