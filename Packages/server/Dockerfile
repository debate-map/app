# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_server" line below)

FROM node:14

WORKDIR "/dm_server"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
COPY package.json ./
# temp removed
#COPY yarn.lock ./
# the rest
COPY Packages/client/package.json ./Packages/client/package.json
COPY Packages/common/package.json ./Packages/common/package.json
COPY Packages/server/package.json ./Packages/server/package.json
COPY .yarn ./.yarn
COPY .yarnrc.yml .

# now that yarn has the info it needs, have it install all the node-modules
RUN yarn install
# from: https://stackoverflow.com/a/52805882/2441655
#RUN yarn install --production --pure-lockfile --non-interactive --cache-folder ./ycache; rm -rf ./ycache
#RUN yarn install --production --non-interactive --cache-folder ./ycache; rm -rf ./ycache
#RUN yarn install --check-files --force
#RUN yarn install --check-files --force --production=false
#RUN yarn install --check-files --production=false

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