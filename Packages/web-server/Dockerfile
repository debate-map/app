# source: Packages/deploy/@DockerBase/Dockerfile
FROM local.tilt.dev/dm-repo-shared-base

# bundle app source (the .dockerignore file excludes large, unrelated folders like node_modules)
#COPY . .
COPY Packages/ Packages/
COPY Scripts/ Scripts/
# copy just the files in the root folder
#COPY ./* ./
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

ENV DEV=true
ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon