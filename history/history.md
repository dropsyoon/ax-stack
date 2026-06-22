# ax-stack 작업 이력

> 매 작업 시 맨 아래에 `## YYYY-MM-DD` 블록을 **추가만** 한다(기존 무수정). 목차도 갱신.

## 목차
- [2026-06-22 — 인프라 골격 + 메인 사이트 이전·리뉴얼](#2026-06-22--인프라-골격--메인-사이트-이전리뉴얼)
- [2026-06-22 (이어서) — CI/CD·서브도메인 패턴 검증·자동화](#2026-06-22-이어서--cicd서브도메인-패턴-검증자동화)

---

## 2026-06-22 — 인프라 골격 + 메인 사이트 이전·리뉴얼

### 배경
회사(ax-stack) 홍보 + 포트폴리오 허브 신규 구축. 도메인 `ax-stack.com` + 텐센트 서버 `43.133.243.241` 준비됨.
기존 `drops_infra`(drops.sumzip.com)의 메인 SPA를 이전·리뉴얼하고, 포트폴리오는 **서브도메인 기반**으로 누적.

### 서버 실측 (착수 시점)
- Ubuntu 24.04, 2 vCPU / 4GB RAM / 60GB(43GB free). 호스트엔 Docker만.
- 이미 `~/ax-stack/` 스택 가동 중: **Caddy(자동 HTTPS) + landing(nginx:alpine 임시 랜딩)**, 네트워크 `ax-stack-web`.
- Caddyfile에 서브도메인 라우팅 예시가 주석으로 준비돼 있었음 → 설계 의도와 일치.
- DNS: `ax-stack.com`/`www`만 서버 지정. `*.ax-stack.com` 와일드카드는 미설정(사용자 작업 대기).

### 한 일
1. 로컬 폴더 골격 생성: `/Users/euclidsoft/drops/ax-stack/{ssh,site,server,projects,scripts,templates,.github/workflows,docs,history}`.
2. SSH 키 배치(`ssh/drops.pem`, `ssh/connect.sh`). 접속: `ssh -i ssh/drops.pem ubuntu@43.133.243.241`.
3. 서버 `~/ax-stack/{compose.yaml,caddy/Caddyfile}`을 로컬 `server/`로 IaC 미러.
4. `drops_infra/home/`(Vite+React19+Tailwind4+GSAP) → `site/`로 이전. 컨테이너용 파일(Dockerfile/compose/nginx.conf) 제거(정적 배포 전용).
5. **ax-stack 리뉴얼**(`site/src/App.tsx`, `index.html`):
   - 브랜드: `drops studio`→`ax-stack`, 로고 `DROPS`→`ax-stack`, footer `DROPS STUDIO®`→`AX-STACK®`.
   - intro italic 강조 분기 조정(`charIdx>5`→`>2`, 'stack' 강조).
   - **포트폴리오 카드 링크 서브도메인화**: registry fetch href를 `p.url || p.path || https://<id>.ax-stack.com`, 카드 새 탭(`target=_blank`).
   - localStorage 테마 키 `drops-theme`→`ax-stack-theme`. html lang/title/description ax-stack.
6. `site/public/registry.json` 단일 진실 생성(빌드 포함). 기존 2개는 잠정 `drops.sumzip.com` URL(이전 후 서브도메인으로 교체 예정).
7. 빌드 검증 성공: `vite build` exit 0, dist 290KB JS, ax-stack 브랜드 반영 확인.
8. 자립 문서 작성: `CLAUDE.md`, `docs/architecture.md`, `docs/operations.md`, 본 `history.md`, `.gitignore`.

### 다음 (TODO)
- [ ] GitHub 레포 `dropsyoon/ax-stack`(private) 생성 + 초기 push.
- [ ] `server/caddy/Dockerfile`(Sablier 커스텀 Caddy) + `scripts/add-subdomain.sh` + `templates/`.
- [ ] CI/CD `.github/workflows/`(deploy-site, deploy-stack) + `gh secret set`.
- [ ] **사용자**: 가비아 `*.ax-stack.com` 와일드카드 A레코드 → 43.133.243.241.
- [ ] 메인 사이트 첫 배포 → `https://ax-stack.com` 확인.
- [ ] 기존 포트폴리오(drops-rag→rag, drops-podcast→podcast) 서브도메인 이전.

---

## 2026-06-22 (이어서) — CI/CD·서브도메인 패턴 검증·자동화

### 한 일
1. **GitHub 레포**: `dropsyoon/ax-stack`(private) 생성·초기 push. SSH 키 미등록이라 origin을 HTTPS+gh토큰으로 전환.
2. **메인 사이트 첫 배포**: `vite build`(registry.json 포함) → 서버 `~/ax-stack/sites/landing/` rsync → **`https://ax-stack.com` 라이브**(스크린샷 정상, title=ax-stack).
3. **CI/CD 구성·검증**: `.github/workflows/deploy-site.yml`(site 빌드→rsync), `deploy-stack.yml`(server 동기화→compose up→caddy reload). Secrets(SSH_PRIVATE_KEY/HOST/USER) 등록. push로 **두 워크플로 실제 성공**.
4. **와일드카드 DNS**(사용자): 가비아 `*.ax-stack.com` A→43.133.243.241. 전파 확인(임의 서브도메인 모두 서버 IP).
5. **서브도메인 패턴 end-to-end 검증**: `hello.ax-stack.com`(정적 nginx 컨테이너 + Caddy reverse_proxy) → **HTTP 200 + Let's Encrypt 자동 인증서**(6/22~9/20).
6. **자동화 산출물**: `scripts/add-subdomain.sh`(static/proxy 모드 — Caddyfile·compose·registry 일괄 등록), `scripts/deploy-stack.sh`·`deploy-site.sh`.

### 트러블슈팅(중요 교훈)
- **서브도메인 인증서 실패 원인 ①**: Caddyfile의 `http:// { reverse_proxy landing:80 }` catch-all이 80포트 전체(ACME HTTP-01 챌린지 포함)를 가로챔 → 제거.
- **원인 ②(핵심)**: Caddyfile은 **단일 파일 바인드마운트**. rsync 기본 동작이 새 inode로 교체 → 컨테이너가 옛 내용 유지(`config is unchanged`). **해결: rsync `--inplace`(inode 유지) + caddy reload**. 어긋난 경우 `up -d --force-recreate caddy`로 1회 복구. → `scripts/deploy-stack.sh`·`deploy-stack.yml`에 반영.

### 현재 라이브 상태
- `https://ax-stack.com` (메인, 정적 SPA)
- `https://hello.ax-stack.com` (서브도메인 패턴 레퍼런스, 정적)

### 다음
- [ ] Task 5: 기존 포트폴리오 이전 — `drops-rag`→`rag.ax-stack.com`, `drops-podcast`→`podcast.ax-stack.com`. 소스 확보·basePath 루트화(소스변경 사용자 분담)·리소스 점검(4GB)·on-demand(Sablier) 검토.
- [ ] (선택) 파비콘 추가(현재 favicon.ico 404), 회사 콘텐츠(Company/Services/Contact 문구) 다듬기.
