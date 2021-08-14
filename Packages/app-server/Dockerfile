# source: Packages/deploy/@DockerBase/Dockerfile
FROM local.tilt.dev/dm-repo-shared-base

COPY NMOverwrites/ /dm_repo/

# bundle app source (the .dockerignore file excludes large, unrelated folders like node_modules)
#COPY . .
COPY Packages/ Packages/
COPY Scripts/ Scripts/
# copy just the files in the root folder
#COPY ./* ./
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

ENV DEV=true
ENV PM2_DISCRETE_MODE=true
ENV TS_NODE_SKIP_IGNORE=true TS_NODE_TRANSPILE_ONLY=true
#ENV TS_NODE_PROJECT=../../tsconfig.base.json
#ENV TS_NODE_PROJECT=Scripts/tsconfig.json
#CMD ../../node_modules/.bin/pm2 start ./Dist/Main.js --watch --ignore-watch="nothing" --no-daemon --node-args="--loader ts-node/esm.mjs --experimental-specifier-resolution=node"
CMD ../../node_modules/.bin/pm2 start ecosystem.config.cjs --no-daemon