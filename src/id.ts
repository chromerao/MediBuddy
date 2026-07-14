// crypto.randomUUID()는 보안 컨텍스트(https·localhost)에서만 존재한다.
// LAN IP(http://192.168.x.x)로 접속한 테스트 기기에서도 저장 기능이 죽지 않도록
// getRandomValues 기반 UUID v4 폴백을 둔다.
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
