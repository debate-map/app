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
COPY Temp_Synced/ Temp_Synced/
COPY Packages/js-common/ Packages/js-common/
COPY Packages/app-server/ Packages/app-server/
#COPY Scripts/COPY_opt.txt Scripts/COPY_opt.txt
COPY tsconfig.base.json .
COPY .env .

# these shouldn't be needed, but are fsr
#COPY ./node_modules/web-vcore/nm/ ./node_modules/web-vcore/nm/
#COPY ./node_modules/web-vcore/node_modules/mobx-graphlink/Dist/ ./node_modules/web-vcore/node_modules/mobx-graphlink/Dist/
#COPY ./node_modules/mobx-graphlink/Dist/ ./node_modules/mobx-graphlink/Dist/
#COPY ./node_modules/web-vcore/node_modules/mobx-graphlink/Dist/ ./node_modules/mobx-graphlink/Dist/

EXPOSE 8080

#CMD [ "/bin/sh", "-c", "cd Packages/app-server && ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js" ]
#WORKDIR "Packages/app-server"
#CMD [ "cross-env", "TS_NODE_SKIP_IGNORE=true", "TS_NODE_PROJECT=Scripts/tsconfig.json", "TS_NODE_TRANSPILE_ONLY=true", "DEV=true", "node", "--loader ts-node/esm.mjs", "--experimental-specifier-resolution=node", "./Dist/Main.js" ]
WORKDIR "/dm_repo/Packages/app-server"

#ENV TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true
#CMD node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --legacy-watch --watch Dist --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --ignore 'nothing' --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
#CMD ../../node_modules/.bin/nodemon --legacy-watch --ignore 'nothing' --watch Dist --watch node_modules/web-vcore/nm --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js

# temp
#COPY Temp_Synced/postgraphile node_modules/postgraphile
#COPY Temp_Synced/postgraphile-core node_modules/postgraphile-core
#COPY Temp_Synced/graphile-build node_modules/graphile-build
#COPY Temp_Synced/graphile-build-pg node_modules/graphile-build-pg
#COPY Test1.json Test1.json

ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"

# mode: normal
# use "--no-daemon" so that the pm2 start command lasts as long as the program itself lasts [I think this is why anyway]
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon

# mode: profiling
#CMD node --experimental-specifier-resolution=node --max-old-space-size=1024 --heapsnapshot-near-heap-limit=3 --inspect=5115 ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --max-old-space-size=8192 --heapsnapshot-near-heap-limit=3 --inspect=5115 ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --inspect=5115 ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --abort-on-uncaught-exception --inspect=5115 ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --abort-on-uncaught-exception ./Dist/Main.js

# this reliably causes the app-server to crash within a few seconds! (based on: https://github.com/nodejs/node/issues/38985#issuecomment-858795516)
#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --abort-on-uncaught-exception --inspect=5115 --track-heap-objects ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --track-heap-objects ./Dist/Main.js
# note: after deepClone fix, a crash still occurs, but the source must be slightly different (since crash occurs ~20s later, rather than right away)

#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --abort-on-uncaught-exception --inspect=5115 --heap-prof --track-heap-objects ./Dist/Main.js

#CMD node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --abort-on-uncaught-exception --inspect=5115 --max-semi-space-size=5000 ./Dist/Main.js; sleep infinity
#CMD strace node --experimental-specifier-resolution=node --max-old-space-size=15000 --heapsnapshot-near-heap-limit=3 --inspect=5115 ./Dist/Main.js