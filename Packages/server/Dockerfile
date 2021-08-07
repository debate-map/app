# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_server" line below)

FROM node:14

WORKDIR "/dm_server"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY yarn.lock .
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

# test
#RUN yarn rebuild

# bundle app source
#COPY ./Dist ./Dist
COPY . .

EXPOSE 8080

#CMD [ "/bin/sh", "-c", "cd Packages/server && ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js" ]
#WORKDIR "Packages/server"
#CMD [ "cross-env", "TS_NODE_SKIP_IGNORE=true", "TS_NODE_PROJECT=Scripts/tsconfig.json", "TS_NODE_TRANSPILE_ONLY=true", "DEV=true", "node", "--loader ts-node/esm.mjs", "--experimental-specifier-resolution=node", "./Dist/Main.js" ]
WORKDIR "/dm_server/Packages/server"

#CMD ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js