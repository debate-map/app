FROM node:14

WORKDIR "/dm_repo"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY yarn.lock .
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/common/package.json Packages/common/package.json
#COPY Packages/server/package.json Packages/server/package.json
COPY Packages/web-server/package.json Packages/web-server/package.json
#COPY Packages/deploy/package.json Packages/deploy/package.json
COPY .yarn .yarn
COPY .yarnrc.yml .

# now that yarn has the info it needs, have it install all the node-modules
RUN yarn install

# bundle app source (the .dockerignore file excludes large, unrelated folders like node_modules)
COPY . .

# bundle Packages/client/Scripts as well (it's the same code we use for the web-server, for now at least)
COPY Packages/client/Scripts Packages/client/Scripts

EXPOSE 8080

WORKDIR "/dm_repo/Packages/web-server"

ENV DEV=true
ENV PM2_DISCRETE_MODE=true
#ENV TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon