import postgres from "postgres"
import { authenticate, type authResponse, getCookies } from "./auth.ts"

function cleanString(str: String) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}
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


const server = Bun.serve({
  port: 1010,
  hostname: "0.0.0.0",
  routes: {

    // --- login page --
    "/login": async (req) => {
      if ((await authenticate(req))?.signedIn) {
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
      if ((await authenticate(req))?.signedIn) {
        return new Response(Bun.file("./frontend/user.html"))
      } else {
        return new Response(Bun.file("./frontend/login.html"))
      }
    },
    "/new": () => {
      return new Response(Bun.file("./frontend/new-level.html"))
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

    if (pathname.startsWith("/meta") && req.method == "GET") {
      return new Response(Bun.file("frontend/level-meta.html"))
    }

    if (req.method == "OPTIONS") {
      return new Response(null, withCors({ status: 204 }, CORS))
    }

    if (pathname == "/level" || pathname.startsWith("/level/")) {
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

        const expirationTime = Date.now() + (60 * 60 * 24 * 14 * 1000)
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
      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        return new Response(JSON.stringify({ user: authentication.user }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      return new Response("Authentication Failed", { status: 401 })
    }

    // --- get a specific level ---
    if (pathname == "/api/level") {
      const match = url.search.match(/levelId=(\d+)/)
      const levelId = match ? Number(match[1]) : undefined
      const authentication = await authenticate(req)
      if (levelId) {
        const level = await sql`select id, public, data, name, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels where id = ${levelId} limit 1`
        if (!level[0] || level.length === 0) {
          return new Response(JSON.stringify({ error: "Level not found" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
        }

        const returnedJson = level[0]
        returnedJson.owned = returnedJson.owner == authentication?.user || false
        return new Response(JSON.stringify(returnedJson), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      } else {
        return new Response(JSON.stringify({ error: "Must specify a level id with the levelId parameter" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    // --- level browse ---
    if (pathname == "/api/browse") {
      const match = url.search.match(/page=(\d+)/)
      const page = match ? Number(match[1]) : 1
      if (page) {
        const levels = await sql`select id, data, name, created_at, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels
        WHERE public = true 
        limit 50 offset ${(page - 1) * 50}`
        return new Response(JSON.stringify(levels), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      }
    }
    if (pathname.startsWith("/api/search")) {
      const page = Number(url.searchParams.get("page")) || 1
      const search = url.searchParams.get("search") || ""
      if (search) {
        const levels = await sql`
        select id, data, name, created_at, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels
        WHERE public = true AND name ILIKE ${'%' + search + '%'}
        limit 50 offset ${(Number(page - 1) * 50)}
        `
        return new Response(JSON.stringify(levels), {
          headers: {
            "Content-Type": "application/json"
          }
        })
      }
    }

    // --- upload level --- 
    if (pathname == "/api/upload" && req.method == "POST") {
      const raw = await req.json()
      const level = raw.data
      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        const name = raw.name ? raw.name : "My New Level"
        const createdAt = Date.now()
        const width = raw.data && raw.data.width ? raw.data.width : 100
        const height = raw.data && raw.data.height ? raw.data.height : 50
        const owner = authentication.user
        let tags = raw.tags ? raw.tags : []
        tags = tags.map(f => cleanString(f))
        const imageUrl = raw.image_url ? raw.image_url : ""
        const description = raw.description ? raw.description : ""
        const levelStyle = raw.level_style ? raw.level_style : ""
        const insertInto = await sql`
          INSERT INTO levels (name, data, owner, created_at, width, height, tags, image_url, description, level_style)
          VALUES (${cleanString(name)}, ${level}, ${Number(owner)}, ${createdAt}, ${width}, ${height}, ${tags}, ${imageUrl}, ${cleanString(description)}, ${levelStyle})
          returning id
        `
        return new Response(JSON.stringify({ levelId: insertInto[0].id }), withCors({ status: 200 }, CORS))
      } else {
        return new Response("Invalid Auth", withCors({ status: 401 }, CORS))
      }
    }

    // --- delete level ---
    if (pathname == "/api/delete" && req.method == "DELETE") {
      const raw = await req.json()
      const levelId = raw.levelId
      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        const levelOwner = await sql`
          SELECT owner FROM levels WHERE id = ${levelId}
        `
        if (!levelOwner.length) {
          return new Response("Level does not exist", withCors({ status: 404 }, CORS))
        }
        if (levelOwner[0].owner != authentication.user) {
          return new Response("Unauthorized", withCors({ status: 401 }, CORS))
        }
        const deleteLevel = await sql`
          DELETE FROM levels WHERE id = ${levelId}
        `
        return new Response("Level Deleted Sucessfully", withCors({ status: 200 }, CORS))
      } else {
        return new Response("Unauthorized logic", withCors({ status: 401 }, CORS))
      }
    }

    if (pathname == "/api/play") {
      const raw = await req.json()
      const levelId = raw.levelId

      if (raw.finished) {
        const incrementCounter = await sql`
          UPDATE levels SET finished_plays = finished_plays + 1 where id = ${levelId}
        `
        return new Response("Updated Finished Play Counter", { status: 200 })
      } else {
        const incrementCounter = await sql`
          UPDATE levels SET total_plays = total_plays + 1 where id = ${levelId}
        `
        return new Response("Updated Play Counter", { status: 200 })
      }
    }
    // --- Edit a Level
    if (pathname == "/api/edit" && req.method == "PATCH") {
      const raw = await readJson(req)
      const levelId = raw.levelId
      if (!levelId) {
        return new Response("Must provide level id", { status: 400 })
      }

      const allowedTags = new Set([
        "name", "data", "width", "height", "tags", "image_url", "description", "level_style", "public"
      ])

      const updateData: Record<string, any> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (allowedTags.has(k)) {
          if (k == "name" || k == "description") {
            updateData[k] = cleanString(v as string)
          } else {
            updateData[k] = v
          }
        }
      }

      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        const update = await sql`
          UPDATE levels
          SET ${sql(updateData)}
          WHERE id = ${levelId} AND owner = ${authentication.user}
        `
        return new Response("Updated Successfully", { status: 200 })
      } else {
        return new Response("Incorrect Authorization", withCors({ status: 200, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    if (pathname == "/api/myLevels" && req.method == "GET") {
      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        const level = await sql`select id, data, name, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels where owner = ${authentication.user}`
        if (!level[0] || level.length === 0) {
          return new Response(JSON.stringify({ error: "Level not found" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
        }
        return new Response(JSON.stringify(level), withCors({ headers: { "Content-Type": "application/json" } }, CORS))
      } else {
        return new Response(JSON.stringify({ error: "Must specify a level id with the user parameter" }), withCors({ status: 404, headers: { "Content-Type": "application/json" } }, CORS))
      }
    }

    if (pathname == "/api/rate") {
      const levelId = url.searchParams.get("levelId")
      const ratingParam = url.searchParams.get("rating")
      const rating = ratingParam === "true"
      console.log(ratingParam, rating)
      if (!levelId) {
        return new Response("Must Provide LevelId", { status: 400 })
      }

      if (!ratingParam) {
        return new Response("Must Provide rating", { status: 400 })
      }

      const authentication = await authenticate(req)
      if (authentication?.signedIn) {
        const rated = (await sql`select id, thumbs_up from ratings where user_id = ${authentication.user} AND level_id = ${levelId}`)
        const isAlreadyRated = rated.length > 0

        if (isAlreadyRated) {
          console.log(rated[0].thumbs_up)
          const insert = await sql`
            update ratings
            set thumbs_up = ${rating}
            where id = ${rated[0].id}
          `
          if (rated[0].thumbs_up && !rating) {
            const updateLevels = await sql`
              update levels 
              set approvals = approvals - 1, 
              disapprovals = disapprovals + 1,
              approval_percentage = DEFAULT
              where id = ${levelId}
            `
          } else if (!rated[0].thumbs_up && rating) {
            const updateLevels = await sql`
              update levels
              set approvals = approvals + 1,
              disapprovals = disapprovals - 1,
              approval_percentage = DEFAULT
              where id = ${levelId}
            `
          }
        } else {
          const insert = await sql`
            insert into ratings(thumbs_up, level_id, user_id)
            values (${rating}, ${levelId}, ${authentication.user})
          `

          const updateLevels = await sql`
            update levels 
            set approvals = approvals + ${rating ? 1 : 0},
            disapprovals = disapprovals + ${rating ? 0 : 1},
            approval_percentage = DEFAULT
            where id = ${levelId}
          `
        }

        return new Response("Rated Sucessfully", { status: 200 })
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
      const fileExists = await file.exists()
      if (!fileExists) {
        return new Response("Not Found", withCors({ status: 404 }, CORS))
      }
      return new Response(file, withCors({ status: 200, headers: { "Content-Type": mime } }, CORS))
    } catch {
      return new Response("Not Found", withCors({ status: 404 }, CORS))
    }
  }
})


console.log(`listening on http://localhost:${server.port}`)