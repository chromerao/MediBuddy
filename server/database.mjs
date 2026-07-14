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
  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS invitations_owner_idx ON invitations(owner_user_id);
  CREATE TABLE IF NOT EXISTS family_connections (
    id TEXT PRIMARY KEY,
    inviter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    connected_at TEXT NOT NULL,
    UNIQUE(inviter_user_id, invitee_user_id)
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  );
  CREATE TABLE IF NOT EXISTS visit_records (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
  );
  CREATE TABLE IF NOT EXISTS ai_usage (
    subject TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (subject, day)
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
const deleteUserStatement = database.prepare('DELETE FROM users WHERE id = ?')
const insertInvitationStatement = database.prepare('INSERT INTO invitations (id, owner_user_id, code, name, relationship, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
const listInvitationsStatement = database.prepare('SELECT id, code, name, relationship, status, created_at FROM invitations WHERE owner_user_id = ? ORDER BY created_at DESC')
const cancelInvitationStatement = database.prepare("UPDATE invitations SET status = 'cancelled' WHERE id = ? AND owner_user_id = ? AND status = 'pending'")
const findInvitationByCodeStatement = database.prepare('SELECT id, owner_user_id, code, name, relationship, status, created_at FROM invitations WHERE code = ?')
const acceptInvitationStatement = database.prepare("UPDATE invitations SET status = 'accepted' WHERE id = ? AND status = 'pending'")
const insertConnectionStatement = database.prepare(`
  INSERT INTO family_connections (id, inviter_user_id, invitee_user_id, name, relationship, connected_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(inviter_user_id, invitee_user_id) DO NOTHING
`)
const listConnectionsAsInviterStatement = database.prepare('SELECT id, name, relationship, connected_at FROM family_connections WHERE inviter_user_id = ?')
const listConnectionsAsInviteeStatement = database.prepare(`
  SELECT family_connections.id, users.email, family_connections.relationship, family_connections.connected_at
  FROM family_connections
  JOIN users ON users.id = family_connections.inviter_user_id
  WHERE family_connections.invitee_user_id = ?
`)
const listAppointmentsStatement = database.prepare('SELECT data_json FROM appointments WHERE user_id = ? ORDER BY id')
const upsertAppointmentStatement = database.prepare(`
  INSERT INTO appointments (id, user_id, data_json, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
`)
const deleteAppointmentsStatement = database.prepare('DELETE FROM appointments WHERE user_id = ?')
const listVisitRecordsStatement = database.prepare('SELECT data_json FROM visit_records WHERE user_id = ? ORDER BY id')
const upsertVisitRecordStatement = database.prepare(`
  INSERT INTO visit_records (id, user_id, data_json, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
`)
const deleteVisitRecordsStatement = database.prepare('DELETE FROM visit_records WHERE user_id = ?')
const consumeAiUsageStatement = database.prepare(`
  INSERT INTO ai_usage (subject, day, count) VALUES (?, ?, 1)
  ON CONFLICT(subject, day) DO UPDATE SET count = count + 1
`)
const readAiUsageStatement = database.prepare('SELECT count FROM ai_usage WHERE subject = ? AND day = ?')

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

export function saveUserState(userId, state, baseUpdatedAt) {
  const existing = loadStateStatement.get(userId)
  // 다른 기기에서 먼저 저장한 기록을 마지막 저장이 조용히 덮어쓰지 않도록 버전을 비교한다.
  if (existing && baseUpdatedAt !== undefined && existing.updated_at !== baseUpdatedAt) {
    throw new StateConflictError(existing.state_json, existing.updated_at)
  }
  const updatedAt = new Date().toISOString()
  saveStateStatement.run(userId, JSON.stringify(state), updatedAt)
  return updatedAt
}

export function deleteAccount(userId) {
  deleteUserStatement.run(userId)
}

export function createInvitation(ownerUserId, name, relationship) {
  const invitation = {
    id: randomUUID(),
    code: createInviteCode(),
    name,
    relationship,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  insertInvitationStatement.run(invitation.id, ownerUserId, invitation.code, invitation.name, invitation.relationship, invitation.status, invitation.createdAt)
  return invitation
}

export function listInvitations(ownerUserId) {
  return listInvitationsStatement.all(ownerUserId).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    relationship: row.relationship,
    status: row.status,
    createdAt: row.created_at,
  }))
}

export function cancelInvitation(ownerUserId, invitationId) {
  cancelInvitationStatement.run(invitationId, ownerUserId)
}

export function findInvitationByCode(code) {
  const row = findInvitationByCodeStatement.get(code)
  if (!row) return null
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    code: row.code,
    name: row.name,
    relationship: row.relationship,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function acceptInvitation(code, acceptingUserId) {
  const invitation = findInvitationByCode(code)
  if (!invitation || invitation.status !== 'pending') {
    throw new AccountError('유효하지 않거나 이미 처리된 초대입니다.', 'INVITE_INVALID')
  }
  if (invitation.ownerUserId === acceptingUserId) {
    throw new AccountError('자신이 만든 초대는 수락할 수 없습니다.', 'INVITE_SELF')
  }
  acceptInvitationStatement.run(invitation.id)
  insertConnectionStatement.run(randomUUID(), invitation.ownerUserId, acceptingUserId, invitation.name, invitation.relationship, new Date().toISOString())
  return invitation
}

export function listFamilyMembers(userId) {
  const invited = listConnectionsAsInviterStatement.all(userId).map((row) => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    conditions: [],
    connectedAt: row.connected_at,
  }))
  const inviters = listConnectionsAsInviteeStatement.all(userId).map((row) => ({
    id: `inviter-${row.id}`,
    name: row.email.split('@')[0],
    relationship: '나를 초대한 가족',
    conditions: [],
    connectedAt: row.connected_at,
  }))
  return [...invited, ...inviters]
}

export function listUserAppointments(userId) {
  return readRows(listAppointmentsStatement, userId)
}

export function replaceUserAppointments(userId, items) {
  replaceRows(deleteAppointmentsStatement, upsertAppointmentStatement, userId, items)
}

export function listUserVisitRecords(userId) {
  return readRows(listVisitRecordsStatement, userId)
}

export function replaceUserVisitRecords(userId, items) {
  replaceRows(deleteVisitRecordsStatement, upsertVisitRecordStatement, userId, items)
}

function readRows(statement, userId) {
  const rows = []
  for (const row of statement.all(userId)) {
    try {
      rows.push(JSON.parse(row.data_json))
    } catch {
      // 손상된 행은 건너뛴다.
    }
  }
  return rows
}

function replaceRows(deleteStatement, upsertStatement, userId, items) {
  const updatedAt = new Date().toISOString()
  database.exec('BEGIN')
  try {
    deleteStatement.run(userId)
    for (const item of items) {
      upsertStatement.run(String(item.id), userId, JSON.stringify(item), updatedAt)
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export function consumeAiQuota(subject, dailyLimit) {
  const day = new Date().toISOString().slice(0, 10)
  const current = readAiUsageStatement.get(subject, day)?.count ?? 0
  if (current >= dailyLimit) return false
  consumeAiUsageStatement.run(subject, day)
  return true
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

export class StateConflictError extends Error {
  constructor(latestStateJson, latestUpdatedAt) {
    super('다른 기기에서 먼저 저장한 기록이 있습니다.')
    this.name = 'StateConflictError'
    this.latestStateJson = latestStateJson
    this.latestUpdatedAt = latestUpdatedAt
  }
}

function createInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = randomBytes(6)
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
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
