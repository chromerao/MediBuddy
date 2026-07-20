import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// MEDIBUDDY_HTTPS=true 로 실행하면 자체 서명 인증서로 https 개발 서버를 연다.
// 다른 기기(휴대폰 등)에서 IP로 접속해도 보안 컨텍스트가 되어
// 마이크 녹음·알림·공유 시트·crypto API를 모두 테스트할 수 있다.
const useHttps = process.env.MEDIBUDDY_HTTPS === 'true'

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
