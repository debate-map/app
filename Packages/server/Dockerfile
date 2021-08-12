# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_server" line below)

FROM node:14

WORKDIR "/dm_server"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY yarn.lock .
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/common/package.json Packages/common/package.json
COPY Packages/server/package.json Packages/server/package.json
#COPY Packages/web-server/package.json Packages/web-server/package.json
#COPY Packages/deploy/package.json Packages/deploy/package.json
COPY .yarn .yarn
COPY .yarnrc.yml .

# also copy cache contents from node_modules/web-vcore/.yarn/cache (if wvc is symlinked, the dm's cache will lack many of the libs)
# this should work, except docker refuses to allow symlink-following (https://github.com/moby/moby/issues/1676)
#COPY node_modules/web-vcore/.yarn/cache .yarn/cache
#COPY C:/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache

# now that yarn has the info it needs, have it install all the node-modules
RUN yarn install
#RUN yarn install --cache-folder ./cross-build-yarn-cache
#RUN --mount=type=cache,target=.yarn/cache yarn install
#ENV YARN_CACHE_FOLDER=../.yarn_cache
#RUN --mount=type=cache,target=../.yarn_cache yarn install
#RUN --mount=type=cache,mode=0777,target=../.yarn_cache yarn install
#RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --prefer-offline --frozen-lockfile
#RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --frozen-lockfile
# from: https://stackoverflow.com/a/52805882/2441655
#RUN yarn install --production --pure-lockfile --non-interactive --cache-folder ./ycache; rm -rf ./ycache
#RUN yarn install --production --non-interactive --cache-folder ./ycache; rm -rf ./ycache
#RUN yarn install --check-files --force
#RUN yarn install --check-files --force --production=false
#RUN yarn install --check-files --production=false

# bundle app source (the .dockerignore file excludes large, unrelated folders like node_modules)
COPY . .

# these shouldn't be needed, but are fsr
COPY node_modules/web-vcore/nm/ ./node_modules/web-vcore/nm/
COPY node_modules/web-vcore/node_modules/mobx-graphlink/Dist/ ./node_modules/web-vcore/node_modules/mobx-graphlink/Dist/

EXPOSE 8080

#CMD [ "/bin/sh", "-c", "cd Packages/server && ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js" ]
#WORKDIR "Packages/server"
#CMD [ "cross-env", "TS_NODE_SKIP_IGNORE=true", "TS_NODE_PROJECT=Scripts/tsconfig.json", "TS_NODE_TRANSPILE_ONLY=true", "DEV=true", "node", "--loader ts-node/esm.mjs", "--experimental-specifier-resolution=node", "./Dist/Main.js" ]
WORKDIR "/dm_server/Packages/server"

#ENV TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true
#CMD node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --legacy-watch --watch Dist --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --ignore 'nothing' --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --legacy-watch --ignore 'nothing' --watch Dist --watch node_modules/web-vcore/nm --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js

ENV DEV=true
ENV PM2_DISCRETE_MODE=true
#ENV TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon