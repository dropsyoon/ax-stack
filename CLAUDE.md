# ax-stack — 작업 지침 (세션 연속성 진입점)

> 새 세션은 **이 파일 + `history/history.md` 최신 블록**을 먼저 읽는다. 상세는 아래 문서 인덱스 참조.
> 이 파일은 **얇게 유지**한다(정체성·절대규칙·루틴·핵심사실·인덱스만). 상세 지식은 `docs/`에 둔다.

## 1. 정체성
- **ax-stack**(회사) 홍보 + 포트폴리오 허브. `https://ax-stack.com` 메인 + `*.ax-stack.com` 서브도메인으로 포트폴리오 누적.
- 컨셉: **메인에 흡수하지 않고, 각 프로젝트를 별도 컨테이너로 운영하며 서브도메인으로 링크**. 특수 기능 페이지를 계속 추가.
- 코드 위치: `/Users/euclidsoft/drops/ax-stack` (이 폴더). GitHub: `dropsyoon/ax-stack` (PRIVATE, 모노레포).
- **기존 `drops_infra`(192.168.0.19 / drops.sumzip.com)와는 완전 분리된 신규 인프라.** 그쪽을 건드리지 않는다.

## 2. 절대 규칙 (위반 금지)
1. **서버는 텐센트 클라우드 Ubuntu 1대**(`43.133.243.241`). 호스트엔 **Docker만** 설치(깔끔 원칙) — 호스트에 nginx/DB 직접 설치 금지.
2. **리버스 프록시는 Caddy 컨테이너 1개**가 전담(80/443, 자동 HTTPS). 모든 서비스는 컨테이너로, `ax-stack-web` 네트워크에 연결.
3. **메인 사이트는 정적**(Vite 빌드 산출물 → `landing` nginx). 동적 포트폴리오만 별도 컨테이너.
4. **4GB RAM 자원 전략 준수**: 경량/정적 우선, 공유 인프라, `mem_limit`, on-demand 기상(Sablier)+idle 종료. → `docs/architecture.md`.
5. **배포는 GitHub Actions → SSH**. 로컬에서 서버로 직접 rsync도 가능하나, 정식 변경은 git push 경유.
6. **작업할 때마다 `history/history.md` 맨 아래에 `## YYYY-MM-DD` 블록 추가**(기존 무수정, 추가만). 목차도 갱신.

## 3. 시작 루틴 (매 세션)
1. `history/history.md` 최신 블록으로 마지막 상태 파악.
2. 서버 상태: `ssh/connect.sh "cd ~/ax-stack && docker compose ps"` / `ssh/connect.sh "free -h; docker stats --no-stream"`.
3. 작업 후 history 갱신(규칙 6).

## 4. 핵심 사실 (빠른 참조)
- **SSH 접속**: `ssh -i ssh/drops.pem ubuntu@43.133.243.241` (헬퍼: `ssh/connect.sh "<명령>"`). 키 `ssh/drops.pem`(git 미추적).
- **서버 스택 위치**: `~/ax-stack/`(서버) ↔ 로컬 `server/`(IaC 미러). `compose.yaml`(caddy+landing) + `caddy/Caddyfile` + `sites/landing/`(정적 산출물).
- **도메인/DNS**: `ax-stack.com` 가비아 관리. `*.ax-stack.com` **와일드카드 A레코드 → 43.133.243.241**(사용자가 가비아 콘솔에서 설정). 서브도메인 추가 시 DNS 작업 불필요.
- **TLS**: Caddy 자동(HTTP-01). Caddyfile에 `<id>.ax-stack.com {}` 블록만 추가하면 인증서 자동 발급.
- **메인 사이트**: `site/`(Vite+React19+Tailwind4+GSAP). 빌드 `cd site && npm run build` → `dist/` → 서버 `~/ax-stack/sites/landing/`.
- **포트폴리오 카드 소스**: `site/public/registry.json`(빌드에 포함). 항목 `{ id, name, url }`, `url`은 `https://<id>.ax-stack.com`. 메인 SPA가 fetch해 카드 렌더.
- **sudo**: 서버 `ubuntu`는 docker·홈 디렉토리 작업에 sudo 불필요. 보안그룹(80/443)은 텐센트 콘솔(사용자).

## 5. 문서 인덱스 (상세는 여기서)
- **설계·구조·자원전략** → [`docs/architecture.md`](docs/architecture.md)
- **운영·배포·CI/CD·런북** → [`docs/operations.md`](docs/operations.md)
- **시간순 이력** → [`history/history.md`](history/history.md) (항상 최신 블록 확인)

## 6. 진행 상태
- [x] 로컬 폴더 골격 + site 이전·ax-stack 리뉴얼 + 빌드 검증.
- [x] CI/CD(GitHub Actions → SSH 배포) + 레포 `dropsyoon/ax-stack`. **동작 검증됨**.
- [x] 와일드카드 A레코드(사용자 완료) + **메인 사이트 라이브** `https://ax-stack.com`.
- [x] 서버 IaC 미러(`server/`) + `scripts/add-subdomain.sh` + **서브도메인 패턴 검증**(`hello.ax-stack.com` 자동 인증서 200).
- [x] **drops-rag 이전**(`rag.ax-stack.com`) + **on-demand(Sablier)** — 평소 down→접속 시 ~5초 기상→idle 10m 종료.
- [ ] **drops-podcast 이전**(`podcast.ax-stack.com`) — 남음. 선행: 원본 소스 2줄 수정(사용자 분담, `web/next.config.js` basePath·`api/app/main.py` root_path를 `/`로) + NLM 쿠키 프로파일 이전 + worker on-demand.
> 세부는 `history/history.md` 최신 블록 참조. 핵심 함정: ① Caddyfile은 단일파일 바인드마운트 → 배포는 `--inplace`+`caddy reload` ② caddy가 build 서비스(sablier) → `deploy-stack --build`.
