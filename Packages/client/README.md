# Debate Map (Client)

Codebase for the Debate Map website's frontend ([debatemap.app](https://debatemap.app)).

# Guide modules

> Continued from: https://github.com/debate-map/app#guide-modules

<!----><a name="dev"></a>
### [client/dev] Get dev-server running for Packages/client

Prerequisite steps: [vscode](https://github.com/debate-map/app#vscode)

* 1\) In vscode #1, start frontend ts-compiler: ctrl+shift+b, then `#1 tsc`.
* 2\) In vscode #1, start frontend webpack/dev-server: ctrl+shift+b, then `#2 webpack`.
* 3\) Open website locally at: `localhost:3005`

<!----><a name="dev-enhance"></a>
### [client/dev-enhance] Enhance the local web-server dev experience

Prerequisite steps: [client/dev](https://github.com/debate-map/app/tree/master/Packages/client#dev)

* 1\) [opt] Install: [React Development Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
* 2\) [opt] Install: [MobX Development Tools](https://chrome.google.com/webstore/detail/mobx-developer-tools/pfgnfdagidkfgccljigdamigbcnndkod) (or [my fork](https://github.com/Venryx/mobx-devtools-advanced))

<!----><a name="dev-enhance"></a>
### [client/build] Build the webpack bundle file

Prerequisite steps: [client/dev](https://github.com/debate-map/app/tree/master/Packages/client#dev)

* 1\) Make sure the `Source_JS` folder is up-to-date. (easiest way is by running tsc, as seen in step 1 of [client/dev](https://github.com/debate-map/app/tree/master/Packages/client#dev))
* 2\) Run one of the scripts for creating webpack-builds:
	* 2.1\) For development builds (not used atm; for development, use [client/dev](https://github.com/debate-map/app/tree/master/Packages/client#dev) guide): `npm start client.build.dev`
	* 2.2\) For production builds, without minification (most common, since minification is so slow): `npm start client.build.prodQuick`
	* 2.3\) For production builds, with minification: `npm start client.build.prod`