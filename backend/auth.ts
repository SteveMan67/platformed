import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:4321/postgres"
const sql = postgres(DATABASE_URL)

export type authResponse = { user: number | null, signedIn: boolean }

export async function authenticate(req: Request) {
  const cookies = getCookies(req)
  let missingCookies = false
  if (!cookies['session-id'] || !cookies.token) {
    missingCookies = true
    const response: authResponse = { user: null, signedIn: false }
  } else {
    const sessions = await sql`SELECT id, token_hash, expires_at, user_id from sessions WHERE id = ${Number(cookies['session-id'])} AND expires_at > NOW()`
    let noSession = false
    if (!sessions.length) {
      console.log("no matching session")
      noSession = true
    }
    let ok = false
    if (!missingCookies && !noSession) {
      ok = await Bun.password.verify(cookies.token, sessions[0].token_hash)
      const res: authResponse = { user: sessions[0].user_id || null, signedIn: ok }
      console.log(res)
      return res
    }
  }

}

export function getCookies(reqest: Request) {
  const cookieHeader = reqest.headers.get("Cookie") ?? ""
  const cookies: Record<string, string> = {}
  cookieHeader.split(";").forEach(c => {
    const [key, ...v] = c.split("=")
    if (key) cookies[key.trim()] = v.join("=").trim()
  })
  return cookies
}
