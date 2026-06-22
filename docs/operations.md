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
scripts/add-subdomain.sh <id> --name "표시명"
```
스크립트가 처리: `projects/<id>/` 템플릿 생성 + `server/caddy/Caddyfile`에 `<id>.ax-stack.com` 블록 + `site/public/registry.json` 항목 추가.
이후:
```bash
# 서버에 server/ 동기화 + 프로젝트 기동
rsync -az -e "ssh -i ssh/drops.pem" server/ ubuntu@43.133.243.241:/home/ubuntu/ax-stack/
ssh/connect.sh "cd ~/ax-stack && docker compose up -d"
# 와일드카드 A레코드 덕에 DNS 작업 불필요. 첫 접속 시 Caddy가 인증서 자동 발급.
curl -I https://<id>.ax-stack.com
```

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
- **서브도메인 인증서 실패**: 와일드카드 A레코드 존재 확인 + Caddy 로그. HTTP-01은 해당 호스트가 서버로 도달해야 발급됨.
- **메모리 압박**: `free -h`, `docker stats --no-stream`. 무거운 컨테이너 `mem_limit` 확인, on-demand 전환 검토.
- **디스크 부족**: `docker image prune -f`, `docker builder prune -f`.
