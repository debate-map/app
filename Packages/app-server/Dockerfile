# see: ./Tiltfile (or source: Packages/deploy/@DockerBase/Dockerfile)
#ARG SHARED_BASE_URL
ARG SHARED_BASE_URL=gcr.io/debate-map-prod/dm-shared-base
FROM $SHARED_BASE_URL

#COPY NMOverwrites/ /dm_repo/

# note: the exclusion of large, unrelated folders (like node_modules) under the given paths is handled by the .dockerignore files

# split up the copying into multiple layers, for better caching
COPY Temp_Synced/ Temp_Synced/
COPY Packages/common/ Packages/common/
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

ARG env_ENV
ENV ENV=$env_ENV
ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"

# mode: normal
# use "--no-daemon" so that the pm2 start command lasts as long as the program itself lasts [I think this is why anyway]
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon

# mode: profiling
#CMD node --experimental-specifier-resolution=node --heapsnapshot-near-heap-limit=3 --inspect=3155 --max-old-space-size=1024 ./Dist/Main.js
#CMD node --experimental-specifier-resolution=node --heapsnapshot-near-heap-limit=3 --inspect=3155 --max-old-space-size=8192 ./Dist/Main.js