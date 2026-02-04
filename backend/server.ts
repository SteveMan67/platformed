import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:1050/postgres"
const sql = postgres(DATABASE_URL)


const server = Bun.serve({
  port: 1010,
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = url.pathname

    if (pathname == "/api/ping") {
      return new Response("pong")
    }

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

    if (pathname == "/api/browse") {
      const match = url.search.match(/page=(\d+)/)
      const page = match ? Number(match[1]) : 1
      if (page) {
        const levels = await sql`select id, name, created_at, width, height, owner, tags, image_url, approvals, disapprovals, approval_percentage, total_plays, finished_plays, description, level_style from levels limit 50 offset ${(page - 1) * 50}`
        return new Response(JSON.stringify(levels), { headers: {"Content-Type": "application/json" } })
      }
    }

    if (pathname == "/api/users") {
      const users = await sql`select * from users`
      return new Response(JSON.stringify(users), { headers: {"Content-Type": "application/json"}})
    }
    return new Response("Not Found", { status: 404})
  }
})

console.log(`listening on http://localhost:${server.port}`)