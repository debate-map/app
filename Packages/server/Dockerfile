# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_server" line below)

FROM node:14

WORKDIR "/dm_server"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY yarn.lock .
#COPY node_modules node_modules
#COPY .yarn/test1 node_modules
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/common/package.json Packages/common/package.json
COPY Packages/server/package.json Packages/server/package.json
COPY .yarn .yarn
COPY .yarnrc.yml .

# also copy cache contents from node_modules/web-vcore/.yarn/cache (if wvc is symlinked, the dm's cache will lack many of the libs)
# this should work, except docker refuses to allow symlink-following (https://github.com/moby/moby/issues/1676)
#COPY node_modules/web-vcore/.yarn/cache .yarn/cache2
#COPY C:\\Root\\Apps\\@V\\@Modules\\web-vcore\\Main\\.yarn\\cache .yarn/cache
#COPY C:/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache
#COPY ../../@Modules/web-vcore/Main/.yarn/cache .yarn/cache
#COPY ../../@Modules/web-vcore/Main/.yarn/cache .yarn/cache
#RUN cp C:/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache
#RUN cp ../../../../../../../../../../../../../../../../../../../../../Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache
#RUN tar -czh node_modules/web-vcore/.yarn/cache | docker build -
#RUN tar -czh . | docker build -
#RUN cp /mnt/c/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache2
# try with folder copy
# this works, but requires manual copying
#COPY .yarn/cache2 .yarn/cache
#COPY yarn_cache_2 .yarn/cache2
#COPY node_modules/test2 .yarn/cache2

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
#COPY ./Dist ./Dist
#COPY . .

# don't worry, this only actually copies specific subpaths, specified in .dockerignore
#COPY node_modules node_modules
#COPY node_modules/**/* ./
COPY node_modules/web-vcore/nm/ ./node_modules/web-vcore/nm/
# COPY node_modules/web-vcore/Dist/ ./
# COPY node_modules/@pg-lq/postgraphile-plugin/Build/ ./
# # through web-vcore
# COPY node_modules/graphql-feedback/Dist*				node_modules/web-vcore/node_modules/graphql-feedback/Dist*				./
# COPY node_modules/js-vextensions/Dist*					node_modules/web-vcore/node_modules/js-vextensions/Dist*					./
# COPY node_modules/js-vextensions/Helpers*				node_modules/web-vcore/node_modules/js-vextensions/Helpers*				./
# COPY node_modules/react-vextensions/Dist*				node_modules/web-vcore/node_modules/react-vextensions/Dist*				./
# COPY node_modules/react-vcomponents/Dist*				node_modules/web-vcore/node_modules/react-vcomponents/Dist*				./
# COPY node_modules/react-vmenu/Dist*						node_modules/web-vcore/node_modules/react-vmenu/Dist*						./
# COPY node_modules/react-vmessagebox/Dist*				node_modules/web-vcore/node_modules/react-vmessagebox/Dist*				./
# #COPY node_modules/mobx-graphlink/Dist*				node_modules/web-vcore/node_modules/mobx-graphlink/Dist*				./
# COPY node_modules/eslint-config-vbase/index.js*		node_modules/web-vcore/node_modules/eslint-config-vbase/index.js*		./

COPY . .

EXPOSE 8080

#CMD [ "/bin/sh", "-c", "cd Packages/server && ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js" ]
#WORKDIR "Packages/server"
#CMD [ "cross-env", "TS_NODE_SKIP_IGNORE=true", "TS_NODE_PROJECT=Scripts/tsconfig.json", "TS_NODE_TRANSPILE_ONLY=true", "DEV=true", "node", "--loader ts-node/esm.mjs", "--experimental-specifier-resolution=node", "./Dist/Main.js" ]
WORKDIR "/dm_server/Packages/server"

#CMD ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; ../../node_modules/.bin/nodemon --legacy-watch --watch Dist --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; ../../node_modules/.bin/nodemon --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; ../../node_modules/.bin/nodemon --ignore 'nothing' --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; ../../node_modules/.bin/nodemon --legacy-watch --ignore 'nothing' --watch Dist --watch node_modules/web-vcore/nm --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js

# we can use "pm2" or "pm2-runtime" here; not sure which is better, but going with pm2 atm (for consistency between dev and prod, until I understand the pm2-runtime's prod advantages)
# pm2 options: https://github.com/Unitech/pm2/blob/master/lib/binaries/CLI.js, pm2-runtime options: https://github.com/Unitech/pm2/blob/master/lib/binaries/Runtime4Docker.js
#CMD PM2_DISCRETE_MODE=true TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
#CMD PM2_DISCRETE_MODE=true TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
#CMD export PM2_DISCRETE_MODE=true TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true && ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
#CMD PM2_DISCRETE_MODE=true DEV=true ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"

ENV DEV=true
ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon