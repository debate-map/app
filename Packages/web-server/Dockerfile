# see: ./Tiltfile (or source: Packages/deploy/@DockerBase/Dockerfile)
#ARG SHARED_BASE_URL
ARG SHARED_BASE_URL=gcr.io/debate-map-prod/dm-shared-base
FROM $SHARED_BASE_URL

COPY NMOverwrites/ /dm_repo/

# note: the exclusion of large, unrelated folders (like node_modules) under the given paths is handled by the .dockerignore files

# split up the copying into multiple layers, for better caching
COPY Packages/common/ Packages/common/
COPY Packages/client/ Packages/client/
COPY Packages/web-server/ Packages/web-server/
COPY Scripts/ Scripts/
COPY tsconfig.base.json .

# these shouldn't be needed, but are fsr
#COPY ./node_modules/web-vcore/nm/ ./node_modules/web-vcore/nm/
#COPY ./node_modules/web-vcore/Scripts/ ./node_modules/web-vcore/Scripts/
#COPY ./node_modules/mobx-graphlink/Dist/ ./node_modules/mobx-graphlink/Dist/
#COPY ./node_modules/web-vcore/node_modules/mobx-graphlink/Dist/ ./node_modules/mobx-graphlink/Dist/

# bundle Packages/client/Scripts as well (it's the same code we use for the web-server, for now at least)
#COPY Packages/client/Scripts Packages/client/Scripts

EXPOSE 8080

WORKDIR "/dm_repo/Packages/web-server"

ARG env_ENV
ENV ENV=$env_ENV
ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon