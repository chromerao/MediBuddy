import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

const scryptAsync = promisify(scrypt)
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30
const configuredPath = process.env.DATABASE_PATH?.trim() || './data/medibuddy.sqlite'
export const databasePath = configuredPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), configuredPath)

if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const database = new DatabaseSync(databasePath)
database.exec('PRAGMA journal_mode = WAL')
database.exec('PRAGMA foreign_keys = ON')
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
  CREATE TABLE IF NOT EXISTS user_states (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

const findUserByEmailStatement = database.prepare('SELECT id, email, password_hash, password_salt, created_at FROM users WHERE email = ?')
const insertUserStatement = database.prepare('INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)')
const insertSessionStatement = database.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
const findSessionStatement = database.prepare(`
  SELECT users.id, users.email, users.created_at
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.token_hash = ? AND sessions.expires_at > ?
`)
const deleteSessionStatement = database.prepare('DELETE FROM sessions WHERE token_hash = ?')
const deleteExpiredSessionsStatement = database.prepare('DELETE FROM sessions WHERE expires_at <= ?')
const loadStateStatement = database.prepare('SELECT state_json, updated_at FROM user_states WHERE user_id = ?')
const saveStateStatement = database.prepare(`
  INSERT INTO user_states (user_id, state_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`)

export async function createAccount(email, password) {
  const normalizedEmail = normalizeEmail(email)
  if (findUserByEmailStatement.get(normalizedEmail)) {
    throw new AccountError('이미 사용 중인 이메일입니다.', 'EMAIL_EXISTS')
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const salt = randomBytes(16)
  const passwordHash = await derivePasswordHash(password, salt)
  insertUserStatement.run(id, normalizedEmail, passwordHash.toString('hex'), salt.toString('hex'), createdAt)
  return { id, email: normalizedEmail, createdAt }
}

export async function verifyAccount(email, password) {
  const user = findUserByEmailStatement.get(normalizeEmail(email))
  if (!user) return null

  const salt = Buffer.from(user.password_salt, 'hex')
  const storedHash = Buffer.from(user.password_hash, 'hex')
  const submittedHash = await derivePasswordHash(password, salt)
  if (storedHash.length !== submittedHash.length || !timingSafeEqual(storedHash, submittedHash)) return null
  return { id: user.id, email: user.email, createdAt: user.created_at }
}

export function createSession(userId) {
  deleteExpiredSessionsStatement.run(new Date().toISOString())
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds * 1000).toISOString()
  insertSessionStatement.run(randomUUID(), userId, hashToken(token), expiresAt, now.toISOString())
  return token
}

export function getAuthenticatedUser(request) {
  const token = getSessionToken(request)
  if (!token) return null
  const user = findSessionStatement.get(hashToken(token), new Date().toISOString())
  return user ? { id: user.id, email: user.email, createdAt: user.created_at } : null
}

export function deleteSession(request) {
  const token = getSessionToken(request)
  if (token) deleteSessionStatement.run(hashToken(token))
}

export function loadUserState(userId) {
  const row = loadStateStatement.get(userId)
  if (!row) return { state: null, updatedAt: null }
  try {
    return { state: JSON.parse(row.state_json), updatedAt: row.updated_at }
  } catch {
    return { state: null, updatedAt: row.updated_at }
  }
}

export function saveUserState(userId, state) {
  const updatedAt = new Date().toISOString()
  saveStateStatement.run(userId, JSON.stringify(state), updatedAt)
  return updatedAt
}

export function sessionCookie(token) {
  return `medibuddy_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}${secureCookieSuffix()}`
}

export function clearSessionCookie() {
  return `medibuddy_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookieSuffix()}`
}

export class AccountError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AccountError'
    this.code = code
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

async function derivePasswordHash(password, salt) {
  return scryptAsync(password, salt, 64, { N: 16_384, r: 8, p: 1 })
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function getSessionToken(request) {
  const cookieHeader = String(request.headers.cookie ?? '')
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')
    if (name === 'medibuddy_session') return valueParts.join('=')
  }
  return null
}

function secureCookieSuffix() {
  return process.env.NODE_ENV === 'production' || process.env.SESSION_COOKIE_SECURE === 'true' ? '; Secure' : ''
}
