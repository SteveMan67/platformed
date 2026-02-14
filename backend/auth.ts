import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:4321/postgres"
const sql = postgres(DATABASE_URL)

export type SessionCookie = { sessionId: string; token: string }

export async function authenticate(session_cookie: SessionCookie) {
  if (!session_cookie.sessionId || !session_cookie.token) return false
  const sessions = await sql`SELECT id, token_hash, expires_at, user_id from sessions WHERE id = ${Number(session_cookie.sessionId)} AND expires_at > NOW()`
  if (!sessions.length) {
    console.log("no matching session")
    return false
  }
  const ok = await Bun.password.verify(session_cookie.token, sessions[0].token_hash)
  if (ok) {
    return sessions[0].user_id
  } else {
    return false
  }
}