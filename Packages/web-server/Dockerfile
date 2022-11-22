# STAGE 1 (base-image: none)
# ==================================================
# ----------
	ARG JS_BASE_URL
	#ARG JS_BASE_URL=gcr.io/debate-map-prod/dm-js-base
# ----------

# STAGE 2 (base-image: dm-js-base)
# ==================================================
# ----------
	# see: ./Tiltfile (or source: Packages/deploy/@JSBase/Dockerfile)
	FROM $JS_BASE_URL
	ARG env_ENV
# ----------

# initial arg processing
ENV ENV=$env_ENV
RUN echo "Env:$ENV"

#COPY NMOverwrites/ /dm_repo/

# note: the exclusion of large, unrelated folders (like node_modules) under the given paths is handled by the .dockerignore files

# split up the copying into multiple layers, for better caching
COPY Temp_Synce[d]/ Temp_Synced/
COPY Packages/js-common/ Packages/js-common/
COPY Packages/client/Dist/ Packages/client/Dist/
COPY Packages/client/Scripts/ Packages/client/Scripts/
COPY Packages/web-server/ Packages/web-server/
#COPY Scripts/COPY_opt.txt Scripts/COPY_opt.txt
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

ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon