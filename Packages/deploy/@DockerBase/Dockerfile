# image name: local.tilt.dev/dm-repo-shared-base

# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_repo" line below)

#FROM node:14
FROM node:16

WORKDIR "/dm_repo"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY yarn.lock .
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/common/package.json Packages/common/package.json
COPY Packages/server/package.json Packages/server/package.json
COPY Packages/web-server/package.json Packages/web-server/package.json
COPY Packages/deploy/package.json Packages/deploy/package.json
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