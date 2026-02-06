import postgres from "postgres"
import { authenticate, type SessionCookie } from "./auth.ts"
import { BunRequest } from "bun"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:4321/postgres"
const sql = postgres(DATABASE_URL)

function getCookies(reqest: Request) {
  const cookieHeader = reqest.headers.get("Cookie") ?? ""
  const cookies: Record<string, string> = {}
  cookieHeader.split(",").forEach(c => {
    const [key, ...v] = c.split("=")
    if(key) cookies[key.trim()] = v.join("=").trim()
  })
  return cookies
}

const server = Bun.serve({
  port: 1010,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = url.pathname

    // --- health ---
    if (pathname == "/api/ping") {
      return new Response("pong")
    }

    // --- login ---
    if (pathname == "/api/login" && req.method == "POST") {
      try {
        const {username, password} = await req.json()
        const deleteOldSessions = await sql`
          DELETE FROM sessions WHERE expires_at < NOW()
        `
        if (!username) {
          return new Response("No username provided", { status: 400})
        }
        if (!password) {
          return new Response("No password provided", { status: 400})
        }
        const rows = await sql`select id, password_hash from users where username = ${username} limit 1`
        const user = rows[0]
        if (!user.id) return new Response("Username does not exist", {status: 404})
  
        const valid = await Bun.password.verify(password, user.password_hash)
        if (!valid) {
          return new Response("Invalid credentials", {status: 401})
        }
  
        // add cookie to sessions and set the cookie in the response header
        const uuid = crypto.randomUUID()
        const hashedCookie = await Bun.password.hash(uuid)

        const sessionId = await sql`
          insert into sessions(token_hash, expires_at, user_id) 
          values (${hashedCookie}, ${Date.now() + (60 * 60 * 24 * 14)}, ${user.id})
          returning id
        `
  
        return new Response("Login successful", { status: 200, headers: {
          "Set-Cookie": `session-id=${sessionId[0].id}, token=${uuid}; http-only; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`
        }})

      } catch (e) {
        console.error(e)
        return new Response("Bad Request", { status: 400 })
      }

    }

    // --- add new user ---
    if (pathname == "/api/register" && req.method == "POST") {
      try {
        const {username, password, email } = await req.json()
        if (username && password) {
          const uuid = crypto.randomUUID()
          const hashedCookie = await Bun.password.hash(uuid)

          // handle duplicate usernames 
          const duplicateUsernames = await sql`SELECT username FROM users WHERE username = ${username}`
          if (duplicateUsernames[0]) {
            return new Response("Username Already Exists", { status: 409 })
          }
          // insert user into users
          const hashedPassword = await Bun.password.hash(password)
          const userId = await sql`
            INSERT INTO users (username, password_hash)
            VALUES(${username}, ${hashedPassword})
            RETURNING id
          `
          // set their session cookie so they don't have to log in after registering
          const expiresAt = Date.now() + (60 * 60 * 24 * 14)
          const sessionId = await sql`
            INSERT INTO sessions(token_hash, expires_at, user_id) 
            VALUES(${hashedCookie}, ${expiresAt}, ${userId[0].id})
            RETURNING id
          `
          return new Response("Sucessful Register", { status: 200, headers: {
            "Set-Cookie": `session-id=${sessionId[0].id}, token=${uuid}; http-only; Path=/; SameSite=Lax; MaxAge=${60 * 60 * 24 * 14}`
          }})
        }
      } catch (e) {
        console.error(e)
        return new Response("Bad Response", { status: 400 })
      }
    }

    // --- get a specific level ---
    if (pathname == "/api/level") {
      const match = url.search.match(/levelId=(\d+)/)
      const levelId = match ? Number(match[1]) : undefined
      if (levelId) {
        const level = await sql`select data, name, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels where id = ${levelId} limit 1`
        if (!level || level.length === 0) {
          return new Response(JSON.stringify({ error: "Level not found"}), { status: 404, headers: {"Content-Type": "application/json"}})
        }
        return new Response(JSON.stringify(level), { headers: {"Content-Type": "application/json" } })
      } else {
        return new Response(JSON.stringify({ error: "Must specify a level id with the levelId parameter" }), { status: 404, headers: {"Content-Type": "application/json"}})
      }
    }

    // --- level browse ---
    if (pathname == "/api/browse") {
      const match = url.search.match(/page=(\d+)/)
      const page = match ? Number(match[1]) : 1
      if (page) {
        const levels = await sql`select id, name, created_at, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels limit 50 offset ${(page - 1) * 50}`
        return new Response(JSON.stringify(levels), { headers: {"Content-Type": "application/json" } })
      }
    }

    // --- upload level --- 
    if (pathname == "/api/upload" && req.method == "POST") {
      const raw = await req.json()
      const level = raw.level
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        return new Response("Unauthorized logic", { status: 401 })
      }
      const sessionCookie: SessionCookie = { sessionId: sessionId, token: token }
      
      if (await authenticate(sessionCookie)) {
        const user = await sql`
          SELECT user_id FROM sessions WHERE id = ${sessionId} 
        `
        const name = raw.name ? raw.name : "My New Level"
        const createdAt = Date.now()
        const width = raw.level.width ? raw.level.width : 100
        const height = raw.level.height ? raw.level.height : 50
        const owner = user[0].user_id
        const tags = raw.tags ? raw.tags : []
        const imageUrl = raw.image_url ? raw.image_url : ""
        const description = raw.description ? raw.description : ""
        const levelStyle = raw.level_style ? raw.level_style : ""
        const insertInto = await sql`
          INSERT INTO levels (name, data, owner, created_at, width, height, tags, image_url, description, level_style)
          VALUES (${name}, ${level}, ${Number(owner)}, ${createdAt}, ${width}, ${height}, ${tags}, ${imageUrl}, ${description}, ${levelStyle})
        `
        return new Response("Level Added", { status: 200 })
      } else {
        return new Response("Invalid Auth", { status: 401 })
      }
    }

    // ADD: delete level
    if (pathname == "/api/delete" && req.method == "DELETE") {
      const raw = await req.json()
      const levelId = raw.levelId
      const cookies = getCookies(req)
      const sessionId = cookies["session-id"]
      const token = cookies["token"]
      if (!sessionId || !token) {
        return new Response("Unauthorized logic", { status: 401 })
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
          return new Response("Level does not exist", { status: 404 })
        }
        if (levelOwner[0].owner != user[0].user_id) {
          return new Response("Unauthorized", { status: 401 })
        }
        const deleteLevel = await sql`
          DELETE FROM levels WHERE id = ${levelId}
        `
        return new Response("Level Deleted Sucessfully", { status: 200 })
      }
    }
    // ADD: modify level/level metadata
    // ADD fetch levels per user

    return new Response("Not Found", { status: 404 })
  }
})

console.log(`listening on http://localhost:${server.port}`)