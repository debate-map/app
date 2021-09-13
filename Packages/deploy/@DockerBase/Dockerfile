FROM node:14
#FROM node:16

WORKDIR "/dm_repo"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY .yarn/ .yarn/
COPY .yarnrc.yml .
COPY yarn.lock .
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/common/package.json Packages/common/package.json
COPY Packages/app-server/package.json Packages/app-server/package.json
COPY Packages/web-server/package.json Packages/web-server/package.json
COPY Packages/deploy/package.json Packages/deploy/package.json

COPY patches/ patches/
#COPY node_modules/web-vcore/patches/ node_modules/web-vcore/patches/

# also copy cache contents from node_modules/web-vcore/.yarn/cache (if wvc is symlinked, the dm's cache will lack many of the libs)
# this should work, except docker refuses to allow symlink-following (https://github.com/moby/moby/issues/1676)
#COPY node_modules/web-vcore/.yarn/cache .yarn/cache
#COPY C:/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache

# now that yarn has the info it needs, have it install all the node-modules
# (--inline-builds lets us see the output of the build-scripts [eg. the post-install for patch-package] to confirm that they're being applied properly)
RUN yarn install --inline-builds
#RUN yarn install --cache-folder ./cross-build-yarn-cache
#RUN --mount=type=cache,target=.yarn/cache yarn install
#ENV YARN_CACHE_FOLDER=../.yarn_cache
#RUN --mount=type=cache,target=../.yarn_cache yarn install
#RUN --mount=type=cache,mode=0777,target=../.yarn_cache yarn install
#RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --prefer-offline --frozen-lockfile
#RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --frozen-lockfile

# moved this to package-specific dockerfiles, as "update base docker image" has (a lot) more overhead than "copy NMOverwrites/ folder" in each package, and NMOverwrites/ can change frequently 
#COPY NMOverwrites/ /dm_repo/

# fsr, "yarn install" is installing some of web-vcore's deps (eg. mobx-graphlink) under "web-vcore/node_modules", rather than hoisting (perhaps yarn is trying to avoid conflict with the "link:XXX" entry in yarn.lock);
#		we need those deps hoisted (so that NMOverwrites can be applied), so manually re-hoist them
# ==========

# pre-check (fails currently, which is okay -- that's why we do the below)
#RUN if [ ! -d "/dm_repo/node_modules/mobx-graphlink" ]; then echo										"The mobx-graphlink package was not found in the root node_modules folder. Fix this! (hoisting needed for NMOverwrites)"; else echo "-1GoodA"; fi
#RUN if [ -d "/dm_repo/node_modules/web-vcore/node_modules/mobx-graphlink" ]; then echo			"The mobx-graphlink package was found as web-vcore subdep, rather than hoisted. Fix this! (hoisting needed for NMOverwrites)"; else echo "-1GoodB"; fi

#RUN mv /dm_repo/node_modules/web-vcore/node_modules/mobx-graphlink /dm_repo/node_modules/mobx-graphlink
#RUN mv /dm_repo/node_modules/web-vcore/node_modules/graphql-feedback /dm_repo/node_modules/graphql-feedback
# RUN mv /dm_repo/node_modules/web-vcore/node_modules/ /dm_repo/node_modules/
RUN cp -rl --force /dm_repo/node_modules/web-vcore/node_modules/ /dm_repo/ \
	&& rm -r /dm_repo/node_modules/web-vcore/node_modules/

# post-check
RUN if [ ! -d "/dm_repo/node_modules/mobx-graphlink" ]; then echo										"The mobx-graphlink package was not found in the root node_modules folder. Fix this! (hoisting needed for NMOverwrites)"; exit 1; else echo "Passed."; fi
RUN if [ -d "/dm_repo/node_modules/web-vcore/node_modules/mobx-graphlink" ]; then echo			"The mobx-graphlink package was found as web-vcore subdep, rather than hoisted. Fix this! (hoisting needed for NMOverwrites)"; exit 1; else echo "Passed."; fi