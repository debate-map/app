# Debate Map (Web Server)

Codebase for the [Debate Map](https://debatemap.app) website's web-server. (ie. provider of the static html, css, js, etc. files)

## Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## Local

<!----><a name="local-docker"></a>
### [web-server/local-docker] Local server, using docker

Note: The docker images produced directly will have the name `dm-web-server-direct`.

1) Install Docker Desktop: https://docs.docker.com/desktop
2) Install the Docker "dive" tool (helps for inspecting image contents without starting container): https://github.com/wagoodman/dive
2.1) In addition, make a shortcut to `\\wsl$\docker-desktop-data\version-pack-data\community\docker\overlay2`; this is the path you can open in Windows Explorer to view the raw files in the docker-built "layers". (ie. your project's output-files, as seen in the docker builds)
3) For direct docker builds, run `npm start server.dockerBuild`.

<!----><a name="local-k8s"></a>
### [web-server/local-k8s] Local server, using docker + kubernetes + skaffold (helper)

Note: The docker images produced by skaffold will have the name `dm-web-server`.

1) Create your Kubernetes cluster in Docker Desktop, by checking "Enable Kubernetes" in the settings, and pressing apply/restart.
2) Install Skaffold: https://skaffold.dev/docs/install
3) For docker->kubernetes build+rebuilds, run `npm start web-server.skaffoldDev`. (whenever you want a rebuild, just press enter in the terminal)
4) For docker->kubernetes builds, run `npm start web-server.skaffoldBuild`. (image-name: `dm-web-server`)
5) For docker->kubernetes build+run, run `npm start web-server.skaffoldRun`. (image-name: `dm-web-server`)
6) When the list of images/containers in Docker Desktop gets too long, see the [server/docker-trim](https://github.com/debate-map/app/tree/master/Packages/server#docker-trim) module.

## Remote

Handling of remote instances of the web-server is explained in the [deploy package's readme](https://github.com/Venryx/web-vcore/tree/master/Packages/deploy#guide-modules).