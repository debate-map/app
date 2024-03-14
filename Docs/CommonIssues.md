# Common Issues

This document is where various issues are logged, which have a good chance of being encountered, or which are very hard to understand if they are encountered. The intention is that when devs encounter a difficult problem, or one which they vaguely recall having dealt with before, they can quickly search here to find the "cached solution" (if one exists).

The document is split into a few categories, based on the "context" in which the error is expected to be seen. And each issue entry is split into a few sections as well.

Issue sections:
* Header: The explicit error message, if it exists (unless very unwieldy); else a summary of what the user sees having gone wrong.
* TLDR: The quick way to to solve the problem, if one exists.
* Trigger: What user/dev actions cause the issue to occur, if known.
* Reason: Explanation of what's happening behind the scenes, such that the user/dev action above causes the issue.
* Solution: If there isn't a "TLDR" way of solving the problem (or if it's not always the best way to do so), a longer explanation of how to solve it can be described here.

## Context: Error in the logs of a kubernetes pod/resource

> #### `Build Failed: Internal error occurred: failed calling webhook "validate.gateway.networking.k8s.io": failed to call webhook: Post "https://gateway-api-admission-server.default.svc:443/validate?timeout=10s": service "gateway-api-admission-server" not found`

**TLDR:** Open the k8s cluster in Lens, go to Config -> Validating Webhook Configs, delete the stuck entry (there should only be one), then trigger update of `app-routes` in the Tilt ui.

**Trigger:** When deploying to the k8s cluster, using Tilt. (only happens sometimes; unsure of the exact trigger)

Might be solved, watching. [edit: one of the causes was solved, but the error still happens sometimes, with a slightly different error message -- about unknown signing source rather than service not being found]

> #### `It appears that more than one copy of the web-vcore package has been loaded, which is almost certainly not desired.` and/or `Uncaught TypeError: Cannot redefine property: AV`

**TLDR:** Note the version for `web-vcore` listed in package.json, run `npm add web-vcore`, change package.json to again use the version noted earlier, redeploy the web-server pod (if using k8s for the JS file-serving), then refresh the page.

**Trigger:** Not completely clear, but in the general space of doing yarn installs and/or zalc publishes of web-vcore.

**Reason:** Two instances of web-vcore got installed by yarn: one with its file at "./node_modules/web-vcore", the other with its files at ".yalc/web-vcore". This duplication was probably caused by a usage of zalc that ended up botching the yarn.lock file (exact reasons this can happen are not yet clear).

As for why the TLDR solution can fix it: Despite the package.json ending up the same, the process forces yarn to create a single entry for web-vcore in the lock file, removing the duplication; and this fix persists through future yarn-installs, since the regular resolution rules are then able to merge the two web-vcore instances (from the workspaces entry for .yalc/web-vcore, and the regular npm dependency), resulting in yarn creating a symlink from "node_modules/web-vcore" to ".yalc/web-vcore", which is what we want.