# ax-stack

회사(ax-stack) 홍보 + 포트폴리오 허브. `https://ax-stack.com` 메인 + `*.ax-stack.com` 서브도메인으로 포트폴리오를 누적한다.

- **메인 사이트**: Vite + React 19 + Tailwind 4 + GSAP 정적 SPA (`site/`)
- **인프라**: 텐센트 클라우드 Ubuntu + Docker + Caddy(자동 HTTPS) (`server/`)
- **배포**: GitHub Actions → SSH (`.github/workflows/`)

## 빠른 시작
```bash
# 로컬 개발
cd site && npm install && npm run dev      # http://localhost:3000

# 빌드
cd site && npm run build                    # → site/dist/

# 서버 접속
ssh -i ssh/drops.pem ubuntu@43.133.243.241
```

## 문서
- 작업 지침/세션 진입점: [`CLAUDE.md`](CLAUDE.md)
- 아키텍처·자원전략: [`docs/architecture.md`](docs/architecture.md)
- 운영·배포 런북: [`docs/operations.md`](docs/operations.md)
- 작업 이력: [`history/history.md`](history/history.md)
