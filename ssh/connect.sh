#!/bin/bash
# ax-stack 서버 접속 (43.133.243.241 / ubuntu)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ssh -i "$DIR/drops.pem" ubuntu@43.133.243.241 "$@"
