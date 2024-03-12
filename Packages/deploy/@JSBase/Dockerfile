# STAGE 1 (base-image: node)
# ==================================================
# ----------
	# options (largest to smallest): 14 (~900mb), 14-slim (~150mb), 14-alpine (~100mb)
	#FROM node:14
	#FROM node:14-slim
	#FROM node:14-alpine
	#FROM node:16
	FROM node:16-alpine

	# image-internal args
	ARG ENVIRONMENT
# ----------

# initial arg processing
ENV ENVIRONMENT=$ENVIRONMENT
RUN echo "Env:$ENVIRONMENT"

WORKDIR "/dm_repo"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json .
COPY .yarn/ .yarn/
COPY .yarnrc.yml .
#COPY yarn.lock .
COPY Others/yarn-lock-for-docker.lock yarn.lock
COPY Packages/client/package.json Packages/client/package.json
COPY Packages/js-common/package.json Packages/js-common/package.json
COPY Packages/deploy/package.json Packages/deploy/package.json

#COPY .yalc/ .yalc/ # don't do it here; apply these as an update after the main install
#COPY yalc.lock .
COPY patches/ patches/
#COPY node_modules/web-vcore/patches/ node_modules/web-vcore/patches/
COPY Scripts/PostInstall.js Scripts/PostInstall.js

# also copy cache contents from node_modules/web-vcore/.yarn/cache (if wvc is symlinked, the dm's cache will lack many of the libs)
# this should work, except docker refuses to allow symlink-following (https://github.com/moby/moby/issues/1676)
#COPY node_modules/web-vcore/.yarn/cache .yarn/cache
#COPY C:/Root/Apps/@V/@Modules/web-vcore/Main/.yarn/cache .yarn/cache

# now that yarn has the info it needs, have it install all the node-modules
# (--inline-builds lets us see the output of the build-scripts [eg. the post-install for patch-package] to confirm that they're being applied properly)
#	RUN yarn install --inline-builds
#RUN yarn install --inline-builds --production=true
#	RUN yarn install --cache-folder ./cross-build-yarn-cache
#	RUN --mount=type=cache,target=.yarn/cache yarn install
#	ENV YARN_CACHE_FOLDER=../.yarn_cache # NOTE: If you want to use this again, you need to set "enableGlobalCache: false" in .yarnrc.yml
#	RUN --mount=type=cache,target=../.yarn_cache yarn install
#	RUN --mount=type=cache,mode=0777,target=../.yarn_cache yarn install
#	RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --prefer-offline --frozen-lockfile
#	RUN --mount=type=cache,target=/tmp/yarn_cache yarn install --frozen-lockfile

# add python for some npm packages that need it
# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
#RUN apk --no-cache --virtual build-dependencies add python3 make g++ libexecinfo-dev \
RUN apk --no-cache --virtual build-dependencies add python3 make g++ \
# equivalent of yarn-v1's "yarn install --production" (as per: https://yarnpkg.com/cli/workspaces/focus#details) -- which avoids installing dev-deps, cutting down on image size
	&& yarn workspaces focus --all --production \
# remove python (and such) again, since not needed anymore
	&& apk del build-dependencies \
# exclude just-created caches (the caches can't be used anyway)
#	&& rm -r /dm_repo/.yarn/cache && rm -r /root/.yarn/berry/cache \
# delete folders that had to be marked as deps (eg. under web-vcore), but which are actually only needed at development time
	&& rm -r /dm_repo/node_modules/typescript \
# we can't exclude @babel quite yet, unfortunately, because some packages runtime-require it (eg. "react-textarea-autosize" requires "@babel/runtime/helpers/extends")
#	&& rm -r /dm_repo/node_modules/@babel
# exclude every folder under "@babel" other than "runtime"
#	&& cd /dm_repo/node_modules/@babel && rm -r !(runtime)
	&& cd /dm_repo/node_modules/@babel && find . -mindepth 1 -maxdepth 1 -type d ! -name "runtime" -exec rm -r {} \;
# for additional options (such as enableInlineBuilds), modify the .yarnrc.yml file

# *now* copy the .yalc folder, and rerun the yarn install (to apply the yalc-overrides)
#COPY .yalc/ .yalc/
# use `.yal[c]` trick to avoid error, in case of .yalc folder not existing (yalc usage is optional)
COPY .yal[c]/ .yalc/
RUN yarn workspaces focus --all --production \
	&& rm -r /dm_repo/.yarn/cache && rm -r /root/.yarn/berry/cache \
	#&& rm -r /dm_repo/node_modules/typescript \
	&& cd /dm_repo/node_modules/@babel && find . -mindepth 1 -maxdepth 1 -type d ! -name "runtime" -exec rm -r {} \;

# strace: for debugging, eg. the "std::bad_alloc" error, as mentioned here: https://stackoverflow.com/a/59923848
#RUN apk --no-cache add procps strace

# this line-append increases the max # of mmap()'ed ranges, fixing the dreadful issue where trying to create a memory-snapshot using remote Chrome devtools would virtually always cause the pod to crash (or at least for the port-forward to dc)
# EDIT: this fails atm, saying "RUN sysctl -p → sysctl: error setting key 'vm.max_map_count': Read-only file system"; I'm thus setting it at container startup, in node-setup-daemon-set.yaml
#RUN echo "vm.max_map_count=65530999" >> /etc/sysctl.conf
#RUN sysctl -p

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

#RUN cp -rl --force /dm_repo/node_modules/web-vcore/node_modules/ /dm_repo/ \
#	&& rm -r /dm_repo/node_modules/web-vcore/node_modules/

# post-check
#RUN if [ ! -d "/dm_repo/node_modules/mobx-graphlink" ]; then echo										"The mobx-graphlink package was not found in the root node_modules folder. Fix this! (hoisting needed for NMOverwrites)"; exit 1; else echo "Passed."; fi
#RUN if [ -d "/dm_repo/node_modules/web-vcore/node_modules/mobx-graphlink" ]; then echo			"The mobx-graphlink package was found as web-vcore subdep, rather than hoisted. Fix this! (hoisting needed for NMOverwrites)"; exit 1; else echo "Passed."; fi