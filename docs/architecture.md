# ax-stack 아키텍처

## 목차
- [1. 개요](#1-개요)
- [2. 서버·런타임](#2-서버런타임)
- [3. 라우팅 — Caddy + 서브도메인](#3-라우팅--caddy--서브도메인)
- [4. 메인 사이트(정적)](#4-메인-사이트정적)
- [5. 포트폴리오 프로젝트 누적 패턴](#5-포트폴리오-프로젝트-누적-패턴)
- [6. 자원 전략 (4GB 운영)](#6-자원-전략-4gb-운영)
- [7. 디렉토리 구조](#7-디렉토리-구조)

## 1. 개요
회사(ax-stack) 메인 홍보 사이트 + 포트폴리오 프로젝트들을 **서브도메인 기반**으로 무한 누적하는 허브.
- 메인: `https://ax-stack.com` (정적 SPA)
- 프로젝트: `https://<id>.ax-stack.com` (각자 독립 컨테이너 스택)
- 핵심 원칙: **메인에 흡수 X, 별도 운영 + 링크.** 메인 SPA의 포트폴리오 카드가 각 서브도메인으로 새 탭 링크.

## 2. 서버·런타임
- **서버**: 텐센트 클라우드 Ubuntu 24.04, `43.133.243.241`, 2 vCPU / **4GB RAM** / 60GB Disk. 계정 `ubuntu`(SSH 키 `ssh/drops.pem`).
- **호스트엔 Docker만 설치**(깔끔 원칙). nginx·DB·Caddy 전부 컨테이너. 호스트 OS는 Docker 외 추가 설치 지양.
- Docker 29.x + Compose v5. OrbStack 아님(Linux 서버, 네이티브 dockerd).
- 서버 스택 루트: `~/ax-stack/`. 로컬 `server/`가 IaC 미러(단일 진실).

## 3. 라우팅 — Caddy + 서브도메인
- **Caddy 컨테이너**가 80/443 단독 점유, 자동 HTTPS(Let's Encrypt HTTP-01). `caddy_data` 볼륨에 인증서 보관·자동 갱신.
- `server/caddy/Caddyfile` 구조:
  ```caddy
  ax-stack.com, www.ax-stack.com {
      reverse_proxy landing:80          # 메인 정적
  }
  <id>.ax-stack.com {
      reverse_proxy <id>-web:80         # 포트폴리오 프로젝트
  }
  ```
- **서브도메인 추가 = Caddyfile 블록 1개 + 컨테이너 + (와일드카드 A레코드 덕에) DNS 작업 불필요.** 접속 시 Caddy가 인증서 자동 발급.
- 모든 서비스 컨테이너는 `ax-stack-web` 네트워크에 연결돼야 Caddy가 컨테이너명으로 도달 가능. 내부 의존(DB/redis/worker)은 프로젝트 전용 internal 네트워크.

## 4. 메인 사이트(정적)
- `site/`: Vite 6 + React 19 + Tailwind 4 + GSAP. 풀페이지 슬라이드 SPA(Intro/Portfolio/Company/Services/Contact).
- 빌드: `cd site && npm run build` → `site/dist/`. 배포: `dist/` → 서버 `~/ax-stack/sites/landing/`. `landing`(nginx:alpine)이 정적 서빙.
- **포트폴리오 카드 데이터**: `site/public/registry.json`(빌드 시 dist 루트로 복사). SPA가 `/registry.json` fetch → 카드 렌더.
  - 스키마: `[{ "id", "name", "url" }]`. `url` = `https://<id>.ax-stack.com`(외부 새 탭). 비거나 실패 시 데모 카드 폴백.
- 컨테이너 재시작 불필요: `sites/landing/`는 `landing`에 바인드마운트(`:ro`)라 파일 교체 즉시 반영.

## 5. 포트폴리오 프로젝트 누적 패턴
- 각 프로젝트 = `projects/<id>/`(compose 조각) + Caddyfile 블록 + registry 항목.
- 스크립트 `scripts/add-subdomain.sh <id> --name "표시명"`이 3가지를 일괄 처리(템플릿 치환).
- **네임스페이스**: 컨테이너·네트워크·볼륨 모두 `<id>-*`/`ax-<id>-*` 접두사로 충돌 방지.
- 프로젝트 유형:
  - **정적 데모**: 별도 컨테이너 없이 `landing`에 경로/서브도메인으로 얹거나, 초경량 nginx 1개.
  - **동적 풀스택**: web/api/(worker/db) 컨테이너. 반드시 `mem_limit` + 가능하면 on-demand.

## 6. 자원 전략 (4GB 운영)
> 풀스택을 무한 누적하면 4GB 한계. 아래를 **모든 신규 프로젝트에 적용**.
1. **경량/정적 우선**: 가능한 한 정적 SPA로. 정적은 메모리 ≈ 0.
2. **공유 인프라**: DB/redis는 프로젝트마다 띄우지 말고 공유 1세트(DB·스키마 분리) 옵션.
3. **`mem_limit`**: 모든 동적 컨테이너에 상한(OOM 연쇄 차단).
4. **On-demand 기상(Sablier) + idle 종료**: 무거운 데모는 평소 down → 서브도메인 접속 시 Caddy(Sablier 미들웨어)가 자동 기상, 워밍업 후 진입, 미사용 N분 후 자동 종료.
   - 구현: 표준 Caddy엔 Sablier 모듈 없음 → `server/caddy/Dockerfile`에서 **xcaddy로 Sablier 포함 커스텀 이미지** 빌드. 대안: 자체 wake 오케스트레이터(버튼+헬스체크 리다이렉트).
5. **모니터링·증설**: `free -h`·`docker stats` 주기 확인. RAM이 진짜 병목, 디스크(60GB)는 후순위. 임계 시 텐센트 콘솔에서 증설.
6. **디스크 관리**: 빌드는 Actions(클라우드)에서 → 서버 빌드 캐시 최소화. `docker image/builder prune` 정기화. 미디어 볼륨 모니터링.

## 7. 디렉토리 구조
```
ax-stack/
├── CLAUDE.md                 # 세션 진입점(얇게)
├── ssh/                      # drops.pem(미추적), connect.sh
├── site/                     # 메인 사이트(Vite SPA)
│   ├── public/registry.json  # 포트폴리오 카드 단일 진실(빌드 포함)
│   └── src/App.tsx           # 브랜드·registry fetch·슬라이드
├── server/                   # 서버 ~/ax-stack IaC 미러
│   ├── compose.yaml          # caddy + landing (+ 프로젝트 누적)
│   └── caddy/Caddyfile       # 라우팅·자동 HTTPS
├── projects/<id>/            # 서브도메인 프로젝트 compose 조각
├── scripts/                  # add-subdomain.sh, deploy-*.sh
├── templates/                # 프로젝트 템플릿
├── .github/workflows/        # CI/CD
└── docs/                     # 이 문서들
```
