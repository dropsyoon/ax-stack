# ax-stack 운영·배포 런북

## 목차
- [1. SSH 접속](#1-ssh-접속)
- [2. 서버 스택 구조](#2-서버-스택-구조)
- [3. 메인 사이트 배포](#3-메인-사이트-배포)
- [4. 서브도메인 프로젝트 추가](#4-서브도메인-프로젝트-추가)
- [5. CI/CD (GitHub Actions)](#5-cicd-github-actions)
- [6. 와일드카드 DNS (가비아)](#6-와일드카드-dns-가비아)
- [7. 트러블슈팅](#7-트러블슈팅)

## 1. SSH 접속
```bash
ssh -i ssh/drops.pem ubuntu@43.133.243.241
# 또는 헬퍼
ssh/connect.sh "cd ~/ax-stack && docker compose ps"
```
- 키 `ssh/drops.pem`(권한 600, git 미추적). 보안그룹 80/443/22는 텐센트 콘솔에서 개방됨.

## 2. 서버 스택 구조
서버 `~/ax-stack/` ↔ 로컬 `server/`(IaC 미러, 단일 진실).
```
~/ax-stack/
├── compose.yaml          # caddy(80/443) + landing(nginx) [+ 프로젝트 누적]
├── caddy/Caddyfile       # 라우팅·자동 HTTPS
└── sites/landing/        # 메인 정적 산출물(dist 내용)
```
서버 명령:
```bash
cd ~/ax-stack
docker compose ps              # 상태
docker compose up -d           # 적용(변경 후)
docker compose logs caddy | tail -30   # 인증서·라우팅 로그
```

## 3. 메인 사이트 배포
**정식 경로 = git push → GitHub Actions 자동 배포**(아래 5절). 수동 배포는:
```bash
cd site && npm ci && npm run build          # → site/dist/
rsync -az --delete -e "ssh -i ../ssh/drops.pem" \
  dist/ ubuntu@43.133.243.241:/home/ubuntu/ax-stack/sites/landing/
# landing 바인드마운트라 즉시 반영(재시작 불필요)
curl -I https://ax-stack.com                # 200 확인
```
- `registry.json`은 `site/public/`에 있어 빌드 산출물에 포함됨. 프로젝트 추가 시 이 파일 갱신 → 재빌드/배포.

## 4. 서브도메인 프로젝트 추가
```bash
# 정적 데모(nginx 컨테이너 자동 생성):
scripts/add-subdomain.sh <id> --name "표시명"
# 동적 프로젝트(외부 컨테이너를 ax-stack-web 네트워크에 <id>-web 으로 연결):
scripts/add-subdomain.sh <id> --name "표시명" --type proxy --target <id>-web:80
```
스크립트가 처리: `server/caddy/Caddyfile` 라우팅 블록(append, inode 유지) + (static) `server/compose.yaml` 서비스 + `server/sites/<id>/` + `site/public/registry.json` 카드 항목.
이후 배포:
```bash
scripts/deploy-stack.sh        # server/ 동기화(--inplace) + compose up + caddy reload
# 와일드카드 A레코드 덕에 DNS 작업 불필요. 첫 https 접속 시 Caddy가 인증서 자동 발급.
curl -I https://<id>.ax-stack.com
# 메인 카드 반영: site/** push → Actions, 또는 scripts/deploy-site.sh
```
> 검증된 레퍼런스: `hello.ax-stack.com`(정적, `server/sites/hello/`).

### 4.5 무거운 프로젝트 on-demand (Sablier)
메모리 큰 프로젝트는 평소 down, 접속 시 자동 기상·idle 후 종료(4GB 보호).
- **인프라**: Caddy를 sablier 플러그인 커스텀 빌드(`server/caddy/Dockerfile`) + `sablier` 서버 컨테이너(docker socket). `server/compose.yaml`에 정의됨.
- **프로젝트 적용**:
  1. 프로젝트 compose의 각 서비스에 라벨 `["sablier.enable=true", "sablier.group=<id>"]`.
  2. Caddyfile `<id>` 블록을 route로:
     ```caddy
     <id>.ax-stack.com {
       route {
         sablier http://sablier:10000 {
           group <id>
           session_duration 10m
           dynamic { display_name "<표시명>"; theme ghost; refresh_frequency 5s }
         }
         reverse_proxy <id>-web:<port>
       }
     }
     ```
  3. 배포: `scripts/deploy-stack.sh`(caddy `--build` 포함) + 프로젝트 `docker compose up -d`(라벨 반영).
- **검증**: 프로젝트 `docker compose stop` → `curl https://<id>.ax-stack.com` → 수 초 내 컨테이너 기상 → 실제 앱.
- **레퍼런스**: `drops-rag`(rag.ax-stack.com). 평소 down(메모리 ~0.9GB 회수) → 접속 시 ~5초 기상 → idle 10분 종료.

## 5. CI/CD (GitHub Actions)
- 레포: `dropsyoon/ax-stack` (PRIVATE).
- `.github/workflows/deploy-site.yml`: `site/**` 변경 push→main → Node 빌드 → rsync `dist/` → 서버 `sites/landing/`.
- `.github/workflows/deploy-stack.yml`: `server/**` 변경 → `~/ax-stack/` 동기화 → `docker compose up -d`.
- **Secrets**(레포): `SSH_PRIVATE_KEY`(drops.pem 내용), `SSH_HOST`=43.133.243.241, `SSH_USER`=ubuntu.
  ```bash
  gh secret set SSH_PRIVATE_KEY < ssh/drops.pem
  gh secret set SSH_HOST --body 43.133.243.241
  gh secret set SSH_USER --body ubuntu
  ```
- 서버는 GitHub 키 불필요(Actions가 서버로 push, 서버는 수신만).

## 6. 와일드카드 DNS (가비아)
- **사용자 작업(외부 콘솔)**: 가비아 DNS 관리 → `*.ax-stack.com` **A레코드 → 43.133.243.241** 추가.
  - 호스트: `*` / 타입: `A` / 값: `43.133.243.241`.
- 설정 후 임의 서브도메인이 서버로 도달. 확인: `dig +short test.ax-stack.com` → 서버 IP.
- TLS는 가비아 API 불필요(Caddy HTTP-01 개별 자동 발급).

## 7. 트러블슈팅
- **사이트 안 뜸**: ① `dig +short ax-stack.com`=서버IP ② 보안그룹 80/443 ③ `docker compose ps`(caddy·landing Up) ④ `docker compose logs caddy`.
- **서브도메인 인증서 실패**: 와일드카드 A레코드 존재 확인 + Caddy 로그. HTTP-01은 해당 호스트가 서버로 도달해야 발급됨. **Caddyfile에 `http:// { reverse_proxy ... }` catch-all 블록을 두지 말 것** — 80포트 전체를 프록시하면 ACME 챌린지(`/.well-known/acme-challenge/`)를 가로채 발급 실패.
- **Caddyfile 변경이 반영 안 됨(`config is unchanged`)**: 단일 파일 바인드마운트라 rsync가 새 inode로 교체하면 컨테이너가 옛 내용을 본다. 배포는 **`rsync --inplace`**(inode 유지) + `caddy reload`. 이미 어긋났으면 `docker compose up -d --force-recreate caddy`로 1회 복구. (`scripts/deploy-stack.sh`·`deploy-stack.yml`은 `--inplace` 적용됨.)
- **메모리 압박**: `free -h`, `docker stats --no-stream`. 무거운 컨테이너 `mem_limit` 확인, on-demand 전환 검토.
- **디스크 부족**: `docker image prune -f`, `docker builder prune -f`.
