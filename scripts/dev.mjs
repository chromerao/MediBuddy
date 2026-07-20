import { spawn } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
// --https: 자체 서명 인증서로 개발 서버를 열어 다른 기기에서도 보안 컨텍스트를 쓸 수 있게 한다.
const useHttps = process.argv.includes('--https')
const children = [
  spawn(process.execPath, ['--watch', path.join(root, 'server', 'index.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(process.execPath, [viteCli, '--host', '0.0.0.0'], {
    cwd: root,
    stdio: 'inherit',
    env: useHttps ? { ...process.env, MEDIBUDDY_HTTPS: 'true' } : process.env,
  }),
]

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  windowlessExit(exitCode)
}

function windowlessExit(exitCode) {
  setTimeout(() => process.exit(exitCode), 50)
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('개발 서버를 시작하지 못했습니다:', error.message)
    shutdown(1)
  })
  child.on('exit', (code) => {
    if (!shuttingDown) shutdown(code ?? 1)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
