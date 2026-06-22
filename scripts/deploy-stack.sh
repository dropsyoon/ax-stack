#!/usr/bin/env bash
# server/ (compose.yaml, caddy/Caddyfile, sites/<id>) → 서버 동기화 + compose up + caddy reload.
# rsync --inplace: Caddyfile 은 단일 파일 바인드마운트라 inode 유지 필수
# (새 inode로 교체하면 컨테이너가 옛 내용을 계속 봐 reload가 'unchanged' 판정).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY="$ROOT/ssh/drops.pem"
H="ubuntu@43.133.243.241"
SSHOPT=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

rsync -az --inplace -e "ssh ${SSHOPT[*]}" "$ROOT/server/" "$H:/home/ubuntu/ax-stack/"
ssh "${SSHOPT[@]}" "$H" 'cd ~/ax-stack && docker compose up -d --build && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile && docker compose ps --format "{{.Name}}\t{{.Status}}"'
