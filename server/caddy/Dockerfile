# Caddy + Sablier 플러그인(on-demand 기상) 커스텀 빌드
# 표준 caddy 이미지엔 sablier 모듈이 없어 xcaddy로 컴파일한다.
FROM caddy:2.11.4-builder AS builder
RUN xcaddy build \
    --with github.com/sablierapp/sablier-caddy-plugin@v1.0.2

FROM caddy:2.11.4-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
