#!/usr/bin/env bash
# ============================================================
# add-subdomain.sh — ax-stack 서브도메인 포트폴리오 추가
# ------------------------------------------------------------
# <id>.ax-stack.com 으로 노출되는 프로젝트를 한 번에 등록한다.
#   1) server/caddy/Caddyfile 에 라우팅 블록 추가
#   2) (static) server/compose.yaml 에 nginx 서비스 + sites/<id> 생성
#   3) site/public/registry.json 에 메인 사이트 카드 항목 추가
#
# 사용법:
#   scripts/add-subdomain.sh <id> --name "표시명" [옵션]
# 옵션:
#   --type static|proxy   기본 static. static=정적 nginx 컨테이너 자동 생성,
#                         proxy=외부 컨테이너(<id>-web)로 reverse_proxy만 등록.
#   --target <host:port>  proxy 대상(기본 <id>-web:80).
#   --mem <크기>          static 컨테이너 mem_limit(기본 128m).
#   --no-card             registry.json(메인 카드)에 추가하지 않음.
#
# 와일드카드 A레코드(*.ax-stack.com)가 이미 서버를 가리키므로 DNS 작업은 불필요.
# 실행 후 배포: scripts/deploy-stack.sh (또는 server/** 를 git push → Actions).
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CADDY="$ROOT/server/caddy/Caddyfile"
COMPOSE="$ROOT/server/compose.yaml"
REGISTRY="$ROOT/site/public/registry.json"
SITES="$ROOT/server/sites"

ID="${1:-}"; shift || true
NAME=""; TYPE="static"; TARGET=""; MEM="128m"; CARD=1
RESERVED="caddy landing www hello"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)   NAME="$2"; shift 2 ;;
    --type)   TYPE="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --mem)    MEM="$2"; shift 2 ;;
    --no-card) CARD=0; shift ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done

# ── 검증 ──────────────────────────────────────────────
[[ -n "$ID" ]] || { echo "사용법: add-subdomain.sh <id> --name \"표시명\" [옵션]" >&2; exit 1; }
[[ "$ID" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]] || { echo "잘못된 id(소문자/숫자/하이픈, 2~31자): $ID" >&2; exit 1; }
for r in $RESERVED; do [[ "$ID" == "$r" ]] && { echo "예약어 id 사용 불가: $ID" >&2; exit 1; }; done
[[ "$TYPE" == "static" || "$TYPE" == "proxy" ]] || { echo "--type 은 static|proxy" >&2; exit 1; }
grep -q "^${ID}\.ax-stack\.com" "$CADDY" 2>/dev/null && { echo "이미 Caddyfile에 존재: $ID" >&2; exit 1; }
[[ -n "$NAME" ]] || NAME="$ID"
[[ -n "$TARGET" ]] || TARGET="${ID}-web:80"

echo "▶ 서브도메인 추가: ${ID}.ax-stack.com  (type=$TYPE, name=$NAME)"

# ── 1) Caddyfile 라우팅 블록 추가 ─────────────────────
cat >> "$CADDY" <<EOF

${ID}.ax-stack.com {
	reverse_proxy ${TARGET}
}
EOF
echo "  ✓ Caddyfile 블록 추가 (reverse_proxy ${TARGET})"

# ── 2) static: compose 서비스 + sites/<id> 생성 ───────
if [[ "$TYPE" == "static" ]]; then
  # networks: 라인 앞에 서비스 블록 삽입
  tmp="$(mktemp)"
  awk -v id="$ID" -v mem="$MEM" '
    /^networks:/ && !done {
      print "  " id ":";
      print "    image: nginx:alpine";
      print "    container_name: " id "-web";
      print "    restart: unless-stopped";
      print "    volumes:";
      print "      - ./sites/" id ":/usr/share/nginx/html:ro";
      print "    networks:";
      print "      - web";
      print "    mem_limit: " mem;
      print "";
      done=1;
    }
    { print }
  ' "$COMPOSE" > "$tmp" && mv "$tmp" "$COMPOSE"
  echo "  ✓ compose.yaml 서비스 추가 (${ID}-web, mem_limit ${MEM})"

  mkdir -p "$SITES/$ID"
  if [[ ! -f "$SITES/$ID/index.html" ]]; then
    cat > "$SITES/$ID/index.html" <<EOF
<!doctype html>
<html lang="ko"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${NAME} · ax-stack</title>
<style>body{font-family:-apple-system,"Noto Sans KR",sans-serif;background:#0b0f1a;color:#e8edf7;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}</style>
</head><body><div><h1>${NAME}</h1><p style="opacity:.6">${ID}.ax-stack.com — 준비 중</p></div></body></html>
EOF
    echo "  ✓ sites/${ID}/index.html 플레이스홀더 생성"
  fi
else
  echo "  · proxy 모드: 외부 컨테이너를 'ax-stack-web' 네트워크에 연결하고 container_name 을 '${ID}-web'(또는 --target 지정)로 두세요."
fi

# ── 3) registry.json(메인 카드) 항목 추가 ─────────────
if [[ "$CARD" == "1" ]]; then
  if command -v jq >/dev/null 2>&1; then
    tmp="$(mktemp)"
    jq --arg id "$ID" --arg name "$NAME" --arg url "https://${ID}.ax-stack.com" \
       '. + [{id:$id, name:$name, url:$url}]' "$REGISTRY" > "$tmp" && mv "$tmp" "$REGISTRY"
    echo "  ✓ registry.json 카드 추가 (https://${ID}.ax-stack.com)"
  else
    echo "  ! jq 미설치 — registry.json 수동 추가 필요: {\"id\":\"$ID\",\"name\":\"$NAME\",\"url\":\"https://${ID}.ax-stack.com\"}"
  fi
fi

echo
echo "완료. 다음 배포:"
echo "  scripts/deploy-stack.sh         # 서버 동기화 + compose up + caddy reload"
echo "  (site 카드 반영은 site/** push → Actions 또는 scripts/deploy-site.sh)"
