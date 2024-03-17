FROM joseluisq/static-web-server:2-alpine
# or
# FROM ghcr.io/static-web-server/static-web-server:2-alpine

# copy frontend files (to be served)
COPY Packages/client/Dist /public

CMD static-web-server --root=/public --health --compression-static=true
