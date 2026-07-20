# 메디버디 HTTPS·배포 가이드

마이크 녹음, 브라우저 알림(Web Push), 공유 시트, `crypto.randomUUID`는 모두
**보안 컨텍스트(https 또는 localhost)** 에서만 동작한다. `http://192.168.x.x`처럼
IP로 접속하면 이 기능들이 제한되므로, 다른 기기 테스트와 운영 배포는 아래 방법을 사용한다.

## 1. 개발 중 다른 기기(휴대폰)로 테스트하기

### 방법 A — 자체 서명 HTTPS (가장 간단)

```bash
npm run dev:https
```

- `https://<PC의 IP>:5173` 으로 접속한다.
- 처음 접속 시 "안전하지 않음" 경고가 뜨면 **고급 → 계속 이동**을 누른다
  (자체 서명 인증서라 뜨는 정상적인 경고).
- 이후 마이크·알림·공유가 모두 동작한다.

### 방법 B — Cloudflare Tunnel (경고 없는 실제 HTTPS)

```bash
# 1회 설치: winget install Cloudflare.cloudflared
npm run dev                       # 터미널 1
cloudflared tunnel --url http://localhost:5173   # 터미널 2
```

- 출력되는 `https://xxxx.trycloudflare.com` 주소를 휴대폰에서 연다.
- 인증서 경고가 없고 외부망에서도 접속 가능하다. 임시 URL이므로 데모·테스트용.

### 방법 C — Android USB 연결

```bash
adb reverse tcp:5173 tcp:5173
```

휴대폰에서 `http://localhost:5173` 접속 — localhost는 http여도 보안 컨텍스트다.

## 2. Railway 테스트 배포 (권장)

현재 프로젝트는 Express API가 빌드된 프론트엔드도 함께 제공하므로 Railway 서비스
하나로 배포할 수 있다. 저장소 루트의 `railway.json`이 다음 설정을 자동으로 적용한다.

- Build: `npm run build`
- Start: `npm run start`
- Health check: `/api/health/llm`

### 배포 순서

1. Railway에서 **New Project → Deploy from GitHub repo**를 선택하고 저장소를 연결한다.
2. 생성된 서비스에 Volume을 추가하고 Mount Path를 `/app/data`로 지정한다.
3. 서비스의 Variables에 아래 값을 등록한다.

```env
OPENAI_API_KEY=새로_발급한_키
SESSION_COOKIE_SECURE=true
TRUST_PROXY=true
TZ=Asia/Seoul
```

Volume을 연결하면 Railway가 제공하는 `RAILWAY_VOLUME_MOUNT_PATH`를 감지해
`/app/data/medibuddy.sqlite`를 자동으로 사용한다. 명시적으로 지정하려면 다음 변수도
추가할 수 있다.

```env
DATABASE_PATH=/app/data/medibuddy.sqlite
```

4. 서비스의 **Settings → Networking → Generate Domain**을 눌러 HTTPS 주소를 만든다.
5. `https://발급주소/api/health/llm`에서 `configured: true`인지 확인한다.

푸시 알림까지 테스트하려면 `npm run vapid:generate`로 만든 값을 Variables에 추가한다.

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:운영자메일
```

Railway가 제공하는 `PORT`를 서버가 우선 사용하므로 포트 번호는 직접 설정하지 않아도 된다.
Volume을 연결하지 않으면 배포나 재시작 시 SQLite 데이터가 사라질 수 있다.

## 3. 자체 서버 운영 배포

권장 구조: **Nginx(또는 Caddy) 리버스 프록시가 HTTPS를 종료**하고,
뒤의 Node 서버(`npm run start`, 기본 8787 포트)로 전달한다.
API 서버가 `dist/`를 직접 서빙하므로 프록시는 8787 하나만 바라보면 된다.

```bash
npm run build     # dist/ 생성
npm run start     # API + 정적 파일 서빙 (포트 8787)
```

Caddy 예시(인증서 자동 발급):

```
medibuddy.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

## 4. 운영 환경변수 체크리스트 (.env)

| 변수 | 값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | (새로 발급한 키) | 노출된 적 있는 키는 반드시 폐기 후 교체 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npm run vapid:generate`로 생성 | 백그라운드 푸시 알림용 |
| `VAPID_SUBJECT` | `mailto:운영자메일` | 푸시 서비스에 전달되는 연락처 |
| `SESSION_COOKIE_SECURE` | `true` | HTTPS에서만 세션 쿠키 전송 |
| `TRUST_PROXY` | `true` | 리버스 프록시 뒤에서 실제 클라이언트 IP로 요청 제한 |
| `TZ` | `Asia/Seoul` | 알림 스케줄러의 오늘/내일 판정 기준 시간대 |
| `DATABASE_PATH` | 예: `/var/lib/medibuddy/medibuddy.sqlite` | 백업 대상 |
| `AI_DAILY_LIMIT` | 필요 시 조정 (기본 40) | 사용자·익명별 AI 일일 호출 한도 |
| `API_PORT` | 기본 8787 | |

## 5. 배포 후 확인

1. `https://도메인/api/health/llm` → `configured: true`
2. `https://도메인/api/notifications/config` → `configured: true`
3. 휴대폰에서 로그인 → 설정에서 알림 켜기 → 브라우저 권한 허용
4. 내일 날짜의 병원 일정 등록 → 탭을 닫아도 스케줄러(기본 5분 주기)가 푸시 발송
