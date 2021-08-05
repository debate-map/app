# note: source paths are relative to repo-root; target paths are relative to vm drive-root (well, until the WORKDIR "/dm_server" line below)

FROM node:14
# trying node X, just to see if it solves the issue of the python version being too low (<3.6) for the "sharp" lib
#FROM node:16

# update python-3 to newer version [at least 3.6] (needed for "sharp" dependency to be able to be built)
#FROM python:3.7-stretch
#RUN apt-get update \
#	&& apt-get install -y \
#		#curl unzip \
#		python3 python3-setuptools
#	&& ln -s /usr/bin/python3 /usr/bin/python \
#	&& easy_install3 pip py4j \
#	&& apt-get clean \
#	&& rm -rf /var/lib/apt/lists/*
# http://blog.stuart.axelbrooke.com/python-3-on-spark-return-of-the-pythonhashseed
#ENV PYTHONHASHSEED 0
#ENV PYTHONIOENCODING UTF-8
#ENV PIP_DISABLE_PIP_VERSION_CHECK 1

# try 1
#RUN apt update
#RUN apt install -y software-properties-common
#RUN add-apt-repository ppa:deadsnakes/ppa
#RUN apt install -y python3.9
# try 2
#RUN apt update
#RUN apt-get install python3=3.6.*
# try 3
# RUN apt-get install libssl-dev openssl
# RUN wget https://www.python.org/ftp/python/3.6.0/Python-3.6.0.tgz
# RUN tar xzvf Python-3.6.0.tgz
# RUN cd Python-3.6.0
# RUN ./configure
# RUN make
# RUN make install

# check
#RUN python3 --version

WORKDIR "/dm_server"

# bundle just the files here that yarn needs to do its job (else files change will force yarn to re-run)
# temp removed (wildcard is to match package.json AND package-lock.json)
#COPY package*.json ./
#COPY yarn.lock ./
# temp added
COPY package_forDocker_temp.json ./package.json
# the rest
COPY Packages/client/package.json ./Packages/client/package.json
COPY Packages/common/package.json ./Packages/common/package.json
COPY Packages/server/package.json ./Packages/server/package.json
COPY .yarn ./.yarn
COPY .yarnrc.yml .

# now that yarn has the info it needs, have it install all the node-modules
#RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
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

# test
#RUN pwd
RUN echo "Current dir: $PWD"
#RUN ls
#RUN yarn check --integrity
#RUN yarn check --verify-tree

#CMD ../../node_modules/.bin/cross-env TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js
CMD TS_NODE_SKIP_IGNORE=true TS_NODE_PROJECT=Scripts/tsconfig.json TS_NODE_TRANSPILE_ONLY=true DEV=true; node --loader ts-node/esm.mjs --experimental-specifier-resolution=node ./Dist/Main.js