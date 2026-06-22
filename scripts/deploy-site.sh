#!/usr/bin/env bash
# 메인 사이트 빌드 → 서버 landing 배포. (CI/CD가 자동 처리하나 수동 배포용)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY="$ROOT/ssh/drops.pem"
H="ubuntu@43.133.243.241"
SSHOPT=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

cd "$ROOT/site"
npm ci
npm run build
rsync -az --delete -e "ssh ${SSHOPT[*]}" dist/ "$H:/home/ubuntu/ax-stack/sites/landing/"
echo "배포 완료:"; curl -sS -m 15 -I https://ax-stack.com | head -1
