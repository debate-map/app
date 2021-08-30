This file is for guide-modules that "shouldn't ever be needed, for those following the recommended path", but which are kept around in case they become needed.

<!----><a name="local-docker"></a>
### [web-server/local-docker] Local server, using docker

Prerequisite steps: [deploy/setup-base](https://github.com/debate-map/app/tree/master/Packages/deploy#setup-base)

Note: The docker images produced directly will have the name `dm-web-server-direct`.

* 1\) For direct docker builds, run `npm start web-server.dockerBuild`.