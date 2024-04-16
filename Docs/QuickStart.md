# Quick start

This document is intended as a starting point for new developers, showing (hopefully comprehensively) how to set up one's local environment to a point where it can be used to make code changes to the frontend/backend, and build/test those changes, with minimal additional steps; for example, showing how to actually *deploy* code changes to the cloud is outside the scope of this document.

## General

* 1\) Follow steps in module [setup-general](https://github.com/debate-map/app#setup-general).
* 2\) If you plan to use VSCode as your editor (recommended), it's recommended to set up your frontend/backend windows according to module [vscode](https://github.com/debate-map/app#vscode).
	* 2.1\) If you plan to use a different editor, or a different vscode window setup, that is okay. Although keep in mind that there may be some steps which simply say to "run vscode task X"; so in those cases you may need to reference the `.vscode/tasks.json` and/or `Packages/.vscode/tasks.json` files to find the raw command required.

## Frontend

Building/Running:
* 1\) Follow steps in module [run-frontend-local](https://github.com/debate-map/app#run-frontend-local).
	* 1.1\) For step 2 in the module, go with the first option (ie. step 2.1); it's faster and easier.
	* 1.2\) For step 3 in the module, choose whether you want your locally-served frontend to connect to a local backend, or the public production backend (since a middle-ground "staging" server has not been set up yet).
		* 1.3.1\) If you're only interested in doing frontend code-changes for now, and the issues you're working on are "limited to the frontend" (ie. unlikely to trigger flawed commands sent to the server or the like), you can simply have your webpack-served frontend connect directly to the production backend; this lets you avoid setup of a local backend (eg. installing docker and a local kubernetes cluster). In this case, when you get to step 3 in the [run-frontend-local](https://github.com/debate-map/app#run-frontend-local) module, use `localhost:5101/?db=prod` as the url opened in your browser.
		* 1.3.2\) If instead you plan to be making backend changes alongside frontend changes (or if you just want to be able to fiddle with things maximally without worry of sending flawed commands to the production backend), then in step 3 of the module above, use just `localhost:5101` (or `localhost:5101/?db=null` to reset) as the url opened in your browser. This will cause the frontend to try to connect to a local backend served (mainly) from `localhost:5100/app-server`.
			* 1.3.1.1\) For this to work, you'll of course need to follow the steps in the "Backend" section below, to get a local instance set up in Docker/Kubernetes.

## Backend

Setup:
* 1\) Follow steps in module [setup-backend](https://github.com/debate-map/app#setup-backend).
* 2\) Follow steps in module [setup-k8s](https://github.com/debate-map/app#setup-k8s). (don't miss the "After steps" section!)
* 3\) Follow steps in module [setup-psql](https://github.com/debate-map/app#setup-psql). (this is needed for easier completion of the [reset-db-local](https://github.com/debate-map/app#reset-db-local) module, seen below)

Building/Running:
* 1\) Follow steps in module [run-backend-local](https://github.com/debate-map/app#run-backend-local).
* 2\) If this is the first time you've launched the backend in k8s, the database will be empty, so the website will have no content (and may have other issues). You'll want to populate the local backend's database to a base valid state, by following module [reset-db-local](https://github.com/debate-map/app#reset-db-local). If there are pods that had been erroring before this step, you may need to restart them. (using the tilt web-ui, or by restarting the tilt-up command)