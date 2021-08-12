# Debate Map (Web Server)

Codebase for the [Debate Map](https://debatemap.app) website's web-server. (ie. provider of the static html, css, js, etc. files)

## Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

## Local

<!----><a name="local-docker"></a>
### [web-server/local-docker] Local server, using docker

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Note: The docker images produced directly will have the name `dm-web-server-direct`.

1) For direct docker builds, run `npm start server.dockerBuild`.

## Deployment

Handling of deployment to kubernetes (whether locally or remote) is explained in the [deploy package's readme](https://github.com/Venryx/web-vcore/tree/master/Packages/deploy#guide-modules).